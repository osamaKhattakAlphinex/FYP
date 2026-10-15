const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
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
        from: `${options.fromName || 'Smart AI Platform'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html || options.message
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

// True when SMTP credentials are present. Without them every send fails, so
// callers (e.g. registration) can skip email-dependent steps instead of erroring.
const isEmailConfigured = () =>
    Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

module.exports = sendEmail;
module.exports.isEmailConfigured = isEmailConfigured;