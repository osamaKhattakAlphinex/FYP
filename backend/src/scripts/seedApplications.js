require('dotenv').config();

const {
    sequelize,
    Task,
    TaskSkill,
    Student,
    StudentSkill,
    StudentExperience,
    StudentEducation,
    Application,
    ApplicationStatusHistory
} = require('../models');
const aiService = require('../services/aiService');

const STATUS_WEIGHTS = [
    { status: 'submitted', weight: 35 },
    { status: 'under_review', weight: 25 },
    { status: 'shortlisted', weight: 15 },
    { status: 'interview_scheduled', weight: 10 },
    { status: 'accepted', weight: 5 },
    { status: 'rejected', weight: 8 },
    { status: 'withdrawn', weight: 2 }
];

const COVER_LETTER_TEMPLATES = [
    'I am very interested in this opportunity. My background in {topic} and recent project work directly align with what you are looking for. I would love to contribute and learn from your team during this internship.',
    'Hello! I have been working with {topic} for some time and built a few side projects that exercise exactly the skills your task requires. I can start within a week and commit to the full duration.',
    'Thank you for posting this task. I have hands-on experience with the listed tooling and I am drawn to the deliverables you described. I have attached a portfolio link demonstrating similar work in {topic}.',
    'I think we are a strong fit. My most recent project involved {topic} from architecture to deployment, and I am eager to apply those lessons in a structured, mentored environment like this internship.',
    'Hi team — your task description matches the kind of work I want to grow into. I have practical experience with {topic} and a track record of shipping small but polished features end-to-end.'
];

const pickWeighted = (entries) => {
    const total = entries.reduce((acc, e) => acc + e.weight, 0);
    let r = Math.random() * total;
    for (const e of entries) {
        if (r < e.weight) return e;
        r -= e.weight;
    }
    return entries[entries.length - 1];
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);
const recentDate = (maxDaysAgo = 30) => {
    const d = new Date();
    d.setDate(d.getDate() - randomInt(0, maxDaysAgo));
    d.setHours(randomInt(0, 23), randomInt(0, 59), 0, 0);
    return d;
};

const studentInclude = [
    { model: StudentSkill, as: 'skills' },
    { model: StudentExperience, as: 'experience' },
    { model: StudentEducation, as: 'education' }
];

const TERMINAL = ['accepted', 'rejected', 'withdrawn'];

const buildCoverLetter = (student, task) => {
    const tmpl = randomChoice(COVER_LETTER_TEMPLATES);
    const topic = (task.category || 'the work').toLowerCase();
    let text = tmpl.replace('{topic}', topic);
    if (text.length < 50) {
        text +=
            ' I am available immediately and excited to bring my background in ' +
            topic +
            ' to your team.';
    }
    return text.slice(0, 5000);
};

const buildApplicationRow = (student, task) => {
    const { status } = pickWeighted(STATUS_WEIGHTS);
    const submittedAt = recentDate(45);
    const decidedAt = TERMINAL.includes(status) ? recentDate(7) : null;

    return {
        taskId: task.id,
        studentId: student.id,
        coverLetter: buildCoverLetter(student, task),
        proposedRate:
            task.budgetType === 'unpaid' ? null : randomInt(20, 80),
        proposedCurrency: task.budgetCurrency || 'USD',
        expectedStartDate: task.startDate,
        availabilityHoursPerWeek: randomInt(15, 40),
        resumeUrl: student.resumeUrl || null,
        portfolioUrl: null,
        status,
        rejectionReason:
            status === 'rejected'
                ? randomChoice([
                      'Skill match below threshold',
                      'Position filled by stronger candidate',
                      'Limited availability'
                  ])
                : null,
        companyNotes: Math.random() < 0.2 ? 'Looks promising — follow up next week.' : null,
        viewedByCompanyAt: Math.random() < 0.6 ? recentDate(20) : null,
        submittedAt,
        decidedAt
    };
};

const scoreApplications = async (task, applications) => {
    const students = await Student.findAll({
        where: { id: applications.map((a) => a.studentId) },
        include: studentInclude
    });
    const taskFull = await Task.findByPk(task.id, {
        include: [{ model: TaskSkill, as: 'skillsRequired' }]
    });

    try {
        const ranking = await aiService.rankCandidates(
            aiService.mapTaskToDto(taskFull),
            students.map(aiService.mapStudentToDto)
        );
        const byStudentId = new Map(ranking.map((r) => [String(r.student_id), r.score]));
        let scored = 0;
        await Promise.all(
            applications.map(async (app) => {
                const score = byStudentId.get(String(app.studentId));
                if (typeof score === 'number') {
                    await Application.update(
                        { matchScore: score },
                        { where: { id: app.id } }
                    );
                    scored += 1;
                }
            })
        );
        return { scored, pending: applications.length - scored, aiDown: false };
    } catch (err) {
        if (err instanceof aiService.AIServiceUnavailableError) {
            console.warn(
                `   ⚠ AI service unreachable for task ${task.id} (${task.title}) — leaving matchScore=null (pending)`
            );
            return { scored: 0, pending: applications.length, aiDown: true };
        }
        throw err;
    }
};

async function seedApplications() {
    const STUDENT_LIMIT = parseInt(process.env.SEED_STUDENT_LIMIT || '50', 10);
    const MIN_PER_TASK = parseInt(process.env.SEED_MIN_PER_TASK || '5', 10);
    const MAX_PER_TASK = parseInt(process.env.SEED_MAX_PER_TASK || '15', 10);
    const CLEAR_FIRST = process.env.SEED_CLEAR !== 'false';

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to MySQL');

        // Only students with at least one skill row — otherwise scoring is meaningless.
        const studentsRaw = await Student.findAll({
            include: [{ model: StudentSkill, as: 'skills', required: true }],
            limit: STUDENT_LIMIT
        });
        if (studentsRaw.length === 0) {
            console.log('❌ No students with skill profiles found. Seed students first.');
            process.exit(1);
        }
        console.log(`📚 Pulled ${studentsRaw.length} candidate students`);

        const tasks = await Task.findAll({ where: { status: 'active' } });
        if (tasks.length === 0) {
            console.log('❌ No active tasks. Run: npm run seed:tasks');
            process.exit(1);
        }
        console.log(`📋 Found ${tasks.length} active tasks`);

        if (CLEAR_FIRST) {
            await Application.destroy({ where: {} });
            console.log('🧹 Cleared existing applications');
        }

        let createdTotal = 0;
        let scoredTotal = 0;
        let pendingTotal = 0;
        let aiOutages = 0;

        for (const task of tasks) {
            const target = randomInt(MIN_PER_TASK, MAX_PER_TASK);
            const pool = shuffled(studentsRaw).slice(0, target);
            if (pool.length === 0) continue;

            const rows = pool.map((s) => buildApplicationRow(s, task));
            let inserted = [];
            try {
                inserted = await Application.bulkCreate(rows, {
                    individualHooks: true,
                    ignoreDuplicates: true
                });
            } catch (err) {
                console.warn(
                    `   ⚠ Bulk insert failed for task ${task.id} (${task.title}): ${err.message}`
                );
                continue;
            }
            const realInserted = inserted.filter((a) => a && a.id);
            if (realInserted.length === 0) continue;

            // Status history entries — one initial 'submitted' row each.
            await ApplicationStatusHistory.bulkCreate(
                realInserted.map((a) => ({
                    applicationId: a.id,
                    fromStatus: null,
                    toStatus: 'submitted',
                    changedByUserId: null,
                    reason: null
                }))
            );

            await task.update({
                applicationCount: (task.applicationCount || 0) + realInserted.length
            });
            createdTotal += realInserted.length;

            const { scored, pending, aiDown } = await scoreApplications(task, realInserted);
            scoredTotal += scored;
            pendingTotal += pending;
            if (aiDown) aiOutages += 1;

            console.log(
                `   • Task ${task.id} "${task.title.slice(0, 40)}" → +${realInserted.length} apps (${scored} scored, ${pending} pending)`
            );
        }

        console.log('\n──────── Summary ────────');
        console.log(`Applications created : ${createdTotal}`);
        console.log(`Scored by AI         : ${scoredTotal}`);
        console.log(`Pending (matchScore=null) : ${pendingTotal}`);
        if (aiOutages > 0) {
            console.log(`AI outages observed  : ${aiOutages} task(s) — rerun later or POST /api/tasks/:id/recompute-matches`);
        }
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding applications:', err);
        process.exit(1);
    }
}

seedApplications();
