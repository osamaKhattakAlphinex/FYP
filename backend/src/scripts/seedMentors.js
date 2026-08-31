/**
 * seedMentors.js — seed Module 7 (Mentor Assignment) demo data.
 *
 *   - 6 mentors across the demo domains, with a mix of verification states
 *     (4 approved, 1 pending, 1 rejected) so the admin queue has something to show
 *   - promotes one application per flagship task to `accepted`, which is the
 *     precondition for assigning a mentor
 *   - mentor assignments covering every lifecycle state: active, pending,
 *     completed (with ratings), declined
 *   - a short guidance-note thread on the active and completed mentorships
 *
 * Run AFTER seedDemo.js, from the backend directory:
 *     npm run seed:mentors
 *
 * Additive — does not wipe anything. Re-running clears only mentor tables.
 */
require('dotenv').config();

const {
    sequelize,
    User,
    Student,
    Task,
    Application,
    ApplicationStatusHistory,
    Mentor,
    MentorExpertise,
    MentorAssignment,
    MentorAssignmentHistory,
    MentorNote,
    recalcMentorCompletion,
    recalcMentorActiveCount,
    recalcMentorRating
} = require('../models');

const PASSWORD = 'Demo@1234';

const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

// ---------------------------------------------------------------------------
// Mentor definitions
// ---------------------------------------------------------------------------

const MENTORS = [
    {
        email: 'sara.mentor@example.com',
        firstName: 'Sara',
        lastName: 'Khan',
        headline: 'Senior Frontend Engineer · React & TypeScript',
        bio: 'I lead frontend teams building React dashboards and design systems. I mentor juniors on component architecture, testing and shipping production-quality code.',
        currentPosition: 'Engineering Lead',
        currentCompany: 'TechNova Solutions',
        yearsOfExperience: 12,
        locationCity: 'Islamabad',
        locationCountry: 'Pakistan',
        socialLinkedin: 'https://linkedin.com/in/sarakhan',
        verificationStatus: 'approved',
        availabilityStatus: 'available',
        maxActiveMentees: 4,
        expertise: [
            { name: 'React', level: 'Expert', yearsOfExperience: 9 },
            { name: 'TypeScript', level: 'Expert', yearsOfExperience: 6 },
            { name: 'Node.js', level: 'Advanced', yearsOfExperience: 7 },
            { name: 'Testing', level: 'Advanced' }
        ]
    },
    {
        email: 'omar.mentor@example.com',
        firstName: 'Omar',
        lastName: 'Farooq',
        headline: 'Lead Data Scientist · ML in production',
        bio: 'I build and deploy machine learning systems. I mentor students through the whole pipeline: cleaning data, framing the problem, evaluating honestly and shipping.',
        currentPosition: 'Lead Data Scientist',
        currentCompany: 'DataWiz Analytics',
        yearsOfExperience: 9,
        locationCity: 'Lahore',
        locationCountry: 'Pakistan',
        socialLinkedin: 'https://linkedin.com/in/omarfarooq',
        verificationStatus: 'approved',
        availabilityStatus: 'available',
        maxActiveMentees: 3,
        expertise: [
            { name: 'Python', level: 'Expert', yearsOfExperience: 9 },
            { name: 'Pandas', level: 'Expert' },
            { name: 'Machine Learning', level: 'Advanced', yearsOfExperience: 6 },
            { name: 'SQL', level: 'Advanced' }
        ]
    },
    {
        email: 'nadia.mentor@example.com',
        firstName: 'Nadia',
        lastName: 'Aslam',
        headline: 'Product Designer · Design systems & research',
        bio: 'Product designer focused on design systems, accessibility and usability research. I help students turn rough wireframes into confident, testable interfaces.',
        currentPosition: 'Design Director',
        currentCompany: 'PixelCraft Studio',
        yearsOfExperience: 7,
        locationCity: 'Karachi',
        locationCountry: 'Pakistan',
        verificationStatus: 'approved',
        availabilityStatus: 'available',
        maxActiveMentees: 5,
        expertise: [
            { name: 'Figma', level: 'Expert', yearsOfExperience: 6 },
            { name: 'Prototyping', level: 'Advanced' },
            { name: 'User Research', level: 'Advanced' },
            { name: 'Design Systems', level: 'Expert' }
        ]
    },
    {
        email: 'bilal.mentor@example.com',
        firstName: 'Bilal',
        lastName: 'Ahmed',
        headline: 'Backend & DevOps Engineer',
        bio: 'Backend engineer working on Node services and AWS infrastructure. I mentor on API design, databases and deployment pipelines.',
        currentPosition: 'Senior Backend Engineer',
        currentCompany: 'CloudScale',
        yearsOfExperience: 5,
        locationCity: 'Islamabad',
        locationCountry: 'Pakistan',
        verificationStatus: 'approved',
        availabilityStatus: 'limited',
        maxActiveMentees: 2,
        expertise: [
            { name: 'Node.js', level: 'Advanced', yearsOfExperience: 5 },
            { name: 'AWS', level: 'Advanced' },
            { name: 'PostgreSQL', level: 'Intermediate' }
        ]
    },
    {
        // Sits in the admin verification queue.
        email: 'hina.mentor@example.com',
        firstName: 'Hina',
        lastName: 'Raza',
        headline: 'Frontend Developer',
        bio: 'Frontend developer with a focus on React and accessible UI.',
        currentPosition: 'Frontend Developer',
        currentCompany: 'Freelance',
        yearsOfExperience: 3,
        locationCity: 'Rawalpindi',
        locationCountry: 'Pakistan',
        verificationStatus: 'pending',
        availabilityStatus: 'available',
        maxActiveMentees: 3,
        expertise: [
            { name: 'React', level: 'Intermediate', yearsOfExperience: 3 },
            { name: 'JavaScript', level: 'Advanced' }
        ]
    },
    {
        // Rejected — proves the gate blocks assignment.
        email: 'tariq.mentor@example.com',
        firstName: 'Tariq',
        lastName: 'Mehmood',
        headline: 'Software Engineer',
        bio: 'Software engineer.',
        currentPosition: 'Developer',
        currentCompany: 'Unlisted',
        yearsOfExperience: 2,
        verificationStatus: 'rejected',
        verificationNote: 'Could not verify the stated employment history. Please resubmit with a reference.',
        availabilityStatus: 'available',
        maxActiveMentees: 3,
        expertise: [{ name: 'Java', level: 'Intermediate' }]
    }
];

// ---------------------------------------------------------------------------

async function clearMentorTables() {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const model of [MentorNote, MentorAssignmentHistory, MentorAssignment, MentorExpertise, Mentor]) {
        await model.destroy({ where: {}, truncate: true, force: true });
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    // Remove the mentor user rows too, so re-running is idempotent.
    await User.destroy({ where: { role: 'mentor' }, force: true });
}

async function createMentor(def) {
    const user = await User.create({
        email: def.email,
        password: PASSWORD,
        role: 'mentor',
        isEmailVerified: true,
        isActive: true
    });

    const mentor = await Mentor.create({
        userId: user.id,
        firstName: def.firstName,
        lastName: def.lastName,
        headline: def.headline,
        bio: def.bio,
        currentPosition: def.currentPosition,
        currentCompany: def.currentCompany,
        yearsOfExperience: def.yearsOfExperience,
        locationCity: def.locationCity || null,
        locationCountry: def.locationCountry || null,
        socialLinkedin: def.socialLinkedin || null,
        availabilityStatus: def.availabilityStatus,
        maxActiveMentees: def.maxActiveMentees,
        verificationStatus: def.verificationStatus,
        verificationNote: def.verificationNote || null,
        verifiedAt: def.verificationStatus === 'pending' ? null : daysAgo(20)
    });

    for (const e of def.expertise) {
        await MentorExpertise.create({
            mentorId: mentor.id,
            name: e.name,
            level: e.level,
            yearsOfExperience: e.yearsOfExperience || null
        });
    }

    await recalcMentorCompletion(mentor);
    return mentor;
}

// A mentor can only be assigned once the student is actually on the internship.
async function acceptApplication(application) {
    if (application.status === 'accepted') return application;
    const from = application.status;
    application.status = 'accepted';
    application.decidedAt = daysAgo(10);
    await application.save();
    await ApplicationStatusHistory.create({
        applicationId: application.id,
        fromStatus: from,
        toStatus: 'accepted',
        changedByUserId: null,
        reason: 'Seeded for the mentor assignment demo'
    });
    return application;
}

async function createAssignment({ application, mentor, status, note, extra = {} }) {
    const assignment = await MentorAssignment.create({
        applicationId: application.id,
        mentorId: mentor.id,
        studentId: application.studentId,
        taskId: application.taskId,
        companyId: application.task.companyId,
        status,
        assignmentNote: note || null,
        assignedByUserId: null,
        ...extra
    });

    await MentorAssignmentHistory.create({
        assignmentId: assignment.id,
        fromStatus: null,
        toStatus: 'pending',
        reason: null,
        createdAt: extra.createdAt || daysAgo(9)
    });
    if (status !== 'pending') {
        await MentorAssignmentHistory.create({
            assignmentId: assignment.id,
            fromStatus: 'pending',
            toStatus: status === 'completed' ? 'active' : status,
            reason: extra.declineReason || null,
            createdAt: daysAgo(8)
        });
    }
    if (status === 'completed') {
        await MentorAssignmentHistory.create({
            assignmentId: assignment.id,
            fromStatus: 'active',
            toStatus: 'completed',
            createdAt: daysAgo(1)
        });
    }

    return assignment;
}

async function addNotes(assignment, mentorUserId, studentUserId, mentorName, studentName, lines) {
    let created = null;
    for (const line of lines) {
        created = await MentorNote.create({
            assignmentId: assignment.id,
            authorUserId: line.role === 'mentor' ? mentorUserId : studentUserId,
            authorRole: line.role,
            authorName: line.role === 'mentor' ? mentorName : studentName,
            body: line.body,
            isPinned: !!line.pinned
        });
    }
    if (created) {
        assignment.lastNoteAt = new Date();
        await assignment.save();
    }
}

async function seedMentors() {
    try {
        console.log('Clearing mentor tables…');
        await clearMentorTables();

        console.log('Creating mentors…');
        const mentors = {};
        for (const def of MENTORS) {
            const m = await createMentor(def);
            mentors[def.firstName.toLowerCase()] = m;
            console.log(`  • ${def.firstName} ${def.lastName} — ${def.verificationStatus}`);
        }

        // Pick one application per flagship task, preferring the domain-matching student.
        const applications = await Application.findAll({
            include: [
                { model: Task, as: 'task' },
                { model: Student, as: 'student' }
            ],
            order: [['id', 'ASC']]
        });

        if (applications.length === 0) {
            console.log('\n⚠ No applications found. Run `node src/scripts/seedDemo.js` first.');
            process.exit(1);
        }

        // One application per task AND, where possible, a different student each
        // time — otherwise seedDemo's ordering hands every mentorship to Alice.
        const picked = [];
        const usedTasks = new Set();
        const usedStudents = new Set();
        for (const pass of [1, 2]) {
            for (const a of applications) {
                if (usedTasks.has(String(a.taskId))) continue;
                if (pass === 1 && usedStudents.has(String(a.studentId))) continue;
                picked.push(a);
                usedTasks.add(String(a.taskId));
                usedStudents.add(String(a.studentId));
                if (picked.length >= 4) break;
            }
            if (picked.length >= 4) break;
        }

        console.log('\nAccepting applications so mentors can be assigned…');
        for (const a of picked) {
            await acceptApplication(a);
            console.log(`  • application ${a.id} → accepted (${a.student.firstName}, "${a.task.title}")`);
        }

        console.log('\nCreating mentor assignments…');
        // Deliberately leave one accepted internship without a mentor, so the
        // company-side assign flow is demonstrable immediately after seeding.
        const spare = applications.find(
            (a) => !picked.some((x) => String(x.id) === String(a.id))
        );
        if (spare) {
            await acceptApplication(spare);
            console.log(
                '  * application ' + spare.id + ' -> accepted (' + spare.student.firstName +
                    ', "' + spare.task.title + '") - left WITHOUT a mentor on purpose'
            );
        }

        const plan = [
            { app: picked[0], mentor: mentors.sara, status: 'active',
              note: 'Please focus on component structure and testing.',
              extra: { matchScore: 91, respondedAt: daysAgo(8), startedAt: daysAgo(8) } },
            { app: picked[1], mentor: mentors.omar, status: 'pending',
              note: 'Data-heavy task — would value your guidance on evaluation.',
              extra: { matchScore: 88 } },
            { app: picked[2], mentor: mentors.nadia, status: 'completed',
              note: 'Design task, needs research support.',
              extra: {
                  matchScore: 84,
                  respondedAt: daysAgo(8),
                  startedAt: daysAgo(8),
                  completedAt: daysAgo(1),
                  mentorRating: 5,
                  mentorFeedback: 'Excellent progress. Took feedback well and iterated quickly.',
                  studentRating: 5,
                  studentFeedback: 'Nadia was incredibly helpful — the weekly critiques changed how I design.'
              } }
        ];
        if (picked[3]) {
            plan.push({
                app: picked[3], mentor: mentors.bilal, status: 'declined',
                note: 'Backend-leaning internship.',
                extra: { matchScore: 61, respondedAt: daysAgo(7), declineReason: 'Fully booked this month — happy to help next cycle.' }
            });
        }

        const created = [];
        for (const p of plan) {
            if (!p.app || !p.mentor) continue;
            const a = await createAssignment({
                application: p.app, mentor: p.mentor, status: p.status, note: p.note, extra: p.extra
            });
            created.push({ assignment: a, plan: p });
            console.log(`  • ${p.mentor.firstName} → application ${p.app.id} [${p.status}]`);
        }

        console.log('\nAdding guidance notes…');
        for (const { assignment, plan: p } of created) {
            if (!['active', 'completed'].includes(p.status)) continue;
            const mentorUser = await User.findByPk(p.mentor.userId);
            const student = p.app.student;
            const studentUser = await User.findByPk(student.userId);
            await addNotes(
                assignment,
                mentorUser.id,
                studentUser.id,
                `${p.mentor.firstName} ${p.mentor.lastName}`,
                `${student.firstName} ${student.lastName}`,
                [
                    { role: 'mentor', pinned: true, body: 'Welcome aboard! Start by reading the task brief end to end and listing anything ambiguous — we will clear those up before you write code.' },
                    { role: 'student', body: 'Thanks! I have read the brief. Two questions: which state library should I use, and is there a design reference for the charts?' },
                    { role: 'mentor', body: 'Keep state local for now — no library until we actually feel the pain. I will share a chart reference in our next check-in.' },
                    { role: 'student', body: 'Understood. I have pushed the first version of the layout for review.' }
                ]
            );
            console.log(`  • 4 notes on assignment ${assignment.id}`);
        }

        console.log('\nRecomputing mentor aggregates…');
        for (const m of Object.values(mentors)) {
            await recalcMentorActiveCount(m.id);
            await recalcMentorRating(m.id);
        }

        const counts = {};
        for (const s of MentorAssignment.STATUSES) {
            counts[s] = await MentorAssignment.count({ where: { status: s } });
        }

        console.log('\n════════════════ MENTOR SEED COMPLETE ════════════════');
        console.log(`Mentors: ${MENTORS.length} (4 approved, 1 pending, 1 rejected)`);
        console.log(`Assignments: ${JSON.stringify(counts)}`);
        console.log(`Notes: ${await MentorNote.count()}`);
        console.log(`\nAll mentor accounts use password:  ${PASSWORD}`);
        console.log('\nMENTOR LOGINS');
        MENTORS.forEach((m) => {
            console.log(`  • ${m.email.padEnd(28)} → ${m.firstName} ${m.lastName} [${m.verificationStatus}]`);
        });
        console.log('\nWHAT TO TEST');
        console.log('  Mentor  : log in as sara.mentor@example.com → /mentor/students (1 active mentorship + notes)');
        console.log('            omar.mentor@example.com has a PENDING request to accept or decline.');
        console.log('  Admin   : /admin/mentors → Hina Raza is awaiting verification.');
        console.log('  Company : /company/mentors → assign a mentor to any unassigned accepted internship.');
        console.log('  Student : /student/mentorship → the active and completed mentorships with their threads.');
        console.log('══════════════════════════════════════════════════════');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding mentors:', err);
        process.exit(1);
    }
}

seedMentors();
