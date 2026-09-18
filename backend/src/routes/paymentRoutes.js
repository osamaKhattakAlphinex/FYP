const express = require('express');
const {
    stripeWebhook,
    getStudentPayments,
    getCompanyPayments,
    getAdminPayments,
    getPayoutMethod,
    savePayoutMethod,
    deletePayoutMethod,
    getInternshipPayments,
    createPayment,
    getPayment,
    getReceipt,
    checkout,
    confirmSandboxPayment,
    cancelPayment,
    refundPayment
} = require('../controllers/paymentController');

const { protect, authorize } = require('../middleware/auth');
const {
    validatePaymentListQuery,
    validatePaymentCreate,
    validatePaymentCancel,
    validatePaymentRefund,
    validateSandboxConfirm,
    validatePayoutMethod
} = require('../middleware/validation');

const router = express.Router();

// --- Gateway webhook -----------------------------------------------------------
// Declared before `protect`: Stripe has no user session. It is authenticated
// instead by the HMAC signature over the raw body (server.js keeps the raw
// bytes in req.rawBody), and rejected when STRIPE_WEBHOOK_SECRET is unset.
router.post('/webhooks/stripe', stripeWebhook);

router.use(protect);

// Fine-grained authorisation (whose payment, which status) lives on the
// Payment model and in the controller. `authorize()` here only rules out roles
// that can never reach an endpoint — e.g. a student can never create,
// check out, confirm, cancel or refund, and a mentor can never see money.

// --- Role lists (literal paths before /:id) -------------------------------------
router.get('/student', authorize('student'), validatePaymentListQuery, getStudentPayments);
router.get('/company', authorize('company'), validatePaymentListQuery, getCompanyPayments);
router.get('/admin', authorize('admin'), validatePaymentListQuery, getAdminPayments);

// --- Student payout method ------------------------------------------------------
router.get('/payout-method', authorize('student'), getPayoutMethod);
router.put('/payout-method', authorize('student'), validatePayoutMethod, savePayoutMethod);
router.delete('/payout-method', authorize('student'), deletePayoutMethod);

// --- One internship ---------------------------------------------------------------
router.get('/progress/:progressId', authorize('company', 'student', 'admin', 'mentor'), getInternshipPayments);
router.post('/progress/:progressId', authorize('company'), validatePaymentCreate, createPayment);

// --- One payment --------------------------------------------------------------------
router.get('/:id/receipt', authorize('company', 'student', 'admin'), getReceipt);
router.post('/:id/checkout', authorize('company'), checkout);
router.post('/:id/sandbox/confirm', authorize('company'), validateSandboxConfirm, confirmSandboxPayment);
router.post('/:id/cancel', authorize('company'), validatePaymentCancel, cancelPayment);
router.post('/:id/refund', authorize('company', 'admin'), validatePaymentRefund, refundPayment);
router.get('/:id', authorize('company', 'student', 'admin'), getPayment);

module.exports = router;
