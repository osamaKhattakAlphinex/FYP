const { fn, col } = require('sequelize');
const {
    sequelize,
    Student,
    Company,
    Task,
    Application,
    InternshipProgress,
    Payment,
    PaymentEvent,
    StudentPayoutMethod
} = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const { resolveActor } = require('./progressController');
const PS = require('../services/paymentService');
const {
    getProvider,
    providerByName,
    sandboxProvider,
    stripeProvider
} = require('../services/payments');
const {
    notifyPaymentSucceeded,
    notifyPaymentFailed,
    notifyPaymentRefunded,
    notifyPayoutDetailsNeeded
} = require('../utils/paymentNotifications');

// Module 12 — payments from the company that owns an internship to the
// student doing it. Authorisation is on the Payment model (canBeViewedBy /
// canBeManagedBy / canBeRefundedBy); every status change goes through
// paymentService.transition(), which writes the audit trail.

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';
const isId = (v) => /^\d+$/.test(String(v || ''));
const fullName = (p) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : null);

// Fields of the sandbox card form. Removed from req.body as soon as they have
// been read, so nothing further down the stack (error handler, loggers) can
// ever see them.
const CARD_FIELDS = ['cardNumber', 'expMonth', 'expYear', 'cvc', 'cardholderName'];

const MENTOR_REFUSAL = 'Compensation is private to the company and the student';
const SANDBOX_DISABLED = 'Sandbox payments are disabled on this server, and no live payment gateway is configured';

const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page || 1, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || 20, 10) || 20));
    return { page, limit, offset: (page - 1) * limit };
};

const paginationPayload = (page, limit, count) => {
    const totalPages = Math.ceil(count / limit) || 0;
    return {
        currentPage: page,
        totalPages,
        totalRecords: count,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit
    };
};

const permissionsFor = (payment, actor) => ({
    canCheckout: payment.canBeManagedBy(actor) && payment.isOpen(),
    canConfirmSandbox:
        payment.canBeManagedBy(actor) && payment.status === 'processing' && payment.provider === sandboxProvider.NAME,
    canCancel: payment.canBeManagedBy(actor) && payment.isOpen(),
    canRefund: payment.canBeRefundedBy(actor),
    canViewReceipt: PS.RECEIPT_STATUSES.includes(payment.status)
});

const shape = (payment, actor) => ({
    ...payment.toJSONFor(actor),
    permissions: permissionsFor(payment, actor)
});

// Who may see the money side of one internship: its company, its student and
// an admin. Mentors are refused outright (MENTOR_REFUSAL).
const canViewInternshipPayments = (actor, progress) => {
    if (!actor) return false;
    if (actor.role === 'admin') return true;
    if (actor.role === 'company') return actor.companyId != null && String(actor.companyId) === String(progress.companyId);
    if (actor.role === 'student') return actor.studentId != null && String(actor.studentId) === String(progress.studentId);
    return false;
};

// The internship plus what the money rules read from it. With a transaction,
// the progress row is locked first so two concurrent "create" requests for the
// same internship are serialised (one open payment per internship).
const loadInternship = async (progressId, { transaction } = {}) => {
    if (!isId(progressId)) return null;
    const progress = await InternshipProgress.findByPk(progressId, {
        transaction,
        ...(transaction ? { lock: transaction.LOCK.UPDATE } : {})
    });
    if (!progress) return null;
    const [task, application, student, company] = await Promise.all([
        Task.findByPk(progress.taskId, {
            attributes: ['id', 'title', 'budgetType', 'budgetAmountMin', 'budgetAmountMax', 'budgetCurrency'],
            transaction
        }),
        Application.findByPk(progress.applicationId, { attributes: ['id', 'proposedRate'], transaction }),
        Student.findByPk(progress.studentId, { attributes: ['id', 'firstName', 'lastName'], transaction }),
        Company.findByPk(progress.companyId, { attributes: ['id', 'companyName'], transaction })
    ]);
    return { progress, task, application, student, company };
};

// One payment, authorised for viewing. With a transaction it is row-locked.
const loadPaymentForActor = async (id, user, { transaction, includeEvents = false } = {}) => {
    if (!isId(id)) return { error: new ErrorResponse('Payment not found', 404) };
    const payment = await Payment.findByPk(id, {
        transaction,
        ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
        ...(includeEvents ? { include: [{ model: PaymentEvent, as: 'events' }] } : {})
    });
    if (!payment) return { error: new ErrorResponse('Payment not found', 404) };
    const actor = await resolveActor(user);
    if (!payment.canBeViewedBy(actor)) {
        return { error: new ErrorResponse('Not authorized to access this payment', 403) };
    }
    return { payment, actor };
};

const reload = (id, actor) =>
    Payment.findByPk(id, { include: [{ model: PaymentEvent, as: 'events' }] }).then((p) => shape(p, actor));

const rollbackQuietly = async (t) => {
    try { await t.rollback(); } catch (e) { /* already finished */ }
};

// ---------------------------------------------------------------------------
// Stripe webhook (public, signature-verified)
// ---------------------------------------------------------------------------

// Stripe event type → the status it moves a payment to.
const WEBHOOK_TARGETS = {
    'checkout.session.completed': 'succeeded',
    'checkout.session.async_payment_succeeded': 'succeeded',
    'checkout.session.async_payment_failed': 'failed',
    'checkout.session.expired': 'cancelled'
};

// @desc    Receive Stripe Checkout events
// @route   POST /api/payments/webhooks/stripe
// @access  Public — authenticated by the Stripe-Signature HMAC
exports.stripeWebhook = async (req, res, next) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return next(new ErrorResponse('Stripe webhooks are not configured on this server', 400));

    const verified = stripeProvider.verifyWebhook(req.rawBody, req.headers['stripe-signature'], secret);
    if (!verified.ok) return next(new ErrorResponse(`Webhook rejected: ${verified.reason}`, 400));

    const event = verified.event || {};
    const target = WEBHOOK_TARGETS[event.type];
    // Anything we do not act on is acknowledged, so Stripe stops retrying it.
    if (!target) return res.status(200).json({ received: true, ignored: 'event type not handled' });
    if (!event.id) return next(new ErrorResponse('Webhook rejected: event has no id', 400));

    // Replays (Stripe retries, or an attacker re-sending a captured request
    // within the tolerance window) are recognised by the event id.
    let t;
    try {
        if (await PaymentEvent.findOne({ where: { providerEventId: String(event.id) }, attributes: ['id'] })) {
            return res.status(200).json({ received: true, duplicate: true });
        }

        const session = (event.data && event.data.object) || {};
        const metaId = session.metadata && session.metadata.paymentId;

        t = await sequelize.transaction();
        const lock = { transaction: t, lock: t.LOCK.UPDATE };
        let payment = isId(metaId) ? await Payment.findByPk(metaId, lock) : null;
        if (!payment && session.client_reference_id) {
            payment = await Payment.findOne({ where: { reference: String(session.client_reference_id) }, ...lock });
        }

        // The session must be the one this server created for this payment.
        if (!payment || payment.provider !== stripeProvider.NAME || payment.providerPaymentId !== session.id) {
            await rollbackQuietly(t);
            return res.status(200).json({ received: true, ignored: 'no matching payment' });
        }

        if (target === 'succeeded') {
            if (session.payment_status !== 'paid') {
                // e.g. a bank debit still clearing: wait for async_payment_*.
                await rollbackQuietly(t);
                return res.status(200).json({ received: true, ignored: 'not paid yet' });
            }
            const expectedMinor = stripeProvider.toMinorUnits(payment.amount, payment.currency);
            const sameAmount =
                Number(session.amount_total) === expectedMinor &&
                String(session.currency || '').toUpperCase() === payment.currency;
            if (!sameAmount) {
                console.warn(`[payments] webhook amount mismatch for payment ${payment.id}; not applied`);
                await rollbackQuietly(t);
                return res.status(200).json({ received: true, ignored: 'amount mismatch' });
            }
        }

        if (!Payment.canTransition(payment.status, target)) {
            // Already settled some other way (e.g. cancelled, then completed late).
            await rollbackQuietly(t);
            return res.status(200).json({ received: true, ignored: `payment is ${payment.status}` });
        }

        const sessionId = session.id;
        if (target === 'succeeded' && session.payment_intent) {
            // Refunds are made against the PaymentIntent.
            payment.providerPaymentId = String(session.payment_intent);
        }
        if (target === 'failed') payment.failureReason = 'The payment could not be completed by the gateway.';
        await PS.transition(payment, target, {
            source: 'webhook',
            note: `Stripe ${event.type} (session ${sessionId})`,
            providerEventId: String(event.id),
            transaction: t
        });
        await t.commit();

        if (target === 'succeeded') notifyPaymentSucceeded(payment.id);
        if (target === 'failed') notifyPaymentFailed(payment.id);

        res.status(200).json({ received: true, status: payment.status });
    } catch (error) {
        if (t) await rollbackQuietly(t);
        // Two deliveries of the same event racing: the unique index on
        // providerEventId lets exactly one through.
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(200).json({ received: true, duplicate: true });
        }
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Role lists
// ---------------------------------------------------------------------------

const listPayments = async (where, req, actor) => {
    const { page, limit, offset } = paginate(req.query);
    const { rows, count } = await Payment.findAndCountAll({
        where,
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        offset,
        limit
    });
    return { records: rows.map((p) => shape(p, actor)), pagination: paginationPayload(page, limit, count) };
};

// Summaries are over all of the actor's payments, not just the current page.
const allFor = (where) =>
    Payment.findAll({
        where,
        attributes: ['id', 'kind', 'status', 'amount', 'platformFee', 'netAmount', 'currency']
    });

const statusFilter = (query) => (Payment.STATUSES.includes(query.status) ? { status: query.status } : {});

// @desc    The logged-in student's payments and earnings
// @route   GET /api/payments/student
// @access  Private (student)
exports.getStudentPayments = async (req, res, next) => {
    try {
        const actor = await resolveActor(req.user);
        if (actor.studentId == null) return next(new ErrorResponse('Student profile not found', 404));
        const where = { studentId: actor.studentId };
        const [list, all, payout] = await Promise.all([
            listPayments({ ...where, ...statusFilter(req.query) }, req, actor),
            allFor(where),
            StudentPayoutMethod.findOne({ where })
        ]);
        res.status(200).json({
            success: true,
            data: { ...list, summary: PS.summarizeForStudent(all), payoutMethod: payout ? payout.toJSON() : null }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Payments the logged-in company has made
// @route   GET /api/payments/company
// @access  Private (company)
exports.getCompanyPayments = async (req, res, next) => {
    try {
        const actor = await resolveActor(req.user);
        if (actor.companyId == null) return next(new ErrorResponse('Company profile not found', 404));
        const where = { companyId: actor.companyId };
        const [list, all] = await Promise.all([
            listPayments({ ...where, ...statusFilter(req.query) }, req, actor),
            allFor(where)
        ]);
        res.status(200).json({ success: true, data: { ...list, summary: PS.summarizeForCompany(all) } });
    } catch (error) {
        next(error);
    }
};

// @desc    Every payment on the platform (?status, ?provider, ?companyId, ?studentId)
// @route   GET /api/payments/admin
// @access  Private (admin)
exports.getAdminPayments = async (req, res, next) => {
    try {
        const actor = await resolveActor(req.user);
        const where = { ...statusFilter(req.query) };
        if (['sandbox', 'stripe'].includes(req.query.provider)) where.provider = req.query.provider;
        if (isId(req.query.companyId)) where.companyId = req.query.companyId;
        if (isId(req.query.studentId)) where.studentId = req.query.studentId;
        const [list, all] = await Promise.all([listPayments(where, req, actor), allFor({})]);
        const byProvider = {};
        (await Payment.findAll({
            attributes: ['provider', [fn('COUNT', col('id')), 'count']],
            group: ['provider'],
            raw: true
        })).forEach((g) => {
            // Payments never checked out have no provider yet.
            byProvider[g.provider || 'none'] = Number(g.count) || 0;
        });
        const company = PS.summarizeForCompany(all);
        res.status(200).json({
            success: true,
            data: {
                ...list,
                summary: {
                    // Platform view: gross volume through the gateway and the fees earned.
                    currency: company.currency,
                    volume: company.totalPaid,
                    fees: company.totalFees,
                    refunded: company.refunded,
                    open: company.open,
                    byStatus: company.byStatus,
                    byProvider,
                    byCurrency: company.byCurrency.map((r) => ({
                        currency: r.currency, volume: r.paid, fees: r.fees, refunded: r.refunded, count: r.count
                    })),
                    activeProvider: getProvider().NAME,
                    sandboxEnabled: sandboxProvider.isEnabled()
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// Student payout method
// ---------------------------------------------------------------------------

const studentActor = async (user) => {
    const actor = await resolveActor(user);
    return actor.studentId == null ? null : actor;
};

// @desc    The student's payout method (masked)
// @route   GET /api/payments/payout-method
// @access  Private (student)
exports.getPayoutMethod = async (req, res, next) => {
    try {
        const actor = await studentActor(req.user);
        if (!actor) return next(new ErrorResponse('Student profile not found', 404));
        const method = await StudentPayoutMethod.findOne({ where: { studentId: actor.studentId } });
        res.status(200).json({ success: true, data: method ? method.toJSON() : null });
    } catch (error) {
        next(error);
    }
};

// @desc    Add or replace the payout method. The full account is discarded.
// @route   PUT /api/payments/payout-method
// @access  Private (student)
exports.savePayoutMethod = async (req, res, next) => {
    try {
        const actor = await studentActor(req.user);
        if (!actor) return next(new ErrorResponse('Student profile not found', 404));

        const { errors, value } = StudentPayoutMethod.validateInput(req.body);
        // The raw account never goes further than this line.
        delete req.body.account;
        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: errors[0].message, errors });
        }

        const existing = await StudentPayoutMethod.findOne({ where: { studentId: actor.studentId } });
        const saved = existing
            ? await existing.update(value)
            : await StudentPayoutMethod.create({ ...value, studentId: actor.studentId });
        res.status(existing ? 200 : 201).json({
            success: true,
            message: 'Payout details saved',
            data: saved.toJSON()
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Remove the payout method
// @route   DELETE /api/payments/payout-method
// @access  Private (student)
exports.deletePayoutMethod = async (req, res, next) => {
    try {
        const actor = await studentActor(req.user);
        if (!actor) return next(new ErrorResponse('Student profile not found', 404));
        await StudentPayoutMethod.destroy({ where: { studentId: actor.studentId } });
        res.status(200).json({ success: true, message: 'Payout details removed', data: null });
    } catch (error) {
        next(error);
    }
};

// ---------------------------------------------------------------------------
// One internship's payments
// ---------------------------------------------------------------------------

// @desc    Payments and compensation of one internship
// @route   GET /api/payments/progress/:progressId
// @access  Private (owning company | the student | admin; mentors refused)
exports.getInternshipPayments = async (req, res, next) => {
    try {
        const ctx = await loadInternship(req.params.progressId);
        if (!ctx) return next(new ErrorResponse('Progress record not found', 404));
        const actor = await resolveActor(req.user);
        if (actor.role === 'mentor') return next(new ErrorResponse(MENTOR_REFUSAL, 403));
        if (!canViewInternshipPayments(actor, ctx.progress)) {
            return next(new ErrorResponse('Not authorized to view payments for this internship', 403));
        }

        const [payments, payout] = await Promise.all([
            Payment.findAll({
                where: { progressId: ctx.progress.id },
                order: [['createdAt', 'DESC'], ['id', 'DESC']]
            }),
            StudentPayoutMethod.findOne({ where: { studentId: ctx.progress.studentId }, attributes: ['id', 'method'] })
        ]);

        const isOwner = actor.role === 'company' && String(actor.companyId) === String(ctx.progress.companyId);
        const hasOpenPayment = payments.some((p) => p.isOpen());
        res.status(200).json({
            success: true,
            data: {
                progressId: String(ctx.progress.id),
                progressStatus: ctx.progress.status,
                studentName: fullName(ctx.student),
                companyName: ctx.company ? ctx.company.companyName : null,
                taskTitle: ctx.task ? ctx.task.title : null,
                payments: payments.map((p) => shape(p, actor)),
                compensation: PS.compensationSummary({
                    task: ctx.task,
                    application: ctx.application,
                    progress: ctx.progress,
                    payments,
                    feePercent: PS.platformFeePercent()
                }),
                payoutMethodOnFile: !!payout,
                hasOpenPayment,
                provider: getProvider().NAME,
                permissions: {
                    canPay: isOwner && PS.isPaidTask(ctx.task) && ctx.progress.status !== 'not_started',
                    canRefund: isOwner || actor.role === 'admin'
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a pending payment to the student
// @route   POST /api/payments/progress/:progressId
// @access  Private (owning company)
exports.createPayment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const ctx = await loadInternship(req.params.progressId, { transaction: t });
        if (!ctx) { await rollbackQuietly(t); return next(new ErrorResponse('Progress record not found', 404)); }
        const { progress, task, application, student, company } = ctx;

        const actor = await resolveActor(req.user);
        if (actor.role !== 'company' || String(actor.companyId) !== String(progress.companyId)) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Only the company that owns this internship can pay the student', 403));
        }
        if (!PS.isPaidTask(task)) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('This task is unpaid', 400));
        }
        if (progress.status === 'not_started') {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Payments open once the internship has started', 400));
        }
        const currency = PS.currencyOf(task);
        if (!currency) {
            await rollbackQuietly(t);
            return next(new ErrorResponse("The task's currency is not a valid 3-letter code", 400));
        }

        const existing = await Payment.findAll({
            where: { progressId: progress.id },
            attributes: ['id', 'kind', 'status', 'amount'],
            transaction: t
        });
        if (existing.some((p) => Payment.OPEN_STATUSES.includes(p.status))) {
            await rollbackQuietly(t);
            return next(new ErrorResponse(
                'This internship already has a payment in progress. Complete or cancel it first.', 409
            ));
        }

        const amount = Number(req.body.amount);
        const kind = req.body.kind || 'stipend';
        const amountProblem = PS.amountError(req.body.amount, currency);
        if (amountProblem) {
            await rollbackQuietly(t);
            return next(new ErrorResponse(amountProblem, 400));
        }

        const { agreedAmount } = PS.suggestCompensation({ task, application, progress });
        const capProblem = PS.stipendCapError({
            kind, amount, agreedAmount, committed: PS.committedStipend(existing), currency
        });
        if (capProblem) {
            await rollbackQuietly(t);
            return next(new ErrorResponse(capProblem, 400));
        }

        const feePercent = PS.platformFeePercent();
        const { platformFee, netAmount } = Payment.computeFee(amount, feePercent);

        // A 40-bit reference collides essentially never; check anyway.
        let reference = Payment.generateReference();
        for (let i = 0; i < 3 && (await Payment.count({ where: { reference }, transaction: t })) > 0; i += 1) {
            reference = Payment.generateReference();
        }

        const payment = await Payment.create({
            reference,
            progressId: progress.id,
            applicationId: progress.applicationId,
            taskId: progress.taskId,
            studentId: progress.studentId,
            companyId: progress.companyId,
            studentName: fullName(student),
            companyName: company ? company.companyName : null,
            taskTitle: task ? task.title : null,
            kind,
            description: req.body.description ? String(req.body.description).trim() : null,
            amount,
            currency,
            platformFee,
            netAmount,
            feePercent,
            status: 'pending',
            initiatedByUserId: req.user.id
        }, { transaction: t });
        await PS.recordCreation(payment, { actor, transaction: t });
        await t.commit();

        res.status(201).json({
            success: true,
            message: 'Payment created — continue to checkout to pay it',
            data: await reload(payment.id, actor)
        });
    } catch (error) {
        await rollbackQuietly(t);
        next(error);
    }
};

// ---------------------------------------------------------------------------
// One payment
// ---------------------------------------------------------------------------

// @desc    One payment with its audit trail
// @route   GET /api/payments/:id
// @access  Private (owning company | the student | admin)
exports.getPayment = async (req, res, next) => {
    try {
        const { payment, actor, error } = await loadPaymentForActor(req.params.id, req.user, { includeEvents: true });
        if (error) return next(error);
        res.status(200).json({ success: true, data: shape(payment, actor) });
    } catch (error) {
        next(error);
    }
};

// @desc    Receipt of a payment that went through
// @route   GET /api/payments/:id/receipt
// @access  Private (owning company | the student | admin)
exports.getReceipt = async (req, res, next) => {
    try {
        const { payment, error } = await loadPaymentForActor(req.params.id, req.user);
        if (error) return next(error);
        if (!PS.RECEIPT_STATUSES.includes(payment.status)) {
            return next(new ErrorResponse('A receipt is available once the payment has succeeded', 409));
        }
        res.status(200).json({ success: true, data: PS.buildReceipt(payment) });
    } catch (error) {
        next(error);
    }
};

// @desc    Start (or resume) the hosted checkout
// @route   POST /api/payments/:id/checkout
// @access  Private (owning company)
exports.checkout = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { payment, actor, error } = await loadPaymentForActor(req.params.id, req.user, { transaction: t });
        if (error) { await rollbackQuietly(t); return next(error); }
        if (!payment.canBeManagedBy(actor)) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Only the paying company can check out', 403));
        }

        // Idempotent: a second click (or a return to the page) resumes the
        // same checkout instead of opening another one.
        if (payment.status === 'processing' && payment.checkoutUrl) {
            await rollbackQuietly(t);
            return res.status(200).json({
                success: true,
                data: { checkoutUrl: payment.checkoutUrl, provider: payment.provider, payment: shape(payment, actor) }
            });
        }
        if (payment.status !== 'pending') {
            await rollbackQuietly(t);
            return next(new ErrorResponse(`A ${payment.status} payment cannot be checked out`, 409));
        }

        const payout = await StudentPayoutMethod.findOne({
            where: { studentId: payment.studentId },
            attributes: ['id'],
            transaction: t
        });
        if (!payout) {
            await rollbackQuietly(t);
            notifyPayoutDetailsNeeded({
                studentId: payment.studentId,
                companyName: payment.companyName,
                taskTitle: payment.taskTitle
            });
            return next(new ErrorResponse(
                'The student has not added payout details yet. We have emailed them a reminder.', 400
            ));
        }

        const provider = getProvider();
        if (provider.NAME === sandboxProvider.NAME && !sandboxProvider.isEnabled()) {
            await rollbackQuietly(t);
            return next(new ErrorResponse(SANDBOX_DISABLED, 503));
        }

        const back = payment.progressId
            ? `${FRONTEND()}/company/progress/${payment.progressId}?tab=payments`
            : `${FRONTEND()}/company/payments`;
        const joiner = back.includes('?') ? '&' : '?';
        const session = await provider.createCheckout(payment, {
            successUrl: `${back}${joiner}checkout=success`,
            cancelUrl: `${back}${joiner}checkout=cancelled`
        });

        payment.provider = provider.NAME;
        payment.providerPaymentId = session.providerPaymentId;
        payment.checkoutUrl = session.checkoutUrl;
        await PS.transition(payment, 'processing', {
            actor,
            note: `Checkout opened with ${provider.NAME}`,
            transaction: t
        });
        await t.commit();

        res.status(200).json({
            success: true,
            data: { checkoutUrl: payment.checkoutUrl, provider: payment.provider, payment: shape(payment, actor) }
        });
    } catch (error) {
        await rollbackQuietly(t);
        next(error);
    }
};

// @desc    Pay on the sandbox hosted checkout with a (test) card
// @route   POST /api/payments/:id/sandbox/confirm
// @access  Private (owning company; sandbox payments only)
exports.confirmSandboxPayment = async (req, res, next) => {
    // Read the card, then strip it from the request before anything else runs.
    const cardInput = {};
    CARD_FIELDS.forEach((k) => {
        cardInput[k] = req.body ? req.body[k] : undefined;
        if (req.body) delete req.body[k];
    });

    const t = await sequelize.transaction();
    try {
        const { payment, actor, error } = await loadPaymentForActor(req.params.id, req.user, { transaction: t });
        if (error) { await rollbackQuietly(t); return next(error); }
        if (!payment.canBeManagedBy(actor)) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Only the paying company can pay this', 403));
        }
        if (payment.provider !== sandboxProvider.NAME) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('This payment is not a sandbox payment', 400));
        }
        if (!sandboxProvider.isEnabled()) {
            await rollbackQuietly(t);
            return next(new ErrorResponse(SANDBOX_DISABLED, 503));
        }
        if (payment.status !== 'processing') {
            await rollbackQuietly(t);
            return next(new ErrorResponse(`This payment is ${payment.status} and cannot be paid`, 409));
        }

        // Invalid card data is a 400 that leaves the payment exactly as it
        // was, so the company can correct a typo and try again.
        const result = sandboxProvider.validateCard(cardInput);
        if (!result.ok) {
            await rollbackQuietly(t);
            return res.status(400).json({ success: false, message: result.errors[0].message, errors: result.errors });
        }

        payment.cardBrand = result.card.brand;
        payment.cardLast4 = result.card.last4;
        if (result.outcome === 'succeeded') {
            await PS.transition(payment, 'succeeded', { actor, note: 'Sandbox card charged', transaction: t });
        } else {
            payment.failureReason = result.reason;
            await PS.transition(payment, 'failed', { actor, note: result.reason, transaction: t });
        }
        await t.commit();

        if (payment.status === 'succeeded') notifyPaymentSucceeded(payment.id);
        else notifyPaymentFailed(payment.id);

        res.status(200).json({
            success: true,
            message: payment.status === 'succeeded' ? 'Payment successful' : `Payment failed: ${payment.failureReason}`,
            data: await reload(payment.id, actor)
        });
    } catch (error) {
        await rollbackQuietly(t);
        next(error);
    }
};

// @desc    Cancel an open payment
// @route   POST /api/payments/:id/cancel
// @access  Private (owning company)
exports.cancelPayment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { payment, actor, error } = await loadPaymentForActor(req.params.id, req.user, { transaction: t });
        if (error) { await rollbackQuietly(t); return next(error); }
        if (!payment.canBeManagedBy(actor)) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Only the paying company can cancel this payment', 403));
        }
        if (!payment.isOpen()) {
            await rollbackQuietly(t);
            return next(new ErrorResponse(`A ${payment.status} payment cannot be cancelled`, 409));
        }

        // A live hosted page is expired at the gateway first; if that fails the
        // payment stays open, so it can never be paid after being "cancelled".
        if (payment.status === 'processing' && payment.provider) {
            const provider = providerByName(payment.provider);
            if (!provider) {
                await rollbackQuietly(t);
                return next(new ErrorResponse('The gateway that handled this payment is not configured', 503));
            }
            await provider.cancelCheckout(payment);
        }

        await PS.transition(payment, 'cancelled', {
            actor,
            note: req.body && req.body.reason ? String(req.body.reason).trim() : 'Cancelled by the company',
            transaction: t
        });
        await t.commit();
        res.status(200).json({ success: true, message: 'Payment cancelled', data: await reload(payment.id, actor) });
    } catch (error) {
        await rollbackQuietly(t);
        next(error);
    }
};

// @desc    Refund a succeeded payment to the company
// @route   POST /api/payments/:id/refund
// @access  Private (owning company | admin)
exports.refundPayment = async (req, res, next) => {
    const t = await sequelize.transaction();
    try {
        const { payment, actor, error } = await loadPaymentForActor(req.params.id, req.user, { transaction: t });
        if (error) { await rollbackQuietly(t); return next(error); }
        if (!(actor.role === 'admin' || payment.canBeManagedBy(actor))) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Only the paying company or an admin can refund this payment', 403));
        }
        if (!payment.canBeRefundedBy(actor)) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('Only a succeeded payment can be refunded', 409));
        }

        const provider = providerByName(payment.provider);
        if (!provider) {
            await rollbackQuietly(t);
            return next(new ErrorResponse('The gateway that handled this payment is not configured', 503));
        }
        const { providerRefundId } = await provider.refund(payment);

        payment.providerRefundId = providerRefundId;
        payment.refundedByUserId = req.user.id;
        payment.refundReason = String(req.body.reason).trim();
        await PS.transition(payment, 'refunded', { actor, note: payment.refundReason, transaction: t });
        await t.commit();

        notifyPaymentRefunded(payment.id);
        res.status(200).json({ success: true, message: 'Payment refunded', data: await reload(payment.id, actor) });
    } catch (error) {
        await rollbackQuietly(t);
        next(error);
    }
};

exports.canViewInternshipPayments = canViewInternshipPayments;
