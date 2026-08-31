const sendEmail = require('./sendEmail');
const {
    mentorAssignmentRequested,
    mentorAssignmentAccepted,
    mentorAssignmentDeclined,
    mentorAssignmentCancelled,
    mentorNoteAdded,
    mentorVerificationDecision
} = require('./emailTemplates');
const {
    Mentor,
    MentorAssignment,
    MentorNote,
    Task,
    Student,
    Company,
    User
} = require('../models');

const safeLog = (msg, err) => {
    console.warn(`[mentorNotifications] ${msg}`, err?.message || err);
};

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Best-effort send — never throws, never blocks the API response.
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

// Loads an assignment with every party needed to address an email.
const loadAssignment = (assignmentId) =>
    MentorAssignment.findByPk(assignmentId, {
        include: [
            {
                model: Mentor,
                as: 'mentor',
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            },
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

const companyEmail = (company) => company?.contactEmail || company?.user?.email;

// ---------------------------------------------------------------------------

const notifyMentorOfAssignmentRequest = async (assignmentId) => {
    try {
        const a = await loadAssignment(assignmentId);
        if (!a) return safeLog('skip request: assignment not found', { assignmentId });

        const email = a.mentor?.user?.email;
        if (!email) return safeLog('skip request: mentor email not found', { assignmentId });

        await safeSendEmail(
            email,
            mentorAssignmentRequested({
                mentorName: fullName(a.mentor) || 'there',
                companyName: a.company?.companyName || 'A company',
                studentName: fullName(a.student) || 'a student',
                taskTitle: a.task?.title || 'a micro-internship',
                assignmentNote: a.assignmentNote,
                dashboardUrl: `${FRONTEND()}/mentor/students`
            })
        );
    } catch (err) {
        safeLog('failed to notify mentor of request', err);
    }
};

const notifyOfAssignmentAccepted = async (assignmentId) => {
    try {
        const a = await loadAssignment(assignmentId);
        if (!a) return safeLog('skip accepted: assignment not found', { assignmentId });

        const mentorName = fullName(a.mentor) || 'Your mentor';
        const studentName = fullName(a.student) || 'the student';
        const taskTitle = a.task?.title || 'the micro-internship';

        // The student gets told who is guiding them...
        const studentAddr = a.student?.user?.email;
        if (studentAddr) {
            await safeSendEmail(
                studentAddr,
                mentorAssignmentAccepted({
                    recipientName: fullName(a.student) || 'there',
                    mentorName,
                    studentName,
                    taskTitle,
                    dashboardUrl: `${FRONTEND()}/student/mentorship/${a.id}`
                })
            );
        }

        // ...and the company gets told the mentorship is live.
        const compAddr = companyEmail(a.company);
        if (compAddr) {
            await safeSendEmail(
                compAddr,
                mentorAssignmentAccepted({
                    recipientName: a.company?.companyName || 'there',
                    mentorName,
                    studentName,
                    taskTitle,
                    dashboardUrl: `${FRONTEND()}/company/mentors`
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify of acceptance', err);
    }
};

const notifyCompanyOfDecline = async (assignmentId, reason) => {
    try {
        const a = await loadAssignment(assignmentId);
        if (!a) return safeLog('skip decline: assignment not found', { assignmentId });

        const email = companyEmail(a.company);
        if (!email) return safeLog('skip decline: company email not found', { assignmentId });

        await safeSendEmail(
            email,
            mentorAssignmentDeclined({
                recipientName: a.company?.companyName || 'there',
                mentorName: fullName(a.mentor) || 'The mentor',
                taskTitle: a.task?.title || 'the micro-internship',
                reason,
                dashboardUrl: `${FRONTEND()}/company/mentors`
            })
        );
    } catch (err) {
        safeLog('failed to notify company of decline', err);
    }
};

const notifyOfAssignmentCancelled = async (assignmentId, reason) => {
    try {
        const a = await loadAssignment(assignmentId);
        if (!a) return safeLog('skip cancel: assignment not found', { assignmentId });

        const companyName = a.company?.companyName || 'The company';
        const taskTitle = a.task?.title || 'the micro-internship';

        const mentorAddr = a.mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                mentorAssignmentCancelled({
                    recipientName: fullName(a.mentor) || 'there',
                    companyName,
                    taskTitle,
                    reason
                })
            );
        }

        // Only tell the student if the mentorship had actually started.
        if (a.startedAt) {
            const studentAddr = a.student?.user?.email;
            if (studentAddr) {
                await safeSendEmail(
                    studentAddr,
                    mentorAssignmentCancelled({
                        recipientName: fullName(a.student) || 'there',
                        companyName,
                        taskTitle,
                        reason
                    })
                );
            }
        }
    } catch (err) {
        safeLog('failed to notify of cancellation', err);
    }
};

const notifyOfNewNote = async (assignmentId, noteId) => {
    try {
        const [a, note] = await Promise.all([
            loadAssignment(assignmentId),
            MentorNote.findByPk(noteId)
        ]);
        if (!a || !note) return safeLog('skip note: assignment or note not found', { assignmentId });

        // The note goes to the other party, never back to its author.
        const toStudent = note.authorRole === 'mentor';
        const recipient = toStudent ? a.student : a.mentor;
        const email = recipient?.user?.email;
        if (!email) return safeLog('skip note: recipient email not found', { assignmentId });

        const body = String(note.body || '');
        const preview = body.length > 180 ? `${body.slice(0, 180)}…` : body;

        await safeSendEmail(
            email,
            mentorNoteAdded({
                recipientName: fullName(recipient) || 'there',
                authorName: note.authorName || (toStudent ? 'Your mentor' : 'Your mentee'),
                taskTitle: a.task?.title || 'your micro-internship',
                preview,
                dashboardUrl: toStudent
                    ? `${FRONTEND()}/student/mentorship/${a.id}`
                    : `${FRONTEND()}/mentor/students/${a.id}`
            })
        );
    } catch (err) {
        safeLog('failed to notify of new note', err);
    }
};

const notifyMentorOfVerificationDecision = async (mentorId, status, note) => {
    try {
        const mentor = await Mentor.findByPk(mentorId, {
            include: [{ model: User, as: 'user', attributes: ['email'] }]
        });
        if (!mentor) return safeLog('skip verification: mentor not found', { mentorId });

        const email = mentor.user?.email;
        if (!email) return safeLog('skip verification: mentor email not found', { mentorId });

        await safeSendEmail(
            email,
            mentorVerificationDecision({
                mentorName: fullName(mentor) || 'there',
                status,
                note,
                dashboardUrl: `${FRONTEND()}/mentor/profile`
            })
        );
    } catch (err) {
        safeLog('failed to notify mentor of verification decision', err);
    }
};

module.exports = {
    notifyMentorOfAssignmentRequest,
    notifyOfAssignmentAccepted,
    notifyCompanyOfDecline,
    notifyOfAssignmentCancelled,
    notifyOfNewNote,
    notifyMentorOfVerificationDecision
};
