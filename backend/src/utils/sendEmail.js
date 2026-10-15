const nodemailer = require('nodemailer');
const axios = require('axios');

// Brevo's transactional email API over HTTPS. Used when BREVO_API_KEY is set,
// for hosts (e.g. Render's free plan) that block every outbound SMTP port.
const sendWithBrevoApi = async ({ fromName, fromEmail, to, subject, html }) => {
    try {
        await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { name: fromName, email: fromEmail },
                to: [{ email: to }],
                subject,
                htmlContent: html
            },
            {
                headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
                timeout: 15000
            }
        );
    } catch (error) {
        // Surface Brevo's reason (unverified sender, bad key, blocked IP) in the logs.
        const detail = error.response ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Brevo API send failed: ${detail}`);
    }
};

const sendEmail = async (options) => {
    const fromName = options.fromName || 'Smart AI Platform';
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const html = options.html || options.message;

    if (process.env.BREVO_API_KEY) {
        return sendWithBrevoApi({ fromName, fromEmail, to: options.email, subject: options.subject, html });
    }

    const port = Number(process.env.EMAIL_PORT) || 587;

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port,
        // Port 465 is implicit TLS; 587/2525 start plain and upgrade via STARTTLS.
        // With secure:false on 465 the connection just hangs.
        secure: port === 465,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        // Fail within seconds when the host blocks SMTP, instead of nodemailer's
        // 2-minute default that outlives the request.
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
    });

    // Email options
    const mailOptions = {
        from: `${fromName} <${fromEmail}>`,
        to: options.email,
        subject: options.subject,
        html
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

// True when email credentials are present. Without them every send fails, so
// callers (e.g. registration) can skip email-dependent steps instead of erroring.
const isEmailConfigured = () =>
    Boolean(
        process.env.BREVO_API_KEY ||
        (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS)
    );

module.exports = sendEmail;
module.exports.isEmailConfigured = isEmailConfigured;
