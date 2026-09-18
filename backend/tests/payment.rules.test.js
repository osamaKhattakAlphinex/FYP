/**
 * Module 12 — rule-level tests.
 *
 * The parts of payment integration that are pure logic: the Payment model's
 * state machine, access predicates, fee maths and JSON shaping; the payout
 * method validation and masking; the sandbox card checks; the Stripe form
 * builder, minor units and webhook signature verification; the compensation /
 * stipend-cap rules; and the money figures added to the Module 11 dashboards.
 * No database and no network are required:
 *
 *     npm test
 *
 * HTTP flows (checkout, confirmation, refunds, the webhook endpoint, the DB
 * scans proving no card or account number is stored) are exercised by the
 * integration run recorded in docs/qa/module-12-payment-integration.md.
 */
require('dotenv').config();

const Payment = require('../src/models/Payment');
const StudentPayoutMethod = require('../src/models/StudentPayoutMethod');
const sandbox = require('../src/services/payments/sandboxProvider');
const stripe = require('../src/services/payments/stripeProvider');
const payments = require('../src/services/payments');
const PS = require('../src/services/paymentService');
const A = require('../src/services/analyticsService');

const company = { role: 'company', userId: 10, companyId: 5 };
const otherCompany = { role: 'company', userId: 11, companyId: 6 };
const student = { role: 'student', userId: 20, studentId: 7 };
const otherStudent = { role: 'student', userId: 21, studentId: 8 };
const mentor = { role: 'mentor', userId: 30, mentorId: 3, isAssignedMentor: true, isActiveMentor: true };
const admin = { role: 'admin', userId: 1 };

const buildPayment = (attrs = {}) =>
    Payment.build({
        id: 1,
        reference: 'PAY-0123456789',
        progressId: 2,
        studentId: 7,
        companyId: 5,
        kind: 'stipend',
        amount: '200.00', // MySQL DECIMALs arrive as strings
        currency: 'USD',
        platformFee: '10.00',
        netAmount: '190.00',
        feePercent: '5.00',
        status: 'pending',
        provider: 'sandbox',
        providerPaymentId: 'sbx_abc',
        checkoutUrl: 'http://localhost:3000/payments/checkout/1',
        ...attrs
    });

const withEnv = (vars, fn) => {
    const saved = {};
    Object.keys(vars).forEach((k) => {
        saved[k] = process.env[k];
        if (vars[k] === undefined) delete process.env[k];
        else process.env[k] = vars[k];
    });
    try {
        return fn();
    } finally {
        Object.keys(saved).forEach((k) => {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        });
    }
};

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

describe('Payment.TRANSITIONS / canTransition', () => {
    it('allows exactly the documented moves', () => {
        const allowed = [];
        Payment.STATUSES.forEach((from) => Payment.STATUSES.forEach((to) => {
            if (Payment.canTransition(from, to)) allowed.push(`${from}>${to}`);
        }));
        expect(allowed.sort()).toEqual([
            'pending>cancelled', 'pending>failed', 'pending>processing',
            'processing>cancelled', 'processing>failed', 'processing>succeeded',
            'succeeded>refunded'
        ].sort());
    });

    it('terminal states go nowhere, and unknown states are refused', () => {
        ['failed', 'cancelled', 'refunded'].forEach((s) => expect(Payment.TRANSITIONS[s]).toEqual([]));
        expect(Payment.canTransition('pending', 'succeeded')).toBe(false); // must pass through checkout
        expect(Payment.canTransition('failed', 'succeeded')).toBe(false);
        expect(Payment.canTransition('bogus', 'pending')).toBe(false);
    });

    it('open statuses are pending and processing', () => {
        expect(Payment.OPEN_STATUSES).toEqual(['pending', 'processing']);
        expect(buildPayment({ status: 'processing' }).isOpen()).toBe(true);
        expect(buildPayment({ status: 'succeeded' }).isOpen()).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Access predicates
// ---------------------------------------------------------------------------

describe('Payment access predicates', () => {
    const p = buildPayment({ status: 'succeeded' });

    it('viewers: admin, the owning company, the student — never mentors', () => {
        expect(p.canBeViewedBy(admin)).toBe(true);
        expect(p.canBeViewedBy(company)).toBe(true);
        expect(p.canBeViewedBy(student)).toBe(true);
        expect(p.canBeViewedBy(otherCompany)).toBe(false);
        expect(p.canBeViewedBy(otherStudent)).toBe(false);
        expect(p.canBeViewedBy(mentor)).toBe(false);
        expect(p.canBeViewedBy(null)).toBe(false);
        expect(p.canBeViewedBy({ role: 'company' })).toBe(false); // no profile
    });

    it('only the owning company manages (admins do not spend company money)', () => {
        expect(p.canBeManagedBy(company)).toBe(true);
        expect(p.canBeManagedBy(admin)).toBe(false);
        expect(p.canBeManagedBy(student)).toBe(false);
        expect(p.canBeManagedBy(otherCompany)).toBe(false);
    });

    it('refunds: owning company or admin, and only once succeeded', () => {
        expect(p.canBeRefundedBy(company)).toBe(true);
        expect(p.canBeRefundedBy(admin)).toBe(true);
        expect(p.canBeRefundedBy(student)).toBe(false);
        expect(p.canBeRefundedBy(otherCompany)).toBe(false);
        ['pending', 'processing', 'failed', 'cancelled', 'refunded'].forEach((status) => {
            expect(buildPayment({ status }).canBeRefundedBy(admin)).toBe(false);
        });
    });

    it('a payment whose company was deleted (companyId null) is admin-only', () => {
        const orphan = buildPayment({ companyId: null, status: 'succeeded' });
        expect(orphan.canBeViewedBy(company)).toBe(false);
        expect(orphan.canBeRefundedBy(admin)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// JSON shaping
// ---------------------------------------------------------------------------

describe('Payment JSON', () => {
    const p = buildPayment({ status: 'refunded', providerRefundId: 'sbx_re_1' });
    p.dataValues.events = [
        { id: 2, createdAt: '2026-09-02T00:00:00Z', toStatus: 'processing', providerEventId: 'evt_2' },
        { id: 1, createdAt: '2026-09-01T00:00:00Z', toStatus: 'pending', providerEventId: null }
    ];

    it('numbers are numbers, _id is set, events are in order', () => {
        const json = p.toJSON();
        expect(json._id).toBe(1);
        expect([json.amount, json.platformFee, json.netAmount, json.feePercent]).toEqual([200, 10, 190, 5]);
        expect(json.events.map((e) => e.id)).toEqual([1, 2]);
    });

    it('the student never sees the checkout link or gateway identifiers', () => {
        const json = p.toJSONFor(student);
        expect(json).not.toHaveProperty('checkoutUrl');
        expect(json).not.toHaveProperty('providerPaymentId');
        expect(json).not.toHaveProperty('providerRefundId');
        json.events.forEach((e) => expect(e).not.toHaveProperty('providerEventId'));
        expect(json.amount).toBe(200);
    });

    it('company and admin see them', () => {
        expect(p.toJSONFor(company).checkoutUrl).toBe('http://localhost:3000/payments/checkout/1');
        expect(p.toJSONFor(admin).providerPaymentId).toBe('sbx_abc');
        expect(p.toJSONFor(null)).not.toHaveProperty('checkoutUrl');
    });
});

// ---------------------------------------------------------------------------
// Fees and references
// ---------------------------------------------------------------------------

describe('Payment.computeFee', () => {
    it('5% of round amounts', () => {
        expect(Payment.computeFee(200, 5)).toEqual({ platformFee: 10, netAmount: 190 });
        expect(Payment.computeFee('100.00', 5)).toEqual({ platformFee: 5, netAmount: 95 });
    });

    it('rounds half-up to the cent', () => {
        expect(Payment.computeFee(10.1, 5)).toEqual({ platformFee: 0.51, netAmount: 9.59 }); // 0.505 → 0.51
        expect(Payment.computeFee(10.09, 5)).toEqual({ platformFee: 0.5, netAmount: 9.59 }); // 0.5045 → 0.50
        expect(Payment.computeFee(33.33, 2.5)).toEqual({ platformFee: 0.83, netAmount: 32.5 }); // 0.83325
        expect(Payment.computeFee(0.1 + 0.2, 10)).toEqual({ platformFee: 0.03, netAmount: 0.27 });
    });

    it('edge percentages and amounts', () => {
        expect(Payment.computeFee(1, 0)).toEqual({ platformFee: 0, netAmount: 1 });
        expect(Payment.computeFee(1, 5)).toEqual({ platformFee: 0.05, netAmount: 0.95 });
        expect(Payment.computeFee(1000000, 5)).toEqual({ platformFee: 50000, netAmount: 950000 });
        // The fee never exceeds the amount, and never goes negative.
        expect(Payment.computeFee(10, 150)).toEqual({ platformFee: 10, netAmount: 0 });
        expect(Payment.computeFee(10, -5)).toEqual({ platformFee: 0, netAmount: 10 });
        expect(Payment.computeFee(10, 'abc')).toEqual({ platformFee: 0, netAmount: 10 });
    });

    it('fee + net always equals the amount', () => {
        [1.01, 7.77, 99.99, 123.45, 555.55].forEach((amount) => {
            const { platformFee, netAmount } = Payment.computeFee(amount, 5);
            expect(Math.round((platformFee + netAmount) * 100)).toBe(Math.round(amount * 100));
        });
    });
});

describe('PLATFORM_FEE_PERCENT', () => {
    it('defaults to 5, clamps to 0..50, ignores garbage', () => {
        expect(withEnv({ PLATFORM_FEE_PERCENT: undefined }, PS.platformFeePercent)).toBe(5);
        expect(withEnv({ PLATFORM_FEE_PERCENT: '' }, PS.platformFeePercent)).toBe(5);
        expect(withEnv({ PLATFORM_FEE_PERCENT: '2.5' }, PS.platformFeePercent)).toBe(2.5);
        expect(withEnv({ PLATFORM_FEE_PERCENT: '0' }, PS.platformFeePercent)).toBe(0);
        expect(withEnv({ PLATFORM_FEE_PERCENT: '90' }, PS.platformFeePercent)).toBe(50);
        expect(withEnv({ PLATFORM_FEE_PERCENT: '-3' }, PS.platformFeePercent)).toBe(0);
        expect(withEnv({ PLATFORM_FEE_PERCENT: 'lots' }, PS.platformFeePercent)).toBe(5);
    });
});

describe('Payment.generateReference', () => {
    it('is PAY- plus 10 uppercase hex characters, and varies', () => {
        const refs = new Set(Array.from({ length: 50 }, () => Payment.generateReference()));
        refs.forEach((r) => expect(r).toMatch(/^PAY-[0-9A-F]{10}$/));
        expect(refs.size).toBe(50);
    });
});

// ---------------------------------------------------------------------------
// Compensation and the stipend cap
// ---------------------------------------------------------------------------

describe('suggestCompensation', () => {
    const task = (extra = {}) => ({
        budgetType: 'fixed', budgetAmountMin: '200.00', budgetAmountMax: '300.00', budgetCurrency: 'usd', ...extra
    });

    it('fixed: the proposed rate wins, then the max, then the min', () => {
        expect(PS.suggestCompensation({ task: task(), application: { proposedRate: '250.00' }, progress: {} }))
            .toEqual({ budgetType: 'fixed', currency: 'USD', agreedAmount: 250, hourlyRate: null, hoursLogged: 0 });
        expect(PS.suggestCompensation({ task: task(), application: { proposedRate: null } }).agreedAmount).toBe(300);
        expect(PS.suggestCompensation({ task: task({ budgetAmountMax: null }) }).agreedAmount).toBe(200);
    });

    it('reads proposedRate from a model instance even though toJSON hides it', () => {
        const Application = require('../src/models/Application');
        const app = Application.build({ taskId: 1, studentId: 2, coverLetter: 'x', proposedRate: 275 });
        expect(app.toJSON().proposedRate).toBeUndefined();
        expect(PS.suggestCompensation({ task: task(), application: app }).agreedAmount).toBe(275);
    });

    it('hourly: rate × hours logged', () => {
        const out = PS.suggestCompensation({
            task: task({ budgetType: 'hourly', budgetAmountMin: 15, budgetAmountMax: 20 }),
            application: { proposedRate: 18 },
            progress: { totalHoursLogged: '12.50' }
        });
        expect(out).toEqual({ budgetType: 'hourly', currency: 'USD', agreedAmount: 225, hourlyRate: 18, hoursLogged: 12.5 });
        expect(PS.suggestCompensation({
            task: task({ budgetType: 'hourly' }), progress: { totalHoursLogged: 0 }
        }).agreedAmount).toBe(0);
    });

    it('unknown or unpaid → no agreed amount', () => {
        expect(PS.suggestCompensation({ task: task({ budgetAmountMin: null, budgetAmountMax: null }) }).agreedAmount).toBeNull();
        expect(PS.suggestCompensation({ task: task({ budgetType: 'unpaid' }), application: { proposedRate: 100 } }).agreedAmount).toBeNull();
        expect(PS.suggestCompensation({}).budgetType).toBe('unpaid');
    });

    it('currency must be three letters', () => {
        expect(PS.currencyOf({ budgetCurrency: 'pkr' })).toBe('PKR');
        expect(PS.currencyOf({ budgetCurrency: null })).toBe('USD');
        expect(PS.currencyOf({ budgetCurrency: 'DOLLARS' })).toBeNull();
        expect(PS.isPaidTask({ budgetType: 'hourly' })).toBe(true);
        expect(PS.isPaidTask({ budgetType: 'unpaid' })).toBe(false);
        expect(PS.isPaidTask(null)).toBe(false);
    });
});

describe('stipend cap', () => {
    const rows = [
        { kind: 'stipend', status: 'succeeded', amount: '100.00' },
        { kind: 'stipend', status: 'processing', amount: '50.10' },
        { kind: 'stipend', status: 'failed', amount: '500' },
        { kind: 'stipend', status: 'cancelled', amount: '500' },
        { kind: 'stipend', status: 'refunded', amount: '500' },
        { kind: 'bonus', status: 'succeeded', amount: '999' }
    ];

    it('counts pending/processing/succeeded stipends only', () => {
        expect(PS.committedStipend(rows)).toBe(150.1);
        expect(PS.committedStipend([])).toBe(0);
    });

    it('allows up to the remainder, to the cent', () => {
        const args = { agreedAmount: 250, committed: 150.1, currency: 'USD' };
        expect(PS.stipendCapError({ ...args, amount: 99.9 })).toBeNull();
        expect(PS.stipendCapError({ ...args, amount: 99.91 })).toMatch(/at most 99\.90 USD remains/);
    });

    it('fully paid, bonuses and unknown agreements', () => {
        expect(PS.stipendCapError({ agreedAmount: 100, committed: 100, amount: 1 })).toMatch(/already been paid/);
        expect(PS.stipendCapError({ kind: 'bonus', agreedAmount: 100, committed: 100, amount: 500 })).toBeNull();
        expect(PS.stipendCapError({ agreedAmount: null, committed: 0, amount: 1000000 })).toBeNull();
    });
});

describe('amountError', () => {
    it('hard limits and precision', () => {
        expect(PS.amountError(1, 'USD')).toBeNull();
        expect(PS.amountError('1000000', 'USD')).toBeNull();
        expect(PS.amountError(10.5, 'USD')).toBeNull();
        expect(PS.amountError(0.99, 'USD')).toMatch(/between 1 and 1,000,000/);
        expect(PS.amountError(1000000.01, 'USD')).toMatch(/between/);
        expect(PS.amountError(10.555, 'USD')).toMatch(/2 decimal/);
        expect(PS.amountError('abc', 'USD')).toMatch(/number/);
        expect(PS.amountError(null, 'USD')).toMatch(/number/);
    });

    it('zero-decimal currencies need whole amounts', () => {
        expect(PS.amountError(1500, 'JPY')).toBeNull();
        expect(PS.amountError(1500.5, 'JPY')).toMatch(/JPY amounts must be whole numbers/);
    });
});

// ---------------------------------------------------------------------------
// Sandbox card checks
// ---------------------------------------------------------------------------

describe('sandbox card validation', () => {
    const NOW = new Date('2026-09-18T12:00:00Z');
    const card = (extra = {}) => ({
        cardNumber: '4242 4242 4242 4242', expMonth: 12, expYear: 2030, cvc: '123', cardholderName: 'Ada Lovelace', ...extra
    });

    it('Luhn', () => {
        expect(sandbox.luhnValid('4242424242424242')).toBe(true);
        expect(sandbox.luhnValid('4242424242424241')).toBe(false);
        expect(sandbox.luhnValid('378282246310005')).toBe(true); // amex test card
        expect(sandbox.luhnValid('79927398713')).toBe(true);
        expect(sandbox.luhnValid('abc')).toBe(false);
    });

    it('brand detection', () => {
        expect(sandbox.detectBrand('4242424242424242')).toBe('visa');
        expect(sandbox.detectBrand('5555555555554444')).toBe('mastercard');
        expect(sandbox.detectBrand('2223003122003222')).toBe('mastercard');
        expect(sandbox.detectBrand('378282246310005')).toBe('amex');
        expect(sandbox.detectBrand('6011111111111117')).toBe('discover');
        expect(sandbox.detectBrand('3566002020360505')).toBe('jcb');
        expect(sandbox.detectBrand('36227206271667')).toBe('diners');
        expect(sandbox.detectBrand('6200000000000005')).toBe('unionpay');
        expect(sandbox.detectBrand('9999999999999995')).toBe('unknown');
    });

    it('expiry: the current month is still valid, last month is not', () => {
        expect(sandbox.expiryValid(9, 2026, NOW)).toBe(true);
        expect(sandbox.expiryValid(8, 2026, NOW)).toBe(false);
        expect(sandbox.expiryValid('09', '26', NOW)).toBe(true); // two-digit year
        expect(sandbox.expiryValid(1, 2027, NOW)).toBe(true);
        expect(sandbox.expiryValid(13, 2030, NOW)).toBe(false);
        expect(sandbox.expiryValid(0, 2030, NOW)).toBe(false);
        expect(sandbox.expiryValid('x', 2030, NOW)).toBe(false);
    });

    it('test-card outcomes mirror Stripe', () => {
        expect(sandbox.validateCard(card(), NOW)).toEqual({
            ok: true, card: { brand: 'visa', last4: '4242' }, outcome: 'succeeded', reason: null
        });
        expect(sandbox.validateCard(card({ cardNumber: '4000 0000 0000 0002' }), NOW))
            .toMatchObject({ ok: true, outcome: 'failed', reason: 'Your card was declined.', card: { last4: '0002' } });
        expect(sandbox.validateCard(card({ cardNumber: '4000-0000-0000-9995' }), NOW))
            .toMatchObject({ ok: true, outcome: 'failed', reason: 'Insufficient funds.' });
        expect(sandbox.validateCard(card({ cardNumber: '5555555555554444' }), NOW))
            .toMatchObject({ ok: true, outcome: 'succeeded', card: { brand: 'mastercard', last4: '4444' } });
    });

    it('invalid input lists every problem without repeating the input', () => {
        const out = sandbox.validateCard({
            cardNumber: '4242424242424241', expMonth: 8, expYear: 2026, cvc: '12', cardholderName: ''
        }, NOW);
        expect(out.ok).toBe(false);
        expect(out.errors.map((e) => e.field)).toEqual(['cardNumber', 'expiry', 'cvc', 'cardholderName']);
        expect(JSON.stringify(out)).not.toMatch(/4242|2026|"12"/);
        expect(sandbox.validateCard({}, NOW).ok).toBe(false);
        expect(sandbox.validateCard(card({ cardNumber: '4242' }), NOW).ok).toBe(false); // too short
    });

    it('the result carries brand and last4 only', () => {
        const out = sandbox.validateCard(card(), NOW);
        expect(Object.keys(out.card).sort()).toEqual(['brand', 'last4']);
        expect(JSON.stringify(out)).not.toContain('4242424242424242');
        expect(JSON.stringify(out)).not.toContain('123');
    });

    it('PAYMENTS_SANDBOX_ENABLED: only the literal false disables it', () => {
        expect(withEnv({ PAYMENTS_SANDBOX_ENABLED: undefined }, sandbox.isEnabled)).toBe(true);
        expect(withEnv({ PAYMENTS_SANDBOX_ENABLED: 'true' }, sandbox.isEnabled)).toBe(true);
        expect(withEnv({ PAYMENTS_SANDBOX_ENABLED: 'FALSE' }, sandbox.isEnabled)).toBe(false);
        expect(withEnv({ PAYMENTS_SANDBOX_ENABLED: ' false ' }, sandbox.isEnabled)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Payout methods
// ---------------------------------------------------------------------------

describe('StudentPayoutMethod.validateInput', () => {
    const v = (input) => StudentPayoutMethod.validateInput({ accountTitle: 'Sara Khan', ...input });

    it('bank transfer: account or IBAN, masked to the last four', () => {
        const out = v({ method: 'bank_transfer', account: 'pk36 scbl 0000 0011 2345 6702', bankName: 'Standard Chartered' });
        expect(out.errors).toEqual([]);
        expect(out.value).toEqual({
            method: 'bank_transfer', accountTitle: 'Sara Khan', accountMasked: '•••• 6702', bankName: 'Standard Chartered'
        });
        expect(JSON.stringify(out.value)).not.toContain('SCBL');
        expect(v({ method: 'bank_transfer', account: '12345', bankName: 'HBL' }).errors[0].field).toBe('account');
        expect(v({ method: 'bank_transfer', account: 'A'.repeat(35), bankName: 'HBL' }).errors[0].field).toBe('account');
        expect(v({ method: 'bank_transfer', account: '123456', bankName: '' }).errors.map((e) => e.field)).toEqual(['bankName']);
    });

    it('mobile wallets: 11 digits starting 03', () => {
        expect(v({ method: 'jazzcash', account: '0300-1234567' }).value.accountMasked).toBe('•••• 4567');
        expect(v({ method: 'easypaisa', account: '03451234567' }).value).toMatchObject({ method: 'easypaisa', bankName: null });
        expect(v({ method: 'jazzcash', account: '0412345678' }).errors[0].field).toBe('account');
        expect(v({ method: 'easypaisa', account: '030012345678' }).errors[0].field).toBe('account');
    });

    it('paypal: a valid email, masked', () => {
        expect(v({ method: 'paypal', account: 'Ahmed.Raza@Example.com' }).value.accountMasked).toBe('a•••@example.com');
        expect(v({ method: 'paypal', account: 'nope' }).errors[0].field).toBe('account');
    });

    it('method and title are required; messages never repeat the account', () => {
        const out = StudentPayoutMethod.validateInput({ method: 'crypto', accountTitle: 'x', account: '0412345678' });
        expect(out.value).toBeNull();
        expect(out.errors.map((e) => e.field)).toEqual(['method', 'accountTitle']);
        const bad = v({ method: 'jazzcash', account: '0412345678' });
        expect(JSON.stringify(bad)).not.toContain('0412345678');
    });
});

// ---------------------------------------------------------------------------
// Stripe (pure parts)
// ---------------------------------------------------------------------------

describe('Stripe minor units and checkout form', () => {
    it('toMinorUnits: cents, and whole units for zero-decimal currencies', () => {
        expect(stripe.toMinorUnits(200, 'USD')).toBe(20000);
        expect(stripe.toMinorUnits('10.10', 'usd')).toBe(1010);
        expect(stripe.toMinorUnits(0.29, 'EUR')).toBe(29); // no 28.999… truncation
        expect(stripe.toMinorUnits(1500, 'JPY')).toBe(1500);
        expect(stripe.toMinorUnits(50000, 'krw')).toBe(50000);
        expect(stripe.toMinorUnits(20000, 'VND')).toBe(20000);
        expect(stripe.isZeroDecimal('PKR')).toBe(false);
    });

    it('buildCheckoutForm has every field Stripe needs', () => {
        const form = stripe.buildCheckoutForm(
            { id: 42, reference: 'PAY-00000000AB', kind: 'stipend', amount: '123.45', currency: 'USD', taskTitle: 'Dashboard' },
            { successUrl: 'https://app/s', cancelUrl: 'https://app/c' }
        );
        expect(form).toEqual({
            mode: 'payment',
            'line_items[0][price_data][currency]': 'usd',
            'line_items[0][price_data][unit_amount]': '12345',
            'line_items[0][price_data][product_data][name]': 'Stipend: Dashboard',
            'line_items[0][quantity]': '1',
            success_url: 'https://app/s',
            cancel_url: 'https://app/c',
            client_reference_id: 'PAY-00000000AB',
            'metadata[paymentId]': '42',
            'metadata[reference]': 'PAY-00000000AB',
            'payment_intent_data[metadata][paymentId]': '42',
            'payment_intent_data[metadata][reference]': 'PAY-00000000AB'
        });
        expect(stripe.encodeForm({ 'a[b]': 'x y' })).toBe('a%5Bb%5D=x+y');
        const bonus = stripe.buildCheckoutForm({ id: 1, reference: 'R', kind: 'bonus', amount: 1000, currency: 'JPY' }, {});
        expect(bonus['line_items[0][price_data][unit_amount]']).toBe('1000');
        expect(bonus['line_items[0][price_data][product_data][name]']).toBe('Bonus: Micro-internship');
    });
});

describe('Stripe webhook verification', () => {
    const SECRET = 'whsec_test_secret';
    const NOW = 1790000000000;
    const T = Math.floor(NOW / 1000);
    const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });

    it('accepts a correctly signed, fresh payload (string or Buffer)', () => {
        const header = stripe.signPayload(body, SECRET, T);
        const out = stripe.verifyWebhook(body, header, SECRET, { now: NOW });
        expect(out.ok).toBe(true);
        expect(out.event.id).toBe('evt_1');
        expect(stripe.verifyWebhook(Buffer.from(body), header, SECRET, { now: NOW }).ok).toBe(true);
    });

    it('rejects a tampered body', () => {
        const header = stripe.signPayload(body, SECRET, T);
        expect(stripe.verifyWebhook(body.replace('evt_1', 'evt_2'), header, SECRET, { now: NOW }))
            .toEqual({ ok: false, reason: 'Signature does not match' });
    });

    it('rejects the wrong secret, a missing secret and a missing header', () => {
        const header = stripe.signPayload(body, 'whsec_other', T);
        expect(stripe.verifyWebhook(body, header, SECRET, { now: NOW }).ok).toBe(false);
        expect(stripe.verifyWebhook(body, stripe.signPayload(body, SECRET, T), '', { now: NOW }).reason).toMatch(/not configured/);
        expect(stripe.verifyWebhook(body, undefined, SECRET, { now: NOW }).reason).toMatch(/Missing Stripe-Signature/);
        expect(stripe.verifyWebhook('', 't=1,v1=ab', SECRET, { now: NOW }).reason).toMatch(/Missing request body/);
    });

    it('rejects stale and future timestamps outside the tolerance', () => {
        const stale = stripe.signPayload(body, SECRET, T - 301);
        expect(stripe.verifyWebhook(body, stale, SECRET, { now: NOW }).reason).toMatch(/tolerance/);
        const future = stripe.signPayload(body, SECRET, T + 301);
        expect(stripe.verifyWebhook(body, future, SECRET, { now: NOW }).ok).toBe(false);
        const edge = stripe.signPayload(body, SECRET, T - 300);
        expect(stripe.verifyWebhook(body, edge, SECRET, { now: NOW }).ok).toBe(true);
        expect(stripe.verifyWebhook(body, stale, SECRET, { now: NOW, tolerance: 600 }).ok).toBe(true);
    });

    it('accepts any matching v1 among several (secret rotation), ignores v0', () => {
        const good = stripe.signPayload(body, SECRET, T).split('v1=')[1];
        const header = `t=${T},v1=${'0'.repeat(64)},v0=${good},v1=${good}`;
        expect(stripe.verifyWebhook(body, header, SECRET, { now: NOW }).ok).toBe(true);
        const onlyV0 = `t=${T},v0=${good}`;
        expect(stripe.verifyWebhook(body, onlyV0, SECRET, { now: NOW }).reason).toMatch(/Malformed/);
    });

    it('malformed headers and non-JSON bodies', () => {
        expect(stripe.verifyWebhook(body, 'garbage', SECRET, { now: NOW }).reason).toMatch(/Malformed/);
        expect(stripe.verifyWebhook(body, `t=abc,v1=${'a'.repeat(64)}`, SECRET, { now: NOW }).reason).toMatch(/Malformed/);
        const notJson = 'not json';
        expect(stripe.verifyWebhook(notJson, stripe.signPayload(notJson, SECRET, T), SECRET, { now: NOW }).reason)
            .toMatch(/not valid JSON/);
        expect(stripe.parseSignatureHeader('t=5, v1=aa ,v1=bb')).toEqual({ timestamp: '5', signatures: ['aa', 'bb'] });
    });
});

describe('provider selection', () => {
    it('Stripe only when asked for AND a key is set; otherwise the sandbox', () => {
        expect(withEnv({ PAYMENT_PROVIDER: undefined, STRIPE_SECRET_KEY: 'sk_test_x' }, payments.activeProviderName)).toBe('sandbox');
        expect(withEnv({ PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: undefined }, payments.activeProviderName)).toBe('sandbox');
        expect(withEnv({ PAYMENT_PROVIDER: 'Stripe', STRIPE_SECRET_KEY: 'sk_test_x' }, payments.activeProviderName)).toBe('stripe');
    });

    it('existing payments go back to their own gateway, if usable', () => {
        expect(payments.providerByName('sandbox')).toBe(sandbox);
        expect(withEnv({ STRIPE_SECRET_KEY: undefined }, () => payments.providerByName('stripe'))).toBeNull();
        expect(withEnv({ STRIPE_SECRET_KEY: 'sk_test_x' }, () => payments.providerByName('stripe'))).toBe(stripe);
        expect(payments.providerByName(null)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Summaries and receipts
// ---------------------------------------------------------------------------

const ledger = [
    { kind: 'stipend', status: 'succeeded', amount: '200.00', platformFee: '10.00', netAmount: '190.00', currency: 'USD', paidAt: '2026-09-10T00:00:00Z' },
    { kind: 'bonus', status: 'succeeded', amount: '50.00', platformFee: '2.50', netAmount: '47.50', currency: 'USD', paidAt: '2026-08-10T00:00:00Z' },
    { kind: 'stipend', status: 'refunded', amount: '40.00', platformFee: '2.00', netAmount: '38.00', currency: 'USD', paidAt: '2026-09-01T00:00:00Z' },
    { kind: 'stipend', status: 'processing', amount: '30.00', platformFee: '1.50', netAmount: '28.50', currency: 'USD' },
    { kind: 'stipend', status: 'failed', amount: '999.00', platformFee: '49.95', netAmount: '949.05', currency: 'USD' },
    { kind: 'stipend', status: 'succeeded', amount: '5000.00', platformFee: '250.00', netAmount: '4750.00', currency: 'PKR', paidAt: '2026-09-11T00:00:00Z' }
];

describe('payment summaries', () => {
    it('never adds currencies together; the primary currency has the most volume', () => {
        const rows = PS.byCurrencyTotals(ledger);
        expect(rows.map((r) => r.currency)).toEqual(['PKR', 'USD']);
        expect(rows[1]).toEqual({
            currency: 'USD', paid: 250, fees: 12.5, net: 237.5, refunded: 40, refundedNet: 38, open: 30, count: 5
        });
    });

    it('student summary: net received, refunded, pending', () => {
        const usdOnly = ledger.filter((p) => p.currency === 'USD');
        expect(PS.summarizeForStudent(usdOnly)).toMatchObject({
            currency: 'USD', totalReceivedNet: 237.5, totalRefunded: 38, pending: 30
        });
        expect(PS.summarizeForStudent([])).toMatchObject({ currency: null, totalReceivedNet: 0, byCurrency: [] });
    });

    it('company summary: gross paid, fees, refunded, open count', () => {
        const out = PS.summarizeForCompany(ledger.filter((p) => p.currency === 'USD'));
        expect(out).toMatchObject({ currency: 'USD', totalPaid: 250, totalFees: 12.5, refunded: 40, open: 1 });
        expect(out.byStatus).toEqual({ pending: 0, processing: 1, succeeded: 2, failed: 1, cancelled: 0, refunded: 1 });
    });

    it('compensation summary: paid to date and outstanding', () => {
        const out = PS.compensationSummary({
            task: { budgetType: 'fixed', budgetAmountMax: 300, budgetCurrency: 'USD' },
            application: { proposedRate: null },
            progress: { totalHoursLogged: 0 },
            payments: ledger.filter((p) => p.currency === 'USD'),
            feePercent: 5
        });
        // committed stipend: 200 succeeded + 30 processing = 230 → 70 outstanding
        expect(out).toMatchObject({ agreedAmount: 300, paidToDate: 250, committedStipend: 230, outstanding: 70, feePercent: 5 });
    });

    it('receipt: masked card, numbers, refund reason only when refunded', () => {
        const r = PS.buildReceipt(buildPayment({
            status: 'succeeded', cardBrand: 'visa', cardLast4: '4242', refundReason: 'x', studentName: 'Sara', taskTitle: 'T'
        }));
        expect(r).toMatchObject({
            reference: 'PAY-0123456789', amount: 200, platformFee: 10, netAmount: 190, feePercent: 5,
            card: 'visa •••• 4242', refundReason: null, student: { id: '7', name: 'Sara' }, task: { id: null, title: 'T' }
        });
        expect(r).not.toHaveProperty('checkoutUrl');
        expect(r).not.toHaveProperty('providerPaymentId');
        expect(PS.buildReceipt(buildPayment({ status: 'refunded', refundReason: 'Dispute' })).refundReason).toBe('Dispute');
        expect(PS.buildReceipt(buildPayment({ provider: 'stripe' })).card).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Module 11 integration (analytics money figures)
// ---------------------------------------------------------------------------

describe('analytics money builders', () => {
    const NOW = new Date('2026-09-18T12:00:00Z');

    it('student earnings: succeeded net in the primary currency, by month', () => {
        const usd = ledger.filter((p) => p.currency === 'USD');
        const out = A.buildStudentEarnings(usd, { months: 6, now: NOW });
        expect(out).toMatchObject({ currency: 'USD', totalNet: 237.5, refunded: 38, pending: 30, payments: 2 });
        expect(out.byMonth).toHaveLength(6);
        expect(out.byMonth.slice(-2)).toEqual([{ month: '2026-08', net: 47.5 }, { month: '2026-09', net: 190 }]);
        const mixed = A.buildStudentEarnings(ledger, { now: NOW });
        expect(mixed.currency).toBe('PKR');
        expect(mixed.byCurrency.map((c) => [c.currency, c.totalNet])).toEqual([['PKR', 4750], ['USD', 237.5]]);
        expect(mixed.byMonth.at(-1)).toEqual({ month: '2026-09', net: 4750 });
    });

    it('company spend: gross paid, fees, refunded, open', () => {
        const out = A.buildCompanySpend(ledger.filter((p) => p.currency === 'USD'), { months: 12, now: NOW });
        expect(out).toMatchObject({ currency: 'USD', totalPaid: 250, totalFees: 12.5, refunded: 40, open: 1, payments: 2 });
        expect(out.byMonth.at(-1)).toEqual({ month: '2026-09', paid: 200 });
        expect(A.buildCompanySpend([], { now: NOW })).toMatchObject({ currency: null, totalPaid: 0, open: 0 });
    });

    it('admin payments from GROUP BY rows (strings from MySQL)', () => {
        const out = A.buildAdminPayments({
            statusGroups: [{ status: 'succeeded', count: '3' }, { status: 'refunded', count: 1 }],
            providerGroups: [{ provider: 'sandbox', count: '4' }, { provider: null, count: 2 }],
            succeededByCurrency: [
                { currency: 'USD', volume: '250.00', fees: '12.50', count: '2' },
                { currency: 'PKR', volume: '5000.00', fees: '250.00', count: 1 }
            ],
            refundedByCurrency: [{ currency: 'USD', amount: '40.00' }, { currency: 'EUR', amount: '9.99' }]
        });
        expect(out).toEqual({
            total: 4,
            byStatus: { pending: 0, processing: 0, succeeded: 3, failed: 0, cancelled: 0, refunded: 1 },
            byProvider: { sandbox: 4 },
            currency: 'PKR',
            volume: 5000,
            fees: 250,
            refunded: 0,
            byCurrency: [
                { currency: 'PKR', volume: 5000, fees: 250, refunded: 0, payments: 1 },
                { currency: 'USD', volume: 250, fees: 12.5, refunded: 40, payments: 2 },
                { currency: 'EUR', volume: 0, fees: 0, refunded: 9.99, payments: 0 }
            ]
        });
        expect(A.buildAdminPayments({})).toMatchObject({ total: 0, currency: null, volume: 0, byCurrency: [] });
    });
});
