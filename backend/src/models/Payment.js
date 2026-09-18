const crypto = require('crypto');
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// A payment from the company that owns an internship to the student doing it.
//
// `pending`    created by the company, nothing sent to a gateway yet
// `processing` a hosted checkout exists; waiting for the card / the webhook
// `succeeded`  the gateway confirmed the charge
// `failed`     the gateway declined it (reason kept in failureReason)
// `cancelled`  the company abandoned it, or the hosted checkout expired
// `refunded`   a succeeded payment returned to the company
const PAYMENT_STATUSES = ['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'];
const OPEN_STATUSES = ['pending', 'processing'];
// Payments that use up the agreed compensation (see the stipend cap rule).
const COMMITTED_STATUSES = ['pending', 'processing', 'succeeded'];
const PAYMENT_KINDS = ['stipend', 'bonus'];

// Every status change goes through `transition()` in paymentService, which
// refuses anything not listed here — so the audit trail in payment_events can
// never contain an impossible jump (e.g. failed → succeeded).
const TRANSITIONS = {
    pending: ['processing', 'cancelled', 'failed'],
    processing: ['succeeded', 'failed', 'cancelled'],
    succeeded: ['refunded'],
    failed: [],
    cancelled: [],
    refunded: []
};

// Timestamp stamped when a payment enters each status.
const STATUS_TIMESTAMPS = {
    processing: 'processingAt',
    succeeded: 'paidAt',
    failed: 'failedAt',
    cancelled: 'cancelledAt',
    refunded: 'refundedAt'
};

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1000000;

const num = (v) => (v == null || v === '' ? null : Number(v));
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// Money is handled in integer cents so 0.1 + 0.2 never shows up on a receipt.
const toCents = (amount) => Math.round(Number(amount) * 100);
const fromCents = (cents) => Math.round(cents) / 100;

class Payment extends Model {
    isOpen() {
        return OPEN_STATUSES.includes(this.status);
    }

    // actor: { role, userId, studentId?, companyId? } — the Module 8 shape.
    // Mentors are deliberately absent: compensation is between the company and
    // the student (and the platform), not the people guiding the work.
    canBeViewedBy(actor) {
        if (!actor) return false;
        if (actor.role === 'admin') return true;
        if (actor.role === 'company') return sameId(actor.companyId, this.companyId);
        if (actor.role === 'student') return sameId(actor.studentId, this.studentId);
        return false;
    }

    // Checkout, card confirmation and cancelling spend the company's money, so
    // they belong to the owning company alone — not even an admin does them.
    canBeManagedBy(actor) {
        return !!actor && actor.role === 'company' && sameId(actor.companyId, this.companyId);
    }

    // A refund returns money to the company, so the platform (admin) may also
    // do it, e.g. to settle a dispute.
    canBeRefundedBy(actor) {
        if (!actor || this.status !== 'succeeded') return false;
        return actor.role === 'admin' || this.canBeManagedBy(actor);
    }

    toJSON() {
        const values = { ...this.get() };
        values._id = values.id;
        ['amount', 'platformFee', 'netAmount', 'feePercent'].forEach((k) => {
            values[k] = num(values[k]);
        });
        if (Array.isArray(values.events)) {
            values.events = values.events
                .map((e) => (e.toJSON ? e.toJSON() : e))
                .sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) || (Number(a.id) - Number(b.id)));
        }
        return values;
    }

    // The student sees what was paid and why, but not the company's hosted
    // checkout link or the gateway's internal identifiers.
    toJSONFor(actor) {
        const json = this.toJSON();
        if (!actor || !['company', 'admin'].includes(actor.role)) {
            delete json.checkoutUrl;
            delete json.providerPaymentId;
            delete json.providerRefundId;
            if (Array.isArray(json.events)) {
                json.events = json.events.map((e) => {
                    const copy = { ...e };
                    delete copy.providerEventId;
                    return copy;
                });
            }
        }
        return json;
    }

    static canTransition(from, to) {
        return (TRANSITIONS[from] || []).includes(to);
    }

    // Platform fee on `amount` at `percent`, half-up to the cent, never more
    // than the amount itself. The fee is deducted from the student's payout.
    static computeFee(amount, percent) {
        const cents = toCents(amount);
        const pct = Math.min(100, Math.max(0, Number(percent) || 0));
        let feeCents = Math.floor((cents * pct) / 100 + 0.5 + 1e-9);
        feeCents = Math.min(cents, Math.max(0, feeCents));
        return { platformFee: fromCents(feeCents), netAmount: fromCents(cents - feeCents) };
    }

    // `PAY-` + 10 uppercase hex characters (40 random bits).
    static generateReference() {
        return `PAY-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    }
}

Payment.init(
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        // Unique, declared once in `indexes` (see InternshipEvaluation.verificationCode).
        reference: { type: DataTypes.STRING(24), allowNull: false },

        // Financial records must outlive the rows they point at: deleting an
        // internship, task or account nulls the link but keeps the payment,
        // and the snapshots below keep the receipt readable.
        progressId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'internship_progress', key: 'id' },
            onDelete: 'SET NULL'
        },
        applicationId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'applications', key: 'id' },
            onDelete: 'SET NULL'
        },
        taskId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'tasks', key: 'id' },
            onDelete: 'SET NULL'
        },
        studentId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'students', key: 'id' },
            onDelete: 'SET NULL'
        },
        companyId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'companies', key: 'id' },
            onDelete: 'SET NULL'
        },
        studentName: { type: DataTypes.STRING(200), allowNull: true },
        companyName: { type: DataTypes.STRING(200), allowNull: true },
        taskTitle: { type: DataTypes.STRING(255), allowNull: true },

        kind: { type: DataTypes.ENUM(...PAYMENT_KINDS), allowNull: false, defaultValue: 'stipend' },
        description: { type: DataTypes.STRING(500), allowNull: true },

        amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        currency: { type: DataTypes.STRING(3), allowNull: false },
        platformFee: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        netAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        feePercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },

        status: { type: DataTypes.ENUM(...PAYMENT_STATUSES), allowNull: false, defaultValue: 'pending' },

        // Which gateway handled it ('sandbox' | 'stripe'), and its identifiers.
        provider: { type: DataTypes.STRING(20), allowNull: true },
        providerPaymentId: { type: DataTypes.STRING(255), allowNull: true },
        checkoutUrl: { type: DataTypes.STRING(1000), allowNull: true },
        providerRefundId: { type: DataTypes.STRING(255), allowNull: true },

        // Sandbox only, and only these two: the full number and the CVC are
        // validated in memory and never stored (Stripe keeps card data on its
        // own hosted page, so it never reaches this server at all).
        cardBrand: { type: DataTypes.STRING(20), allowNull: true },
        cardLast4: { type: DataTypes.STRING(4), allowNull: true },

        failureReason: { type: DataTypes.STRING(500), allowNull: true },
        initiatedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        refundedByUserId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onDelete: 'SET NULL'
        },
        refundReason: { type: DataTypes.STRING(500), allowNull: true },

        processingAt: { type: DataTypes.DATE, allowNull: true },
        paidAt: { type: DataTypes.DATE, allowNull: true },
        failedAt: { type: DataTypes.DATE, allowNull: true },
        cancelledAt: { type: DataTypes.DATE, allowNull: true },
        refundedAt: { type: DataTypes.DATE, allowNull: true }
    },
    {
        sequelize,
        modelName: 'Payment',
        tableName: 'payments',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['reference'] },
            { fields: ['progressId', 'status'] },
            { fields: ['studentId', 'status'] },
            { fields: ['companyId', 'status'] },
            { fields: ['providerPaymentId'] }
        ]
    }
);

Payment.STATUSES = PAYMENT_STATUSES;
Payment.OPEN_STATUSES = OPEN_STATUSES;
Payment.COMMITTED_STATUSES = COMMITTED_STATUSES;
Payment.KINDS = PAYMENT_KINDS;
Payment.TRANSITIONS = TRANSITIONS;
Payment.STATUS_TIMESTAMPS = STATUS_TIMESTAMPS;
Payment.MIN_AMOUNT = MIN_AMOUNT;
Payment.MAX_AMOUNT = MAX_AMOUNT;
Payment.toCents = toCents;
Payment.fromCents = fromCents;

module.exports = Payment;
