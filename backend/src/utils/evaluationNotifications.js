const { Op } = require('sequelize');
const sendEmail = require('./sendEmail');
const { evaluationReady, evaluationFinalized } = require('./emailTemplates');
const {
    InternshipEvaluation,
    MentorAssignment,
    Mentor,
    Student,
    Company,
    Task,
    User,
    sequelize
} = require('../models');

const safeLog = (msg, err) => {
    console.warn(`[evaluationNotifications] ${msg}`, err?.message || err);
};

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Best-effort send — never throws, never blocks the API response. Same
// contract as progressNotifications.js so a dead SMTP host cannot 500 a request.
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

const loadEvaluation = (evaluationId) =>
    InternshipEvaluation.findByPk(evaluationId, {
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

// The mentor who guided the work — active, or finished (the usual case once
// an internship is complete). Resolved from mentor_assignments, never from the
// cached mentorId, exactly like Module 8.
const loadEvaluatingMentor = async (applicationId) => {
    const assignment = await MentorAssignment.findOne({
        where: { applicationId, status: { [Op.in]: ['active', 'completed'] } },
        order: [
            [sequelize.literal("CASE WHEN `MentorAssignment`.`status` = 'active' THEN 0 ELSE 1 END"), 'ASC'],
            ['createdAt', 'DESC']
        ],
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
const verifyUrl = (code) => `${FRONTEND()}/verify/${code}`;

// ---------------------------------------------------------------------------

// A draft was generated automatically on completion: the company and the
// mentor are asked to review it. The student is not told — nothing is theirs
// to see until a reviewer finalizes.
const notifyEvaluationReady = async (evaluationId) => {
    try {
        const evaluation = await loadEvaluation(evaluationId);
        if (!evaluation) return safeLog('skip ready: evaluation not found', { evaluationId });

        const shared = {
            studentName: fullName(evaluation.student) || 'the student',
            taskTitle: evaluation.task?.title || 'the micro-internship',
            autoScore: evaluation.autoScore != null ? Number(evaluation.autoScore) : null,
            grade: evaluation.grade,
            aiGenerated: evaluation.aiGenerated
        };

        const compAddr = companyEmail(evaluation.company);
        if (compAddr) {
            await safeSendEmail(
                compAddr,
                evaluationReady({
                    ...shared,
                    recipientName: evaluation.company?.companyName || 'there',
                    dashboardUrl: companyWorkspaceUrl(evaluation.progressId)
                })
            );
        }

        const mentor = await loadEvaluatingMentor(evaluation.applicationId);
        const mentorAddr = mentor?.user?.email;
        if (mentorAddr) {
            await safeSendEmail(
                mentorAddr,
                evaluationReady({
                    ...shared,
                    recipientName: fullName(mentor) || 'there',
                    dashboardUrl: mentorWorkspaceUrl(evaluation.progressId)
                })
            );
        }
    } catch (err) {
        safeLog('failed to notify evaluation ready', err);
    }
};

// Released: the student gets their grade, score and verification code.
const notifyStudentOfEvaluation = async (evaluationId) => {
    try {
        const evaluation = await loadEvaluation(evaluationId);
        if (!evaluation) return safeLog('skip finalized: evaluation not found', { evaluationId });

        const email = evaluation.student?.user?.email;
        if (!email) return safeLog('skip finalized: student email not found', { evaluationId });

        await safeSendEmail(
            email,
            evaluationFinalized({
                studentName: fullName(evaluation.student) || 'there',
                taskTitle: evaluation.task?.title || 'your micro-internship',
                grade: evaluation.grade,
                finalScore: evaluation.finalScore != null ? Number(evaluation.finalScore) : null,
                finalizedByName: evaluation.finalizedByName,
                verificationCode: evaluation.verificationCode,
                verifyUrl: evaluation.verificationCode ? verifyUrl(evaluation.verificationCode) : null,
                dashboardUrl: studentWorkspaceUrl(evaluation.progressId)
            })
        );
    } catch (err) {
        safeLog('failed to notify student of evaluation', err);
    }
};

module.exports = {
    notifyEvaluationReady,
    notifyStudentOfEvaluation
};
