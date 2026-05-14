const sendEmail = require('./sendEmail');
const {
    getApplicationStatusChangeTemplate,
    getApplicationWithdrawnTemplate
} = require('./emailTemplates');
const { Application, Task, Student, Company, User } = require('../models');

const STATUS_SUBJECTS = {
    submitted: 'Application received',
    under_review: 'Your application is under review',
    shortlisted: "You've been shortlisted",
    interview_scheduled: 'Interview scheduled',
    accepted: 'Congratulations — your application was accepted',
    rejected: 'Update on your application',
    withdrawn: 'Application withdrawn'
};

const safeLog = (msg, err) => {
    console.warn(`[applicationNotifications] ${msg}`, err?.message || err);
};

// Fire-and-forget — never blocks the API response, never rethrows.
const notifyStudentOfStatusChange = async (applicationId, fromStatus, toStatus, reason) => {
    try {
        const application = await Application.findByPk(applicationId, {
            include: [
                {
                    model: Student,
                    as: 'student',
                    include: [{ model: User, as: 'user', attributes: ['email'] }]
                },
                {
                    model: Task,
                    as: 'task',
                    include: [{ model: Company, as: 'company', attributes: ['companyName'] }]
                }
            ]
        });

        const email = application?.student?.user?.email;
        if (!email) {
            return safeLog('skip: student email not found', { applicationId });
        }

        const studentName = [application.student.firstName, application.student.lastName]
            .filter(Boolean)
            .join(' ');
        const companyName = application.task?.company?.companyName || 'the company';
        const taskTitle = application.task?.title || 'a task';
        const applicationUrl = `${process.env.FRONTEND_URL}/student/applications/${application.id}`;

        const html = getApplicationStatusChangeTemplate({
            studentName,
            companyName,
            taskTitle,
            fromStatus,
            toStatus,
            reason,
            applicationUrl
        });

        await sendEmail({
            email,
            subject: STATUS_SUBJECTS[toStatus] || 'Application update',
            html
        });
    } catch (err) {
        safeLog('failed to email student', err);
    }
};

const notifyCompanyOfWithdrawal = async (applicationId, reason) => {
    try {
        const application = await Application.findByPk(applicationId, {
            include: [
                { model: Student, as: 'student', attributes: ['firstName', 'lastName'] },
                {
                    model: Task,
                    as: 'task',
                    include: [
                        {
                            model: Company,
                            as: 'company',
                            attributes: ['id', 'companyName', 'contactEmail', 'userId'],
                            include: [{ model: User, as: 'user', attributes: ['email'] }]
                        }
                    ]
                }
            ]
        });

        const company = application?.task?.company;
        const email = company?.contactEmail || company?.user?.email;
        if (!email) {
            return safeLog('skip: company email not found', { applicationId });
        }

        const companyName = company.companyName || 'there';
        const studentName = [application.student?.firstName, application.student?.lastName]
            .filter(Boolean)
            .join(' ');
        const taskTitle = application.task?.title || 'a task';
        const candidatesUrl = `${process.env.FRONTEND_URL}/company/candidates?taskId=${application.task?.id}`;

        const html = getApplicationWithdrawnTemplate({
            companyName,
            studentName,
            taskTitle,
            reason,
            candidatesUrl
        });

        await sendEmail({
            email,
            subject: `${studentName || 'A candidate'} withdrew from "${taskTitle}"`,
            html
        });
    } catch (err) {
        safeLog('failed to email company', err);
    }
};

module.exports = {
    notifyStudentOfStatusChange,
    notifyCompanyOfWithdrawal
};
