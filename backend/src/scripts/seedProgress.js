/**
 * seedProgress.js — seed Module 8 (Progress Tracking) demo data.
 *
 * Builds one internship per accepted application and gives each a different
 * health story, so every state in the module is visible immediately after
 * seeding without having to click through the whole lifecycle:
 *
 *   1. ON TRACK    — half the milestones approved, time logged steadily,
 *                    one milestone waiting on the reviewer
 *   2. AT RISK     — an open blocker and a stale check-in
 *   3. OVERDUE     — a milestone past its due date and barely any progress
 *   4. COMPLETED   — every milestone approved, closed with a rating
 *
 * Run AFTER seedDemo.js and seedMentors.js, from the backend directory:
 *     npm run seed:progress
 *
 * Additive — wipes only the Module 8 tables. Re-runnable.
 */
require('dotenv').config();

const {
    sequelize,
    Student,
    Company,
    Task,
    Application,
    Mentor,
    MentorAssignment,
    InternshipProgress,
    ProgressMilestone,
    MilestoneSubmission,
    ProgressTimeLog,
    ProgressUpdate,
    ProgressStatusHistory,
    recalcMilestoneHours,
    recalcProgressMetrics
} = require('../models');

const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (n) => new Date(Date.now() - n * DAY);
const dateAgo = (n) => daysAgo(n).toISOString().slice(0, 10);
const dateIn = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Milestone plans, keyed by the scenario they belong to
// ---------------------------------------------------------------------------

const PLANS = {
    on_track: [
        {
            title: 'Project setup and requirements walkthrough',
            description: 'Clone the repo, get the app running locally, and write up your understanding of the brief.',
            weight: 1,
            estimatedHours: 6,
            dueOffset: -18,
            outcome: 'approved'
        },
        {
            title: 'Component library and design tokens',
            description: 'Build the shared button, card and input components against the Figma spec.',
            weight: 2,
            estimatedHours: 14,
            dueOffset: -8,
            outcome: 'approved'
        },
        {
            title: 'Dashboard data layer',
            description: 'Wire the charts to the REST API with loading and error states.',
            weight: 3,
            estimatedHours: 20,
            dueOffset: 4,
            outcome: 'submitted'
        },
        {
            title: 'Responsive polish and handover',
            description: 'Mobile breakpoints, accessibility pass, and a short handover document.',
            weight: 2,
            estimatedHours: 10,
            dueOffset: 12,
            outcome: 'pending'
        }
    ],
    at_risk: [
        {
            title: 'Data collection and cleaning',
            description: 'Pull the raw dataset, document its shape, and handle missing values.',
            weight: 2,
            estimatedHours: 12,
            dueOffset: -6,
            outcome: 'approved'
        },
        {
            title: 'Baseline model',
            description: 'Train a simple baseline and record its metrics so later work has something to beat.',
            weight: 3,
            estimatedHours: 18,
            dueOffset: 3,
            outcome: 'blocked',
            blockedReason:
                'The API credentials for the training dataset expired and I cannot re-download it.'
        },
        {
            title: 'Evaluation write-up',
            description: 'Compare the models and write the short evaluation section.',
            weight: 2,
            estimatedHours: 8,
            dueOffset: 14,
            outcome: 'pending'
        }
    ],
    overdue: [
        {
            title: 'Wireframes for the three core screens',
            description: 'Low-fidelity wireframes covering the onboarding, browse and detail screens.',
            weight: 2,
            estimatedHours: 10,
            dueOffset: -9,
            outcome: 'changes_requested',
            reviewNote:
                'Good start, but the browse screen is missing the filter panel described in the brief. Please add it and resubmit.'
        },
        {
            title: 'High-fidelity mockups',
            description: 'Apply the brand palette and typography to the approved wireframes.',
            weight: 3,
            estimatedHours: 16,
            dueOffset: -2,
            outcome: 'pending'
        },
        {
            title: 'Clickable prototype',
            description: 'Link the screens into a prototype that can be walked through in a review.',
            weight: 2,
            estimatedHours: 8,
            dueOffset: 6,
            outcome: 'pending'
        }
    ],
    completed: [
        {
            title: 'Content audit',
            description: 'Review the existing copy and list what needs rewriting.',
            weight: 1,
            estimatedHours: 5,
            dueOffset: -22,
            outcome: 'approved'
        },
        {
            title: 'Rewrite the top ten pages',
            description: 'Rewrite the highest-traffic pages against the new tone-of-voice guide.',
            weight: 3,
            estimatedHours: 18,
            dueOffset: -12,
            outcome: 'approved'
        },
        {
            title: 'Style guide handover',
            description: 'Document the tone-of-voice decisions so the team can keep it consistent.',
            weight: 2,
            estimatedHours: 8,
            dueOffset: -4,
            outcome: 'approved'
        }
    ]
};

const SUBMISSION_TEXT = {
    approved:
        'Finished and pushed to the feature branch. All the acceptance criteria in the description are covered, and I added a short README section explaining the decisions I made.',
    submitted:
        'The data layer is wired up and the charts render live values. Loading and error states are in. One open question in the PR about how to handle an empty date range.',
    changes_requested:
        'First pass at the wireframes — three screens, low fidelity, exported to PDF. Happy to iterate on anything that does not match what you had in mind.'
};

// ---------------------------------------------------------------------------

const clearProgressTables = async () => {
    // Children first: the FKs are ON DELETE CASCADE, but being explicit keeps
    // this safe to run against a partially-migrated database.
    await ProgressStatusHistory.destroy({ where: {}, truncate: false });
    await ProgressTimeLog.destroy({ where: {}, truncate: false });
    await MilestoneSubmission.destroy({ where: {}, truncate: false });
    await ProgressUpdate.destroy({ where: {}, truncate: false });
    await ProgressMilestone.destroy({ where: {}, truncate: false });
    await InternshipProgress.destroy({ where: {}, truncate: false });
};

const logHistory = (progressId, row) =>
    ProgressStatusHistory.create({
        progressId,
        entityType: row.milestoneId ? 'milestone' : 'internship',
        ...row
    });

// Builds one milestone plus whatever submission / time-log / history rows its
// outcome implies.
const buildMilestone = async ({ progress, def, index, studentId, reviewerUserId, reviewerRole }) => {
    const milestone = await ProgressMilestone.create({
        progressId: progress.id,
        title: def.title,
        description: def.description,
        orderIndex: index,
        weight: def.weight,
        isRequired: true,
        dueDate: def.dueOffset < 0 ? dateAgo(-def.dueOffset) : dateIn(def.dueOffset),
        estimatedHours: def.estimatedHours,
        createdByUserId: reviewerUserId,
        createdByRole: reviewerRole,
        status: 'pending'
    });

    await logHistory(progress.id, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        fromStatus: null,
        toStatus: 'pending',
        changedByUserId: reviewerUserId,
        changedByRole: reviewerRole
    });

    if (def.outcome === 'pending') return milestone;

    // Everything below has been started.
    const startedAt = daysAgo(20 - index * 4);
    milestone.startedAt = startedAt;
    milestone.status = 'in_progress';
    await milestone.save();
    await logHistory(progress.id, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        fromStatus: 'pending',
        toStatus: 'in_progress',
        changedByUserId: null,
        changedByRole: 'student'
    });

    if (def.outcome === 'blocked') {
        milestone.status = 'blocked';
        milestone.blockedAt = daysAgo(9);
        milestone.blockedReason = def.blockedReason;
        await milestone.save();
        await ProgressUpdate.create({
            progressId: progress.id,
            milestoneId: milestone.id,
            authorUserId: null,
            authorRole: 'student',
            authorName: 'Student',
            type: 'blocker',
            body: def.blockedReason,
            isSystemGenerated: false,
            createdAt: daysAgo(9),
            updatedAt: daysAgo(9)
        });
        await logHistory(progress.id, {
            milestoneId: milestone.id,
            milestoneTitle: milestone.title,
            fromStatus: 'in_progress',
            toStatus: 'blocked',
            changedByRole: 'student',
            reason: def.blockedReason
        });
        return milestone;
    }

    // Submitted, approved or sent back — all of them have a submission row.
    const submittedAt = daysAgo(Math.max(1, 14 - index * 4));
    const submission = await MilestoneSubmission.create({
        milestoneId: milestone.id,
        progressId: progress.id,
        studentId,
        attemptNumber: 1,
        summary: SUBMISSION_TEXT[def.outcome] || SUBMISSION_TEXT.submitted,
        repositoryUrl: 'https://github.com/example/micro-internship-work',
        hoursSpent: def.estimatedHours,
        status: 'pending_review',
        submittedAt,
        wasLate: false
    });

    milestone.status = 'submitted';
    milestone.submittedAt = submittedAt;
    milestone.submissionCount = 1;
    await milestone.save();
    await logHistory(progress.id, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        fromStatus: 'in_progress',
        toStatus: 'submitted',
        changedByRole: 'student'
    });

    if (def.outcome === 'submitted') return milestone;

    const reviewedAt = new Date(submittedAt.getTime() + DAY);
    const approved = def.outcome === 'approved';

    submission.status = approved ? 'approved' : 'changes_requested';
    submission.reviewedByUserId = reviewerUserId;
    submission.reviewerRole = reviewerRole;
    submission.reviewNote = def.reviewNote || (approved ? 'Clean work — approved.' : null);
    submission.reviewScore = approved ? 4 : 3;
    submission.reviewedAt = reviewedAt;
    await submission.save();

    milestone.status = approved ? 'completed' : 'changes_requested';
    milestone.completedAt = approved ? reviewedAt : null;
    milestone.reviewedByUserId = reviewerUserId;
    milestone.reviewerRole = reviewerRole;
    milestone.reviewNote = submission.reviewNote;
    milestone.reviewedAt = reviewedAt;
    await milestone.save();

    await logHistory(progress.id, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        fromStatus: 'submitted',
        toStatus: milestone.status,
        changedByUserId: reviewerUserId,
        changedByRole: reviewerRole,
        reason: submission.reviewNote
    });

    return milestone;
};

// Spreads plausible daily time entries across the milestones that were worked on.
const seedTimeLogs = async (progress, milestones, studentId, scenario) => {
    const worked = milestones.filter((m) => m.status !== 'pending');
    if (worked.length === 0) return;

    // An overdue internship deliberately gets very little logged time — that is
    // part of why the risk engine flags it.
    const daysOfWork = scenario === 'overdue' ? 3 : scenario === 'at_risk' ? 7 : 14;
    const hoursPerDay = scenario === 'overdue' ? 1.5 : 3;

    for (let i = 0; i < daysOfWork; i += 1) {
        // Whole-day offsets, most recent last, so every entry lands on its own
        // date and the weekly chart has a realistic shape.
        const day = daysAgo(daysOfWork * 2 - i * 2);
        // Skip weekends so it reads like a real working pattern.
        if ([0, 6].includes(day.getUTCDay())) continue;

        const milestone = worked[Math.min(worked.length - 1, Math.floor(i / 4))];
        await ProgressTimeLog.create({
            progressId: progress.id,
            milestoneId: milestone.id,
            studentId,
            workDate: day.toISOString().slice(0, 10),
            hours: hoursPerDay,
            description: `Worked on "${milestone.title}"`
        });
    }

    for (const m of worked) {
        await recalcMilestoneHours(m.id);
    }
};

const seedUpdates = async (progress, scenario) => {
    const rows = [];

    if (scenario === 'on_track') {
        rows.push(
            {
                authorRole: 'student',
                authorName: 'Student',
                type: 'checkin',
                body: 'Component library is done and merged. Starting on the data layer today — the API shape looks straightforward.',
                percentSelfReported: 55,
                createdAt: daysAgo(4)
            },
            {
                authorRole: 'mentor',
                authorName: 'Mentor',
                type: 'note',
                body: 'Nice work on the components. When you wire the charts, put the loading state in the container rather than each chart.',
                createdAt: daysAgo(3)
            }
        );
    }

    if (scenario === 'at_risk') {
        rows.push({
            authorRole: 'student',
            authorName: 'Student',
            type: 'checkin',
            body: 'Cleaning is finished. Blocked on the dataset credentials for the baseline model.',
            percentSelfReported: 35,
            createdAt: daysAgo(9)
        });
    }

    if (scenario === 'overdue') {
        rows.push({
            authorRole: 'company',
            authorName: 'Company',
            type: 'risk_flag',
            body: 'The wireframes are more than a week past their date and we have not seen a resubmission. Can we agree a catch-up plan this week?',
            createdAt: daysAgo(2)
        });
    }

    for (const r of rows) {
        await ProgressUpdate.create({
            progressId: progress.id,
            authorUserId: null,
            isSystemGenerated: false,
            updatedAt: r.createdAt,
            ...r
        });
    }
};

// ---------------------------------------------------------------------------

async function seedProgress() {
    try {
        console.log('Clearing progress tables…');
        await clearProgressTables();

        const accepted = await Application.findAll({
            where: { status: 'accepted' },
            include: [
                { model: Task, as: 'task' },
                { model: Student, as: 'student' }
            ],
            order: [['id', 'ASC']]
        });

        if (accepted.length === 0) {
            console.log(
                '\n⚠ No accepted applications found. Run `node src/scripts/seedDemo.js` and ' +
                '`npm run seed:mentors` first — a mentor seed accepts the applications this ' +
                'script builds on.'
            );
            process.exit(1);
        }

        const scenarios = ['on_track', 'at_risk', 'overdue', 'completed'];
        const created = [];

        for (let i = 0; i < accepted.length && i < scenarios.length; i += 1) {
            const application = accepted[i];
            const scenario = scenarios[i];
            const task = application.task;

            // Whoever reviews here is the mentor if there is one, otherwise the
            // company — which is exactly the rule the controller enforces.
            const assignment = await MentorAssignment.findOne({
                where: { applicationId: application.id, status: 'active' },
                include: [{ model: Mentor, as: 'mentor' }]
            });
            const company = await Company.findByPk(task.companyId);
            const reviewerUserId = assignment?.mentor?.userId || company?.userId || null;
            const reviewerRole = assignment ? 'mentor' : 'company';

            const startOffset = scenario === 'completed' ? 30 : 24;
            const endOffset =
                scenario === 'overdue' ? -3 : scenario === 'completed' ? -2 : 14;

            const progress = await InternshipProgress.create({
                applicationId: application.id,
                studentId: application.studentId,
                taskId: application.taskId,
                companyId: task.companyId,
                mentorId: assignment ? assignment.mentorId : null,
                status: 'in_progress',
                startDate: dateAgo(startOffset),
                targetEndDate: endOffset < 0 ? dateAgo(-endOffset) : dateIn(endOffset),
                expectedHoursPerWeek: 12,
                objective:
                    `Deliver the agreed scope for "${task.title}" to a production-ready standard, ` +
                    'with regular check-ins and a documented handover.',
                startedAt: daysAgo(startOffset),
                // An at-risk internship has been quiet for a while — that
                // silence is one of the signals the risk engine picks up.
                lastActivityAt: scenario === 'at_risk' ? daysAgo(9) : daysAgo(1)
            });

            await logHistory(progress.id, {
                fromStatus: 'not_started',
                toStatus: 'in_progress',
                changedByUserId: reviewerUserId,
                changedByRole: reviewerRole
            });

            const milestones = [];
            for (let j = 0; j < PLANS[scenario].length; j += 1) {
                milestones.push(
                    await buildMilestone({
                        progress,
                        def: PLANS[scenario][j],
                        index: j,
                        studentId: application.studentId,
                        reviewerUserId,
                        reviewerRole
                    })
                );
            }

            await seedTimeLogs(progress, milestones, application.studentId, scenario);
            await seedUpdates(progress, scenario);

            if (scenario === 'completed') {
                progress.status = 'completed';
                progress.completedAt = daysAgo(1);
                progress.actualEndDate = dateAgo(1);
                progress.performanceRating = 5;
                progress.completionNote =
                    'Delivered every milestone on time and to a high standard. Communication was ' +
                    'excellent throughout — we would happily work with this student again.';
                await progress.save();
                await logHistory(progress.id, {
                    fromStatus: 'in_progress',
                    toStatus: 'completed',
                    changedByUserId: reviewerUserId,
                    changedByRole: reviewerRole
                });
            }

            // The cached numbers are always derived, never seeded by hand.
            const final = await recalcProgressMetrics(progress.id);
            created.push({
                scenario,
                id: progress.id,
                student: application.student
                    ? `${application.student.firstName} ${application.student.lastName}`
                    : '?',
                task: task.title,
                percent: final.progressPercent,
                health: final.healthStatus,
                status: final.status
            });

            console.log(
                `  • ${scenario.padEnd(10)} → progress ${progress.id} ` +
                `"${task.title}" (${final.progressPercent}%, ${final.healthStatus})`
            );
        }

        console.log('\n════════════════ PROGRESS SEED COMPLETE ════════════════');
        console.log(`Internships:  ${await InternshipProgress.count()}`);
        console.log(`Milestones:   ${await ProgressMilestone.count()}`);
        console.log(`Submissions:  ${await MilestoneSubmission.count()}`);
        console.log(`Time logs:    ${await ProgressTimeLog.count()}`);
        console.log(`Updates:      ${await ProgressUpdate.count()}`);
        console.log('\nSCENARIOS');
        created.forEach((c) => {
            console.log(
                `  • ${c.scenario.padEnd(10)} ${String(c.percent).padStart(3)}%  ` +
                `${c.health.padEnd(9)} ${c.student} — ${c.task}`
            );
        });
        console.log('\nWHAT TO TEST');
        console.log('  Student : /student/internships → open the on-track one, log time, submit a milestone.');
        console.log('  Company : /company/progress → the overdue and at-risk rows sort to the top.');
        console.log('  Mentor  : /mentor/progress → review the submission waiting on the on-track internship.');
        console.log('  Report  : open any internship → Report tab shows the AI risk assessment');
        console.log('            (stop the AI service to see the fallback render identically).');
        console.log('════════════════════════════════════════════════════════');

        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding progress:', err);
        process.exit(1);
    }
}

seedProgress();
