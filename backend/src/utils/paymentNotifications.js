const sendEmail = require('./sendEmail');
const {
    paymentReceivedStudent,
    paymentReceiptCompany,
    paymentFailedCompany,
    paymentRefunded,
    payoutDetailsNeeded
} = require('./emailTemplates');
const { Payment, Student, Company, User } = require('../models');

// Payment emails. Best-effort — never throws, never blocks the API response —
// same contract as progressNotifications.js / feedbackNotifications.js. Log
// lines carry the payment id only: never amounts with card data, never
// account details.

const safeLog = (msg, err) => {
    console.warn(`[paymentNotifications] ${msg}`, err?.message || err);
};

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

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

const loadPayment = (paymentId) =>
    Payment.findByPk(paymentId, {
        include: [
            {
                model: Student,
                as: 'student',
                attributes: ['id', 'firstName', 'lastName'],
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            },
            {
                model: Company,
                as: 'company',
                attributes: ['id', 'companyName', 'contactEmail'],
                include: [{ model: User, as: 'user', attributes: ['email'] }]
            }
        ]
    });

// The account that owns the company, else its public contact address.
const companyEmail = (payment) => payment.company?.user?.email || payment.company?.contactEmail || null;
const studentEmail = (payment) => payment.student?.user?.email || null;

const companyPaymentsUrl = (payment) =>
    payment.progressId ? `${FRONTEND()}/company/progress/${payment.progressId}?tab=payments` : `${FRONTEND()}/company/payments`;

const notifyPaymentSucceeded = async (paymentId) => {
    try {
        const payment = await loadPayment(paymentId);
        if (!payment) return safeLog('skip succeeded: payment not found', { paymentId });

        await safeSendEmail(
            studentEmail(payment),
            paymentReceivedStudent({
                studentName: fullName(payment.student) || payment.studentName || 'there',
                payment,
                dashboardUrl: `${FRONTEND()}/student/payments`
            })
        );
        await safeSendEmail(
            companyEmail(payment),
            paymentReceiptCompany({
                recipientName: payment.company?.companyName || payment.companyName || 'there',
                payment,
                receiptUrl: `${FRONTEND()}/payments/receipt/${payment.id}`
            })
        );
    } catch (err) {
        safeLog('failed to notify payment success', err);
    }
};

const notifyPaymentFailed = async (paymentId) => {
    try {
        const payment = await loadPayment(paymentId);
        if (!payment) return safeLog('skip failed: payment not found', { paymentId });
        await safeSendEmail(
            companyEmail(payment),
            paymentFailedCompany({
                recipientName: payment.company?.companyName || payment.companyName || 'there',
                payment,
                dashboardUrl: companyPaymentsUrl(payment)
            })
        );
    } catch (err) {
        safeLog('failed to notify payment failure', err);
    }
};

const notifyPaymentRefunded = async (paymentId) => {
    try {
        const payment = await loadPayment(paymentId);
        if (!payment) return safeLog('skip refunded: payment not found', { paymentId });
        await safeSendEmail(
            studentEmail(payment),
            paymentRefunded({
                recipientName: fullName(payment.student) || payment.studentName || 'there',
                payment,
                audience: 'student',
                dashboardUrl: `${FRONTEND()}/student/payments`
            })
        );
        await safeSendEmail(
            companyEmail(payment),
            paymentRefunded({
                recipientName: payment.company?.companyName || payment.companyName || 'there',
                payment,
                audience: 'company',
                dashboardUrl: companyPaymentsUrl(payment)
            })
        );
    } catch (err) {
        safeLog('failed to notify refund', err);
    }
};

// A company tried to check out but the student has no payout method yet.
const notifyPayoutDetailsNeeded = async ({ studentId, companyName, taskTitle }) => {
    try {
        const student = await Student.findByPk(studentId, {
            attributes: ['id', 'firstName', 'lastName'],
            include: [{ model: User, as: 'user', attributes: ['email'] }]
        });
        if (!student) return safeLog('skip payout nudge: student not found', { studentId });
        await safeSendEmail(
            student.user?.email,
            payoutDetailsNeeded({
                studentName: fullName(student) || 'there',
                companyName: companyName || 'A company',
                taskTitle: taskTitle || 'your micro-internship',
                settingsUrl: `${FRONTEND()}/student/payments`
            })
        );
    } catch (err) {
        safeLog('failed to send payout nudge', err);
    }
};

module.exports = {
    notifyPaymentSucceeded,
    notifyPaymentFailed,
    notifyPaymentRefunded,
    notifyPayoutDetailsNeeded
};
