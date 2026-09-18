const sendEmail = require('./sendEmail');
const { feedbackReceived, feedbackResponded } = require('./emailTemplates');
const { Feedback, Student, Company, Task, User } = require('../models');

const safeLog = (msg, err) => {
    console.warn(`[feedbackNotifications] ${msg}`, err?.message || err);
};

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Best-effort send — never throws, never blocks the API response. Same
// contract as progressNotifications.js / evaluationNotifications.js.
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

const RESPONSE_EXCERPT = 500;

const loadFeedback = (feedbackId) =>
    Feedback.findByPk(feedbackId, {
        include: [
            {
                model: Student,
                as: 'student',
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            },
            { model: Company, as: 'company', attributes: ['id', 'companyName', 'contactEmail'] },
            { model: Task, as: 'task', attributes: ['id', 'title'] },
            { model: User, as: 'author', attributes: ['id', 'email'] }
        ]
    });

// Where the author reads the record again: the internship workspace, or the
// candidate page's interview tab.
const authorUrl = (feedback) => {
    if (feedback.context === 'interview') {
        return `${FRONTEND()}/company/candidates/${feedback.applicationId}?tab=interview`;
    }
    const base = feedback.authorRole === 'mentor' ? 'mentor' : 'company';
    return `${FRONTEND()}/${base}/progress/${feedback.progressId}`;
};

// A company or mentor left feedback: tell the student where to read it.
const notifyFeedbackReceived = async (feedbackId) => {
    try {
        const feedback = await loadFeedback(feedbackId);
        if (!feedback) return safeLog('skip received: feedback not found', { feedbackId });

        const email = feedback.student?.user?.email;
        if (!email) return safeLog('skip received: student email not found', { feedbackId });

        await safeSendEmail(
            email,
            feedbackReceived({
                studentName: fullName(feedback.student) || 'there',
                authorName: feedback.authorName || 'Your supervisor',
                authorRole: feedback.authorRole,
                taskTitle: feedback.task?.title || 'your micro-internship',
                context: feedback.context,
                overallRating: feedback.overallRating,
                dashboardUrl: `${FRONTEND()}/student/feedback`
            })
        );
    } catch (err) {
        safeLog('failed to notify student of feedback', err);
    }
};

// The student acknowledged with a reply: tell the author. The account that
// wrote it is preferred; a company falls back to its contact address.
const notifyFeedbackResponded = async (feedbackId) => {
    try {
        const feedback = await loadFeedback(feedbackId);
        if (!feedback) return safeLog('skip responded: feedback not found', { feedbackId });
        if (!feedback.studentResponse) return;

        const email =
            feedback.author?.email ||
            (feedback.authorRole === 'company' ? feedback.company?.contactEmail : null);
        if (!email) return safeLog('skip responded: author email not found', { feedbackId });

        const response = String(feedback.studentResponse);
        await safeSendEmail(
            email,
            feedbackResponded({
                authorName: feedback.authorName || 'there',
                studentName: fullName(feedback.student) || 'The student',
                taskTitle: feedback.task?.title || 'the micro-internship',
                responseExcerpt:
                    response.length > RESPONSE_EXCERPT ? `${response.slice(0, RESPONSE_EXCERPT)}…` : response,
                dashboardUrl: authorUrl(feedback)
            })
        );
    } catch (err) {
        safeLog('failed to notify author of response', err);
    }
};

module.exports = {
    notifyFeedbackReceived,
    notifyFeedbackResponded
};
