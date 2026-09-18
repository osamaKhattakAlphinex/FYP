const { Payment, PaymentEvent } = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const { stripeProvider } = require('./payments');

// Module 12 — the money rules. Everything above the "DB helpers" line is pure
// (plain values in, plain values out) and unit-tested in payment.rules.test.js.

const DEFAULT_FEE_PERCENT = 5;
const MAX_FEE_PERCENT = 50;
const PAID_BUDGET_TYPES = ['fixed', 'hourly'];

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const round2 = (v) => Payment.fromCents(Payment.toCents(v));
const plain = (r) => (r && typeof r.get === 'function' ? r.get({ plain: true }) : r);
// Reads a raw attribute even when toJSON() would hide it (Application's
// proposedRate is deleted by Application.toJSON).
const rawAttr = (obj, key) => {
    if (!obj) return undefined;
    return typeof obj.get === 'function' ? obj.get(key) : obj[key];
};

// PLATFORM_FEE_PERCENT, read at call time; 0..50, 2dp, default 5.
const platformFeePercent = () => {
    const raw = process.env.PLATFORM_FEE_PERCENT;
    if (raw == null || String(raw).trim() === '') return DEFAULT_FEE_PERCENT;
    const n = Number(raw);
    if (Number.isNaN(n)) return DEFAULT_FEE_PERCENT;
    return round2(Math.min(MAX_FEE_PERCENT, Math.max(0, n)));
};

const isPaidTask = (task) => !!task && PAID_BUDGET_TYPES.includes(rawAttr(task, 'budgetType'));

// The task's currency as an ISO-4217-shaped code, or null if unusable.
const currencyOf = (task) => {
    const c = String(rawAttr(task, 'budgetCurrency') || 'USD').trim().toUpperCase();
    return /^[A-Z]{3}$/.test(c) ? c : null;
};

// What the student was promised for this internship.
//   fixed  → the student's proposed rate, else the task's max, else its min
//   hourly → that rate × the hours logged on the internship (Module 8)
// agreedAmount is null when nothing is known (then only the hard limits apply).
const suggestCompensation = ({ task, application, progress } = {}) => {
    const budgetType = rawAttr(task, 'budgetType') || 'unpaid';
    const currency = currencyOf(task);
    const hoursLogged = round2(num(rawAttr(progress, 'totalHoursLogged')) || 0);
    const base = { budgetType, currency, agreedAmount: null, hourlyRate: null, hoursLogged };
    if (!PAID_BUDGET_TYPES.includes(budgetType)) return base;

    const rate = [
        rawAttr(application, 'proposedRate'),
        rawAttr(task, 'budgetAmountMax'),
        rawAttr(task, 'budgetAmountMin')
    ].map(num).find((v) => v != null && v > 0);
    if (rate == null) return base;

    if (budgetType === 'fixed') return { ...base, agreedAmount: round2(rate) };
    return { ...base, hourlyRate: round2(rate), agreedAmount: round2(rate * hoursLogged) };
};

const sumAmounts = (payments, predicate, field = 'amount') =>
    Payment.fromCents(
        (payments || [])
            .map(plain)
            .filter(predicate)
            .reduce((sum, p) => sum + Payment.toCents(num(p[field]) || 0), 0)
    );

// Stipend money already spoken for: pending, processing or paid. Failed,
// cancelled and refunded payments free their share up again.
const committedStipend = (payments) =>
    sumAmounts(payments, (p) => p.kind === 'stipend' && Payment.COMMITTED_STATUSES.includes(p.status));

// → null when allowed, else the message for the 400. Bonuses are not capped:
// they are, by definition, on top of what was agreed.
const stipendCapError = ({ kind = 'stipend', amount, agreedAmount, committed, currency }) => {
    if (kind !== 'stipend' || agreedAmount == null) return null;
    const remaining = Payment.fromCents(Payment.toCents(agreedAmount) - Payment.toCents(committed || 0));
    if (remaining <= 0) {
        return 'The agreed compensation for this internship has already been paid or is being paid. Use a bonus for anything extra.';
    }
    if (Payment.toCents(amount) > Payment.toCents(remaining)) {
        const left = [remaining.toFixed(2), currency].filter(Boolean).join(' ');
        return `This is more than the agreed compensation allows: at most ${left} remains. Use a bonus for anything extra.`;
    }
    return null;
};

// Hard limits on any single payment. → null or a message.
const amountError = (amount, currency) => {
    const value = Number(amount);
    if (amount == null || amount === '' || Number.isNaN(value)) return 'Amount must be a number';
    if (value < Payment.MIN_AMOUNT || value > Payment.MAX_AMOUNT) {
        return `Amount must be between ${Payment.MIN_AMOUNT} and ${Payment.MAX_AMOUNT.toLocaleString('en-US')}`;
    }
    if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) return 'Amount can have at most 2 decimal places';
    if (stripeProvider.isZeroDecimal(currency) && !Number.isInteger(value)) {
        return `${currency} amounts must be whole numbers`;
    }
    return null;
};

// Per-currency totals. Amounts in different currencies are never added
// together; the "primary" currency (largest volume) is what headline figures
// use, and `byCurrency` always carries the full picture.
const byCurrencyTotals = (payments) => {
    const map = new Map();
    (payments || []).map(plain).forEach((p) => {
        const c = p.currency || 'USD';
        if (!map.has(c)) {
            map.set(c, { currency: c, paid: 0, fees: 0, net: 0, refunded: 0, refundedNet: 0, open: 0, count: 0 });
        }
        const row = map.get(c);
        const amount = Payment.toCents(num(p.amount) || 0);
        row.count += 1;
        if (p.status === 'succeeded') {
            row.paid += amount;
            row.fees += Payment.toCents(num(p.platformFee) || 0);
            row.net += Payment.toCents(num(p.netAmount) || 0);
        } else if (p.status === 'refunded') {
            row.refunded += amount;
            row.refundedNet += Payment.toCents(num(p.netAmount) || 0);
        } else if (Payment.OPEN_STATUSES.includes(p.status)) {
            row.open += amount;
        }
    });
    return [...map.values()]
        .map((r) => ({
            ...r,
            paid: Payment.fromCents(r.paid),
            fees: Payment.fromCents(r.fees),
            net: Payment.fromCents(r.net),
            refunded: Payment.fromCents(r.refunded),
            refundedNet: Payment.fromCents(r.refundedNet),
            open: Payment.fromCents(r.open)
        }))
        .sort((a, b) => (b.paid - a.paid) || (b.count - a.count) || (a.currency < b.currency ? -1 : 1));
};

const statusCounts = (payments) => {
    const out = Payment.STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    (payments || []).map(plain).forEach((p) => {
        if (out[p.status] != null) out[p.status] += 1;
    });
    return out;
};

// The student's view: what reached them (net of the platform fee).
const summarizeForStudent = (payments) => {
    const byCurrency = byCurrencyTotals(payments);
    const primary = byCurrency[0] || null;
    return {
        currency: primary ? primary.currency : null,
        totalReceivedNet: primary ? primary.net : 0,
        totalRefunded: primary ? primary.refundedNet : 0,
        pending: primary ? primary.open : 0,
        byCurrency: byCurrency.map((r) => ({
            currency: r.currency, receivedNet: r.net, refunded: r.refundedNet, pending: r.open, count: r.count
        })),
        byStatus: statusCounts(payments)
    };
};

// The company's view: what it paid (gross), in fees, and got back.
const summarizeForCompany = (payments) => {
    const byCurrency = byCurrencyTotals(payments);
    const primary = byCurrency[0] || null;
    const byStatus = statusCounts(payments);
    return {
        currency: primary ? primary.currency : null,
        totalPaid: primary ? primary.paid : 0,
        totalFees: primary ? primary.fees : 0,
        refunded: primary ? primary.refunded : 0,
        open: byStatus.pending + byStatus.processing,
        byCurrency: byCurrency.map((r) => ({
            currency: r.currency, paid: r.paid, fees: r.fees, refunded: r.refunded, open: r.open, count: r.count
        })),
        byStatus
    };
};

// The compensation block of GET /progress/:progressId.
const compensationSummary = ({ task, application, progress, payments, feePercent }) => {
    const suggested = suggestCompensation({ task, application, progress });
    const committed = committedStipend(payments);
    const paidToDate = sumAmounts(payments, (p) => p.status === 'succeeded');
    return {
        ...suggested,
        paidToDate,
        committedStipend: committed,
        outstanding: suggested.agreedAmount == null
            ? null
            : Payment.fromCents(Math.max(0, Payment.toCents(suggested.agreedAmount) - Payment.toCents(committed))),
        feePercent
    };
};

const maskedCard = (payment) =>
    payment.cardLast4 ? `${payment.cardBrand || 'card'} •••• ${payment.cardLast4}` : null;

// What a printed receipt shows. Only for money that actually moved.
const RECEIPT_STATUSES = ['succeeded', 'refunded'];

const buildReceipt = (payment) => {
    const p = plain(payment);
    return {
        id: String(p.id),
        reference: p.reference,
        status: p.status,
        kind: p.kind,
        description: p.description || null,
        student: { id: p.studentId != null ? String(p.studentId) : null, name: p.studentName },
        company: { id: p.companyId != null ? String(p.companyId) : null, name: p.companyName },
        task: { id: p.taskId != null ? String(p.taskId) : null, title: p.taskTitle },
        progressId: p.progressId != null ? String(p.progressId) : null,
        currency: p.currency,
        amount: num(p.amount),
        feePercent: num(p.feePercent),
        platformFee: num(p.platformFee),
        netAmount: num(p.netAmount),
        provider: p.provider,
        card: maskedCard(p),
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        refundedAt: p.refundedAt,
        refundReason: p.status === 'refunded' ? p.refundReason : null,
        issuedAt: new Date().toISOString()
    };
};

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

// The one way a payment changes status. Enforces TRANSITIONS, stamps the
// matching timestamp, saves, and writes the audit event — in the caller's
// transaction, so the change and its record commit or fail together.
const transition = async (payment, to, { source = 'user', actor = null, note = null, providerEventId = null, transaction } = {}) => {
    const from = payment.status;
    if (!Payment.canTransition(from, to)) {
        throw new ErrorResponse(`A ${from} payment cannot become ${to}`, 409);
    }
    payment.status = to;
    const stamp = Payment.STATUS_TIMESTAMPS[to];
    if (stamp) payment[stamp] = new Date();
    await payment.save({ transaction });
    await PaymentEvent.create({
        paymentId: payment.id,
        fromStatus: from,
        toStatus: to,
        source,
        actorUserId: actor ? actor.userId : null,
        actorRole: actor ? actor.role : source === 'webhook' ? 'gateway' : null,
        note: note ? String(note).slice(0, 500) : null,
        providerEventId
    }, { transaction });
    return payment;
};

const recordCreation = (payment, { actor, transaction }) =>
    PaymentEvent.create({
        paymentId: payment.id,
        fromStatus: null,
        toStatus: payment.status,
        source: 'user',
        actorUserId: actor ? actor.userId : null,
        actorRole: actor ? actor.role : null,
        note: 'Payment created'
    }, { transaction });

module.exports = {
    DEFAULT_FEE_PERCENT,
    PAID_BUDGET_TYPES,
    RECEIPT_STATUSES,
    platformFeePercent,
    isPaidTask,
    currencyOf,
    suggestCompensation,
    committedStipend,
    stipendCapError,
    amountError,
    byCurrencyTotals,
    summarizeForStudent,
    summarizeForCompany,
    compensationSummary,
    buildReceipt,
    transition,
    recordCreation
};
