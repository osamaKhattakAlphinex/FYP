const crypto = require('crypto');
const axios = require('axios');

// Real Stripe Checkout over Stripe's REST API, using the axios the backend
// already depends on (no Stripe SDK). Card details are typed on Stripe's own
// hosted page, so they never reach this server — which keeps the platform out
// of PCI DSS card-data scope (SAQ A). The outcome arrives by signed webhook.
//
// Only the pure parts (form building, minor units, webhook verification) are
// unit-tested here; live calls need real keys and are documented as not run.

const NAME = 'stripe';
const API = 'https://api.stripe.com/v1';
const TIMEOUT_MS = 15000;
const DEFAULT_TOLERANCE_SECONDS = 300;

// Currencies Stripe charges in whole units (no cents).
// https://docs.stripe.com/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = [
    'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
    'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
];

const isZeroDecimal = (currency) => ZERO_DECIMAL_CURRENCIES.includes(String(currency || '').toUpperCase());

const isConfigured = () => !!process.env.STRIPE_SECRET_KEY;

// Stripe amounts are integers in the currency's smallest unit.
const toMinorUnits = (amount, currency) => {
    const value = Number(amount);
    return isZeroDecimal(currency) ? Math.round(value) : Math.round(value * 100);
};

// The form fields of POST /v1/checkout/sessions. Pure, so it is unit-tested.
const buildCheckoutForm = (payment, { successUrl, cancelUrl }) => {
    const label = payment.kind === 'bonus' ? 'Bonus' : 'Stipend';
    const name = `${label}: ${payment.taskTitle || 'Micro-internship'}`.slice(0, 250);
    return {
        mode: 'payment',
        'line_items[0][price_data][currency]': String(payment.currency).toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(toMinorUnits(payment.amount, payment.currency)),
        'line_items[0][price_data][product_data][name]': name,
        'line_items[0][quantity]': '1',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: payment.reference,
        'metadata[paymentId]': String(payment.id),
        'metadata[reference]': payment.reference,
        'payment_intent_data[metadata][paymentId]': String(payment.id),
        'payment_intent_data[metadata][reference]': payment.reference
    };
};

const encodeForm = (fields) => new URLSearchParams(fields).toString();

// A gateway failure, with a message that is safe to show and to log. The
// original axios error is deliberately dropped: its `config.headers` carries
// the secret key, and the global error handler logs whatever it is given.
class PaymentGatewayError extends Error {
    constructor(message, statusCode = 502) {
        super(message);
        this.name = 'PaymentGatewayError';
        this.statusCode = statusCode;
    }
}

const post = async (path, fields, idempotencyKey) => {
    try {
        const response = await axios.post(`${API}${path}`, encodeForm(fields), {
            headers: {
                Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {})
            },
            timeout: TIMEOUT_MS
        });
        return response.data;
    } catch (err) {
        const stripeMessage = err.response?.data?.error?.message;
        const status = err.response?.status;
        console.warn(`[stripeProvider] ${path} failed`, status || err.code || 'network error');
        throw new PaymentGatewayError(
            stripeMessage ? `Payment gateway: ${stripeMessage}` : 'The payment gateway could not be reached'
        );
    }
};

// Idempotency keys make a retried request (double click, network retry)
// return the same Stripe object instead of creating a second one.
const createCheckout = async (payment, urls) => {
    const session = await post(
        '/checkout/sessions',
        buildCheckoutForm(payment, urls),
        `checkout-${payment.reference}`
    );
    return { providerPaymentId: session.id, checkoutUrl: session.url };
};

// providerPaymentId holds the PaymentIntent id once the webhook confirmed it.
const refund = async (payment) => {
    const result = await post(
        '/refunds',
        { payment_intent: payment.providerPaymentId, 'metadata[reference]': payment.reference },
        `refund-${payment.reference}`
    );
    return { providerRefundId: result.id };
};

// Expire the hosted page so the company cannot still pay after cancelling.
const cancelCheckout = async (payment) => {
    await post(`/checkout/sessions/${encodeURIComponent(payment.providerPaymentId)}/expire`, {});
    return { cancelled: true };
};

// ---------------------------------------------------------------------------
// Webhook signature verification (Stripe-Signature: t=…,v1=…[,v1=…])
// https://docs.stripe.com/webhooks#verify-manually
// ---------------------------------------------------------------------------

const parseSignatureHeader = (header) => {
    const out = { timestamp: null, signatures: [] };
    String(header || '').split(',').forEach((part) => {
        const idx = part.indexOf('=');
        if (idx <= 0) return;
        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (key === 't') out.timestamp = value;
        if (key === 'v1' && value) out.signatures.push(value);
    });
    return out;
};

const safeEqualHex = (a, b) => {
    const left = Buffer.from(String(a), 'utf8');
    const right = Buffer.from(String(b), 'utf8');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
};

// → { ok: true, event } or { ok: false, reason }. `rawBody` must be the exact
// bytes Stripe sent (server.js keeps them in req.rawBody), since re-serialised
// JSON would not match the signature.
const verifyWebhook = (rawBody, signatureHeader, secret, { tolerance = DEFAULT_TOLERANCE_SECONDS, now = Date.now() } = {}) => {
    if (!secret) return { ok: false, reason: 'Webhook secret is not configured' };
    if (rawBody == null || rawBody.length === 0) return { ok: false, reason: 'Missing request body' };
    if (!signatureHeader) return { ok: false, reason: 'Missing Stripe-Signature header' };

    const { timestamp, signatures } = parseSignatureHeader(signatureHeader);
    if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) {
        return { ok: false, reason: 'Malformed Stripe-Signature header' };
    }

    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
    const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.`, 'utf8')
        .update(body)
        .digest('hex');

    if (!signatures.some((sig) => safeEqualHex(sig, expected))) {
        return { ok: false, reason: 'Signature does not match' };
    }

    // Checked after the signature, so the timestamp itself is authenticated.
    const age = Math.abs(Math.floor(now / 1000) - Number(timestamp));
    if (age > tolerance) return { ok: false, reason: 'Signature timestamp is outside the tolerance window' };

    let event;
    try {
        event = JSON.parse(body.toString('utf8'));
    } catch (err) {
        return { ok: false, reason: 'Body is not valid JSON' };
    }
    return { ok: true, event };
};

// Builds a valid header — used by the tests (and handy for local replays).
const signPayload = (rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) => {
    const sig = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
    return `t=${timestamp},v1=${sig}`;
};

module.exports = {
    NAME,
    ZERO_DECIMAL_CURRENCIES,
    PaymentGatewayError,
    isConfigured,
    isZeroDecimal,
    toMinorUnits,
    buildCheckoutForm,
    encodeForm,
    createCheckout,
    refund,
    cancelCheckout,
    parseSignatureHeader,
    verifyWebhook,
    signPayload
};
