const sandboxProvider = require('./sandboxProvider');
const stripeProvider = require('./stripeProvider');

// Provider selection, read from the environment at call time (so a test or a
// redeploy can switch without code changes):
//
//   PAYMENT_PROVIDER=stripe AND STRIPE_SECRET_KEY set  → Stripe Checkout
//   anything else                                      → the sandbox
//
// The sandbox is itself guarded by PAYMENTS_SANDBOX_ENABLED (default true):
// with it set to 'false', a server that lost its Stripe key refuses to create
// checkouts instead of silently "paying" with simulated money.

const PROVIDERS = {
    [sandboxProvider.NAME]: sandboxProvider,
    [stripeProvider.NAME]: stripeProvider
};

const activeProviderName = () => {
    const wanted = String(process.env.PAYMENT_PROVIDER || 'sandbox').trim().toLowerCase();
    return wanted === 'stripe' && stripeProvider.isConfigured() ? stripeProvider.NAME : sandboxProvider.NAME;
};

// The provider new checkouts go to.
const getProvider = () => PROVIDERS[activeProviderName()];

// The provider that handled an existing payment (refunds and cancellations
// must go back to the same gateway). null when it is unknown or unusable.
const providerByName = (name) => {
    if (name === stripeProvider.NAME) return stripeProvider.isConfigured() ? stripeProvider : null;
    if (name === sandboxProvider.NAME) return sandboxProvider;
    return null;
};

module.exports = {
    sandboxProvider,
    stripeProvider,
    activeProviderName,
    getProvider,
    providerByName,
    PaymentGatewayError: stripeProvider.PaymentGatewayError
};
