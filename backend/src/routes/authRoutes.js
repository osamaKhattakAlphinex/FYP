const express = require('express');
const passport = require('passport');
const {
    register,
    login,
    logout,
    getMe,
    verifyEmail,
    resendVerification,
    sendOTP,
    verifyOTP,
    forgotPassword,
    resetPassword,
    updatePassword,
    googleAuth,
    googleAuthCallback,
    deleteAccount
} = require('../controllers/authController');
const {
    protect
} = require('../middleware/auth');
const {
    validate,
    registerValidation,
    loginValidation,
    emailValidation,
    otpValidation,
    resetPasswordValidation,
    passwordValidation
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', emailValidation, validate, resendVerification);
router.post('/send-otp', emailValidation, validate, sendOTP);
router.post('/verify-otp', otpValidation, validate, verifyOTP);
router.post('/forgot-password', emailValidation, validate, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, validate, resetPassword);

// Google OAuth routes - COMMENTED OUT (Enable Google OAuth in passport.js first)
/*
router.get('/google', googleAuth, passport.authenticate('google', {
    scope: ['profile', 'email']
}));
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=authentication_failed`,
        session: false
    }),
    googleAuthCallback
);
*/

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, passwordValidation, validate, updatePassword);
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;