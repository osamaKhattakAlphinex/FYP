const getEmailVerificationTemplate = (verificationUrl, userName) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Smart AI Platform!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Thank you for registering with Smart AI Micro Internship Platform. Please verify your email address to activate your account.</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getOTPTemplate = (otp, userName) => {
    const otpExpireMinutes = process.env.OTP_EXPIRE_MINUTES || 10;
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Email Verification</h1>
        </div>
        <div class="content">
          <p>Hi ${userName || 'there'},</p>
          <p>Thank you for registering with Smart AI Micro Internship Platform. Please use the following One-Time Password (OTP) to verify your email address:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <div class="warning">
            <strong>⏰ Important:</strong> This OTP will expire in ${otpExpireMinutes} minutes. Please verify your email before it expires.
          </div>
          <p><strong>Security Tips:</strong></p>
          <ul>
            <li>Never share this OTP with anyone</li>
            <li>Our team will never ask for your OTP</li>
            <li>If you didn't request this OTP, please ignore this email</li>
          </ul>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getPasswordResetTemplate = (resetUrl, userName) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getWelcomeTemplate = (userName, role) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .features { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Welcome to Smart AI Platform!</h1>
        </div>
        <div class="content">
          <p>Hi ${userName},</p>
          <p>Congratulations! Your email has been verified and your account is now active.</p>
          <div class="features">
            <h3>What's Next?</h3>
            ${role === 'student' ? `
              <div class="feature-item">✅ Complete your profile to get better opportunities</div>
              <div class="feature-item">🔍 Browse available micro-internship tasks</div>
              <div class="feature-item">📚 Start learning and earning certificates</div>
              <div class="feature-item">🏆 Build your portfolio with real projects</div>
            ` : role === 'company' ? `
              <div class="feature-item">✅ Complete your company profile</div>
              <div class="feature-item">📝 Post your first micro-internship task</div>
              <div class="feature-item">👥 Find talented students for your projects</div>
              <div class="feature-item">📊 Track applications and manage candidates</div>
            ` : ''}
          </div>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="button">Get Started</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const STATUS_LABELS = {
    submitted: 'Submitted',
    under_review: 'Under Review',
    shortlisted: 'Shortlisted',
    interview_scheduled: 'Interview Scheduled',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn'
};

const STATUS_COLORS = {
    submitted: '#6b7280',
    under_review: '#2563eb',
    shortlisted: '#4f46e5',
    interview_scheduled: '#7c3aed',
    accepted: '#16a34a',
    rejected: '#dc2626',
    withdrawn: '#ca8a04'
};

const getApplicationStatusChangeTemplate = ({
    studentName,
    companyName,
    taskTitle,
    fromStatus,
    toStatus,
    reason,
    applicationUrl
}) => {
    const label = STATUS_LABELS[toStatus] || toStatus;
    const color = STATUS_COLORS[toStatus] || '#667eea';
    const fromLabel = STATUS_LABELS[fromStatus] || fromStatus || '—';
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .status-pill { display: inline-block; padding: 6px 14px; background: ${color}; color: white; border-radius: 9999px; font-weight: 600; font-size: 14px; }
        .meta { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .meta-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .meta-row strong { color: #111; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0; }
        .reason { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 20px 0; border-radius: 5px; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Update</h1>
        </div>
        <div class="content">
          <p>Hi ${studentName || 'there'},</p>
          <p>Your application to <strong>${taskTitle}</strong> at <strong>${companyName}</strong> has a new status:</p>
          <p style="text-align: center;">
            <span class="status-pill">${label}</span>
          </p>
          <div class="meta">
            <div class="meta-row"><span>Previous status</span><strong>${fromLabel}</strong></div>
            <div class="meta-row"><span>New status</span><strong>${label}</strong></div>
            <div class="meta-row"><span>Task</span><strong>${taskTitle}</strong></div>
            <div class="meta-row"><span>Company</span><strong>${companyName}</strong></div>
          </div>
          ${reason ? `<div class="reason"><strong>Message from ${companyName}:</strong><br>${reason}</div>` : ''}
          ${applicationUrl ? `<p style="text-align: center;"><a href="${applicationUrl}" class="button">View application</a></p>` : ''}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getApplicationWithdrawnTemplate = ({
    companyName,
    studentName,
    taskTitle,
    reason,
    candidatesUrl
}) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ca8a04 0%, #b45309 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .meta { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .meta-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .meta-row strong { color: #111; }
        .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0; }
        .reason { background: #fef3c7; border-left: 4px solid #ca8a04; padding: 12px 16px; margin: 20px 0; border-radius: 5px; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Withdrawn</h1>
        </div>
        <div class="content">
          <p>Hi ${companyName || 'there'},</p>
          <p><strong>${studentName || 'A candidate'}</strong> has withdrawn their application for your task <strong>${taskTitle}</strong>.</p>
          <div class="meta">
            <div class="meta-row"><span>Candidate</span><strong>${studentName || '—'}</strong></div>
            <div class="meta-row"><span>Task</span><strong>${taskTitle}</strong></div>
            <div class="meta-row"><span>Withdrawn at</span><strong>${new Date().toLocaleString()}</strong></div>
          </div>
          ${reason ? `<div class="reason"><strong>Reason provided:</strong><br>${reason}</div>` : ''}
          ${candidatesUrl ? `<p style="text-align: center;"><a href="${candidatesUrl}" class="button">View remaining applicants</a></p>` : ''}
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
    getEmailVerificationTemplate,
    getOTPTemplate,
    getPasswordResetTemplate,
    getWelcomeTemplate,
    getApplicationStatusChangeTemplate,
    getApplicationWithdrawnTemplate
};