const crypto = require('crypto');

// The sandbox gateway: a simulated hosted checkout for development, demos and
// the FYP evaluation, where no real money may move. It mirrors Stripe's
// published test cards so the same card numbers behave the same way in both.
//
// Card data handling: the confirm endpoint passes the card fields to
// `validateCard` in memory. Only `brand` and `last4` ever leave this module;
// the full number, expiry and CVC are never stored, logged or echoed back.

const NAME = 'sandbox';

// Stripe's documented test cards (https://docs.stripe.com/testing).
const TEST_CARDS = {
    '4242424242424242': { outcome: 'succeeded' },
    '4000000000000002': { outcome: 'failed', reason: 'Your card was declined.' },
    '4000000000009995': { outcome: 'failed', reason: 'Insufficient funds.' }
};

const FRONTEND = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Read at call time so a deployment (or a test) can switch it without a
// restart. Anything other than the literal 'false' keeps the sandbox on.
const isEnabled = () => String(process.env.PAYMENTS_SANDBOX_ENABLED ?? 'true').trim().toLowerCase() !== 'false';

const randomId = (prefix) => `${prefix}${crypto.randomBytes(12).toString('hex')}`;

// ---------------------------------------------------------------------------
// Pure card checks
// ---------------------------------------------------------------------------

const normalizeCardNumber = (value) => String(value == null ? '' : value).replace(/[\s-]/g, '');

const luhnValid = (digits) => {
    if (!/^\d+$/.test(digits)) return false;
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let d = digits.charCodeAt(i) - 48;
        if (double) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
        double = !double;
    }
    return sum % 10 === 0;
};

const detectBrand = (digits) => {
    const n = String(digits);
    if (/^4/.test(n)) return 'visa';
    if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    if (/^(6011|65|64[4-9])/.test(n)) return 'discover';
    if (/^35(2[89]|[3-8]\d)/.test(n)) return 'jcb';
    if (/^3(0[0-5]|[689])/.test(n)) return 'diners';
    if (/^62/.test(n)) return 'unionpay';
    return 'unknown';
};

// A card is valid through the last day of its expiry month, so the current
// month is still accepted. Two-digit years are read as 20YY.
const expiryValid = (expMonth, expYear, now = new Date()) => {
    const month = Number(expMonth);
    let year = Number(expYear);
    if (!Number.isInteger(month) || month < 1 || month > 12) return false;
    if (!Number.isInteger(year)) return false;
    if (year >= 0 && year < 100) year += 2000;
    if (year < 2000 || year > 2100) return false;
    const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
    return year * 12 + (month - 1) >= current;
};

// Validates a card entirely in memory. Returns either
//   { ok: true, card: { brand, last4 }, outcome, reason }
// or { ok: false, errors: [{ field, message }] }.
// Messages describe what is wrong without repeating what was typed.
const validateCard = (input = {}, now = new Date()) => {
    const errors = [];
    const digits = normalizeCardNumber(input.cardNumber);
    if (!/^\d{12,19}$/.test(digits) || !luhnValid(digits)) {
        errors.push({ field: 'cardNumber', message: 'The card number is not valid' });
    }
    if (!expiryValid(input.expMonth, input.expYear, now)) {
        errors.push({ field: 'expiry', message: 'The expiry date is invalid or in the past' });
    }
    if (!/^\d{3,4}$/.test(String(input.cvc == null ? '' : input.cvc).trim())) {
        errors.push({ field: 'cvc', message: 'The security code must be 3 or 4 digits' });
    }
    const name = String(input.cardholderName == null ? '' : input.cardholderName).trim();
    if (name.length < 2 || name.length > 100) {
        errors.push({ field: 'cardholderName', message: 'Enter the name on the card' });
    }
    if (errors.length > 0) return { ok: false, errors };

    const test = TEST_CARDS[digits] || { outcome: 'succeeded' };
    return {
        ok: true,
        card: { brand: detectBrand(digits), last4: digits.slice(-4) },
        outcome: test.outcome,
        reason: test.reason || null
    };
};

// ---------------------------------------------------------------------------
// Provider interface (same shape as stripeProvider)
// ---------------------------------------------------------------------------

// The "hosted checkout" is the platform's own sandbox page, which submits the
// card to POST /api/payments/:id/sandbox/confirm.
const createCheckout = async (payment) => ({
    providerPaymentId: randomId('sbx_'),
    checkoutUrl: `${FRONTEND()}/payments/checkout/${payment.id}`
});

const refund = async () => ({ providerRefundId: randomId('sbx_re_') });

// Nothing to expire on the gateway side: the sandbox page simply refuses a
// payment that is no longer processing.
const cancelCheckout = async () => ({ cancelled: true });

module.exports = {
    NAME,
    TEST_CARDS,
    isEnabled,
    normalizeCardNumber,
    luhnValid,
    detectBrand,
    expiryValid,
    validateCard,
    createCheckout,
    refund,
    cancelCheckout
};
