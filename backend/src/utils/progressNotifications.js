const sendEmail = require('./sendEmail');
const {
    milestoneAssigned,
    milestoneSubmitted,
    milestoneReviewed,
    progressBlockerRaised,
    progressBlockerResolved,
    progressAtRisk,
    progressUpdatePosted,
    internshipStatusChanged,
    internshipCompleted
} = require('./emailTemplates');
const {
    InternshipProgress,
    ProgressMilestone,
    MilestoneSubmission,
    MentorAssignment,
    Mentor,
    Student,
    Company,
    Task,
    User
} = require('../models');

const safeLog = (msg, err) => {
    console.warn(`[progressNotifications] ${msg}`, err?.message || err);
};

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Best-effort send — never throws, never blocks the API response. Same
// contract as mentorNotifications.js so a dead SMTP host cannot 500 a request.
const safeSendEmail = async (email, payload) => {
    try {
        if (!email || !payload) return;
        await sendEmail({ email, subject: payload.subject, html: payload.html });
    } catch (err) {
        safeLog('email failed', err);
    }
};

const fullName = (person) =>
    person ? [person.firstName, person.lastName].filter(Boolean).join(' ') : '';

const companyEmail = (company) => company?.contactEmail || company?.user?.email;

// Loads a progress row with every party that might need addressing.
const loadProgress = (progressId) =>
    InternshipProgress.findByPk(progressId, {
        include: [
            {
                model: Student,
                as: 'student',
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            },
            {
                model: Company,
                as: 'company',
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            },
            { model: Task, as: 'task', attributes: ['id', 'title'] }
        ]
    });

// The mentor is resolved from mentor_assignments rather than the cached
// mentorId column, so a mentorship that changed hands still notifies correctly.
const loadActiveMentor = async (applicationId) => {
    const assignment = await MentorAssignment.findOne({
        where: { applicationId, status: 'active' },
        include: [
            {
                model: Mentor,
                as: 'mentor',
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            }
        ]
    });
    return assignment ? assignment.mentor : null;
};

const studentWorkspaceUrl = (progressId) => `${FRONTEND()}/student/internships/${progressId}`;
const companyWorkspaceUrl = (progressId) => `${FRONTEND()}/company/progress/${progressId}`;
const mentorWorkspaceUrl = (progressId) => `${FRONTEND()}/mentor/progress/${progressId}`;

// ---------------------------------------------------------------------------

// The student is told when a supervisor adds work to their plan.
const notifyStudentOfMilestone = async (progressId, milestoneId, authorName) => {
    try {
        const [progress, milestone] = await Promise.all([
            loadProgress(progressId),
            ProgressMilestone.findByPk(milestoneId)
        ]);
        if (!progress || !milestone) {
            return safeLog('skip milestone: progress or milestone not found', { progressId });
        }

        const email = progress.student?.user?.email;
        if (!email) return safeLog('skip milestone: student email not found', { progressId });

        await safeSendEmail(
            email,
            milestoneAssigned({
                studentName: fullName(progress.student) || 'there',
                taskTitle: progress.task?.title || 'your micro-internship',
                milestoneTitle: milestone.title,
                dueDate: milestone.dueDate || null,
                authorName,
                dashboardUrl: studentWorkspaceUrl(progress.id)
            })
        );
    } catch (err) {
        safeLog('failed to notify student of milestone', err);
    }
};

// A submission goes to everyone who can review it: the company and the mentor.
const notifyReviewersOfSubmission = async (progressId, submissionId) => {
    try {
        const [progress, submission] = await Promise.all([
            loadProgress(progressId),
            MilestoneSubmission.findByPk(submissionId, {
                include: [{ model: ProgressMilestone, as: 'milestone', attributes: ['id', 'title'] }]
            })
        ]);
        if (!progress || !submission) {
            return safeLog('skip submission: progress or submission not found', { progressId });
        }

        const studentName = fullName(progress.student) || 'Your student';
        const taskTitle = progress.task?.title || 'the micro-internship';
        const milestoneTitle = submission.milestone?.title || 'a milestone';
        const body = String(submission.summary || '');
        const preview = body.length > 240 ? `${body.slice(0, 240)}…` : body;

        const compAddr = companyEmail(progress.company);
        if (compAddr) {
            await safeSendEmail(
                compAddr,
                milestoneSubmitted({
                    recipientName: progress.company?.companyName || 'there',
                    studentName,
                    taskTitle,
                    milestoneTitle,
                    attemptNumber: submission.attemptNumber,
                    summary: preview,
                    dashboardUrl: companyWorkspaceUrl(progress.id)
                })
            );
        }

        const mentor = await loadActiveMentor(progress.applicationId);
        const mentorAddr = mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                milestoneSubmitted({
                    recipientName: fullName(mentor) || 'there',
                    studentName,
                    taskTitle,
                    milestoneTitle,
                    attemptNumber: submission.attemptNumber,
                    summary: preview,
                    dashboardUrl: mentorWorkspaceUrl(progress.id)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify reviewers of submission', err);
    }
};

const notifyStudentOfReview = async (progressId, milestoneId, approved, reviewerName, reviewNote) => {
    try {
        const [progress, milestone] = await Promise.all([
            loadProgress(progressId),
            ProgressMilestone.findByPk(milestoneId)
        ]);
        if (!progress || !milestone) {
            return safeLog('skip review: progress or milestone not found', { progressId });
        }

        const email = progress.student?.user?.email;
        if (!email) return safeLog('skip review: student email not found', { progressId });

        await safeSendEmail(
            email,
            milestoneReviewed({
                studentName: fullName(progress.student) || 'there',
                taskTitle: progress.task?.title || 'your micro-internship',
                milestoneTitle: milestone.title,
                approved,
                reviewerName,
                reviewNote,
                dashboardUrl: studentWorkspaceUrl(progress.id)
            })
        );
    } catch (err) {
        safeLog('failed to notify student of review', err);
    }
};

// A blocker is the signal the module exists to surface, so it goes to both
// supervisors immediately rather than waiting for the next report.
const notifySupervisorsOfBlocker = async (progressId, { milestoneTitle, body }) => {
    try {
        const progress = await loadProgress(progressId);
        if (!progress) return safeLog('skip blocker: progress not found', { progressId });

        const studentName = fullName(progress.student) || 'Your student';
        const taskTitle = progress.task?.title || 'the micro-internship';
        const trimmed = String(body || '');
        const preview = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;

        const compAddr = companyEmail(progress.company);
        if (compAddr) {
            await safeSendEmail(
                compAddr,
                progressBlockerRaised({
                    recipientName: progress.company?.companyName || 'there',
                    studentName,
                    taskTitle,
                    milestoneTitle,
                    body: preview,
                    dashboardUrl: companyWorkspaceUrl(progress.id)
                })
            );
        }

        const mentor = await loadActiveMentor(progress.applicationId);
        const mentorAddr = mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                progressBlockerRaised({
                    recipientName: fullName(mentor) || 'there',
                    studentName,
                    taskTitle,
                    milestoneTitle,
                    body: preview,
                    dashboardUrl: mentorWorkspaceUrl(progress.id)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify supervisors of blocker', err);
    }
};

const notifyOfBlockerResolved = async (progressId, { milestoneTitle, resolutionNote }) => {
    try {
        const progress = await loadProgress(progressId);
        if (!progress) return safeLog('skip blocker resolve: progress not found', { progressId });

        const taskTitle = progress.task?.title || 'the micro-internship';

        const studentAddr = progress.student?.user?.email;
        if (studentAddr) {
            await safeSendEmail(
                studentAddr,
                progressBlockerResolved({
                    recipientName: fullName(progress.student) || 'there',
                    taskTitle,
                    milestoneTitle,
                    resolutionNote,
                    dashboardUrl: studentWorkspaceUrl(progress.id)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify of blocker resolution', err);
    }
};

// Fired only on the transition into at_risk/overdue, never on every recompute,
// so supervisors are not mailed on each page load.
const notifySupervisorsOfRisk = async (progressId, health, reasons) => {
    try {
        const progress = await loadProgress(progressId);
        if (!progress) return safeLog('skip risk: progress not found', { progressId });

        const studentName = fullName(progress.student) || 'A student';
        const taskTitle = progress.task?.title || 'the micro-internship';
        const percent = Number(progress.progressPercent) || 0;

        const compAddr = companyEmail(progress.company);
        if (compAddr) {
            await safeSendEmail(
                compAddr,
                progressAtRisk({
                    recipientName: progress.company?.companyName || 'there',
                    studentName,
                    taskTitle,
                    health,
                    progressPercent: percent,
                    reasons,
                    dashboardUrl: companyWorkspaceUrl(progress.id)
                })
            );
        }

        const mentor = await loadActiveMentor(progress.applicationId);
        const mentorAddr = mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                progressAtRisk({
                    recipientName: fullName(mentor) || 'there',
                    studentName,
                    taskTitle,
                    health,
                    progressPercent: percent,
                    reasons,
                    dashboardUrl: mentorWorkspaceUrl(progress.id)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify supervisors of risk', err);
    }
};

// A progress update goes to the other parties on the internship, never back
// to its own author.
const notifyOfProgressUpdate = async (progressId, { authorRole, authorName, type, body }) => {
    try {
        const progress = await loadProgress(progressId);
        if (!progress) return safeLog('skip update: progress not found', { progressId });

        const taskTitle = progress.task?.title || 'the micro-internship';
        const trimmed = String(body || '');
        const preview = trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
        const payloadFor = (recipientName, dashboardUrl) =>
            progressUpdatePosted({
                recipientName,
                authorName: authorName || 'A collaborator',
                taskTitle,
                updateType: type,
                preview,
                dashboardUrl
            });

        if (authorRole !== 'student') {
            const studentAddr = progress.student?.user?.email;
            if (studentAddr) {
                await safeSendEmail(
                    studentAddr,
                    payloadFor(
                        fullName(progress.student) || 'there',
                        studentWorkspaceUrl(progress.id)
                    )
                );
            }
        }

        if (authorRole !== 'company') {
            const compAddr = companyEmail(progress.company);
            if (compAddr) {
                await safeSendEmail(
                    compAddr,
                    payloadFor(
                        progress.company?.companyName || 'there',
                        companyWorkspaceUrl(progress.id)
                    )
                );
            }
        }

        if (authorRole !== 'mentor') {
            const mentor = await loadActiveMentor(progress.applicationId);
            const mentorAddr = mentor?.user?.email;
            if (mentorAddr) {
                await safeSendEmail(
                    mentorAddr,
                    payloadFor(fullName(mentor) || 'there', mentorWorkspaceUrl(progress.id))
                );
            }
        }
    } catch (err) {
        safeLog('failed to notify of progress update', err);
    }
};

const notifyOfStatusChange = async (progressId, status, reason) => {
    try {
        const progress = await loadProgress(progressId);
        if (!progress) return safeLog('skip status: progress not found', { progressId });

        const taskTitle = progress.task?.title || 'the micro-internship';
        const percent = Number(progress.progressPercent) || 0;

        const studentAddr = progress.student?.user?.email;
        if (studentAddr) {
            await safeSendEmail(
                studentAddr,
                internshipStatusChanged({
                    recipientName: fullName(progress.student) || 'there',
                    taskTitle,
                    status,
                    reason,
                    progressPercent: percent,
                    dashboardUrl: studentWorkspaceUrl(progress.id)
                })
            );
        }

        const mentor = await loadActiveMentor(progress.applicationId);
        const mentorAddr = mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                internshipStatusChanged({
                    recipientName: fullName(mentor) || 'there',
                    taskTitle,
                    status,
                    reason,
                    progressPercent: percent,
                    dashboardUrl: mentorWorkspaceUrl(progress.id)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify of status change', err);
    }
};

const notifyOfCompletion = async (progressId) => {
    try {
        const progress = await loadProgress(progressId);
        if (!progress) return safeLog('skip completion: progress not found', { progressId });

        const studentName = fullName(progress.student) || 'the student';
        const taskTitle = progress.task?.title || 'the micro-internship';
        const shared = {
            studentName,
            taskTitle,
            progressPercent: Number(progress.progressPercent) || 0,
            hoursLogged: Number(progress.totalHoursLogged) || 0,
            performanceRating: progress.performanceRating,
            completionNote: progress.completionNote,
            outstandingWork: progress.closedWithOutstandingWork
        };

        const studentAddr = progress.student?.user?.email;
        if (studentAddr) {
            await safeSendEmail(
                studentAddr,
                internshipCompleted({
                    ...shared,
                    // The supervisor's 1-5 rating is not released to the student
                    // here — that is Module 10's job. Same rule the API applies.
                    performanceRating: null,
                    recipientName: fullName(progress.student) || 'there',
                    dashboardUrl: studentWorkspaceUrl(progress.id)
                })
            );
        }

        const compAddr = companyEmail(progress.company);
        if (compAddr) {
            await safeSendEmail(
                compAddr,
                internshipCompleted({
                    ...shared,
                    recipientName: progress.company?.companyName || 'there',
                    dashboardUrl: companyWorkspaceUrl(progress.id)
                })
            );
        }

        const mentor = await loadActiveMentor(progress.applicationId);
        const mentorAddr = mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                internshipCompleted({
                    ...shared,
                    recipientName: fullName(mentor) || 'there',
                    dashboardUrl: mentorWorkspaceUrl(progress.id)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify of completion', err);
    }
};

module.exports = {
    notifyStudentOfMilestone,
    notifyReviewersOfSubmission,
    notifyStudentOfReview,
    notifySupervisorsOfBlocker,
    notifyOfBlockerResolved,
    notifySupervisorsOfRisk,
    notifyOfProgressUpdate,
    notifyOfStatusChange,
    notifyOfCompletion
};
