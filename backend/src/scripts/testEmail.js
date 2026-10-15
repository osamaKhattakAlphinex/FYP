/**
 * Sends one test email with the EMAIL_* settings, to tell bad credentials apart
 * from a host that blocks SMTP. Run it locally with the same values as the
 * deployed service:
 *
 *     cd backend
 *     node src/scripts/testEmail.js you@example.com
 */
require('dotenv').config();
const sendEmail = require('../utils/sendEmail');

const to = process.argv[2] || process.env.EMAIL_USER;

const via = process.env.BREVO_API_KEY
    ? 'Brevo API'
    : `${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT} as ${process.env.EMAIL_USER}`;
console.log(`Sending via ${via} to ${to}`);

sendEmail({
    email: to,
    subject: 'SMTP test - Smart AI Platform',
    html: '<p>SMTP is configured correctly.</p>'
})
    .then(() => {
        console.log('Sent.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Failed:', err.code || '', err.message);
        process.exit(1);
    });
