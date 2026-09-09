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
            ` : role === 'mentor' ? `
              <div class="feature-item">Complete your mentor profile and add your areas of expertise</div>
              <div class="feature-item">Wait for admin verification &mdash; it unlocks mentorship assignments</div>
              <div class="feature-item">Accept mentorship requests from companies</div>
              <div class="feature-item">Guide students through their micro-internships</div>
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

const formatWhen = (scheduledAt, timezone) => {
    try {
        return `${new Date(scheduledAt).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
        })} (${timezone || 'UTC'})`;
    } catch {
        return `${scheduledAt} (${timezone || 'UTC'})`;
    }
};

const modeLine = ({ mode, meetingLink, meetingLocation, meetingPhoneNumber }) => {
    if (mode === 'video' && meetingLink) return `Join link: ${meetingLink}`;
    if (mode === 'phone' && meetingPhoneNumber) return `Phone: ${meetingPhoneNumber}`;
    if (mode === 'onsite' && meetingLocation) return `Location: ${meetingLocation}`;
    return `Mode: ${mode}`;
};

const interviewShell = (headerColor, headerTitle, bodyHtml) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .meta { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .meta-row { padding: 6px 0; font-size: 14px; }
        .meta-row strong { color: #111; }
        .reason { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 20px 0; border-radius: 5px; font-size: 14px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>${headerTitle}</h1></div>
        <div class="content">${bodyHtml}</div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Smart AI Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
`;

const interviewScheduled = ({
    studentName,
    companyName,
    taskTitle,
    scheduledAt,
    timezone,
    mode,
    meetingLink,
    meetingLocation,
    meetingPhoneNumber,
    agenda
}) => {
    const when = formatWhen(scheduledAt, timezone);
    const connect = modeLine({ mode, meetingLink, meetingLocation, meetingPhoneNumber });
    const subject = `Interview scheduled for "${taskTitle}"`;
    const html = interviewShell(
        'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        'Interview Scheduled',
        `
          <p>Hi ${studentName || 'there'},</p>
          <p><strong>${companyName}</strong> has scheduled an interview with you for the task <strong>${taskTitle}</strong>.</p>
          <div class="meta">
            <div class="meta-row"><strong>When:</strong> ${when}</div>
            <div class="meta-row"><strong>Mode:</strong> ${mode}</div>
            <div class="meta-row"><strong>${connect}</strong></div>
          </div>
          ${agenda ? `<div class="reason"><strong>Agenda:</strong><br>${agenda}</div>` : ''}
          <p>Please be available a few minutes early. Good luck!</p>
        `
    );
    const text = `Hi ${studentName || 'there'},
${companyName} scheduled an interview for "${taskTitle}".
When: ${when}
Mode: ${mode}
${connect}
${agenda ? `Agenda: ${agenda}` : ''}`;
    return { subject, html, text };
};

const interviewRescheduled = ({
    recipientName,
    companyName,
    taskTitle,
    scheduledAt,
    timezone,
    mode,
    meetingLink,
    meetingLocation,
    meetingPhoneNumber,
    reason
}) => {
    const when = formatWhen(scheduledAt, timezone);
    const connect = modeLine({ mode, meetingLink, meetingLocation, meetingPhoneNumber });
    const subject = `Interview rescheduled for "${taskTitle}"`;
    const html = interviewShell(
        'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'Interview Rescheduled',
        `
          <p>Hi ${recipientName || 'there'},</p>
          <p>The interview for <strong>${taskTitle}</strong>${
              companyName ? ` with <strong>${companyName}</strong>` : ''
          } has been rescheduled.</p>
          <div class="meta">
            <div class="meta-row"><strong>New time:</strong> ${when}</div>
            <div class="meta-row"><strong>Mode:</strong> ${mode}</div>
            <div class="meta-row"><strong>${connect}</strong></div>
          </div>
          ${reason ? `<div class="reason"><strong>Reason:</strong><br>${reason}</div>` : ''}
        `
    );
    const text = `Hi ${recipientName || 'there'},
The interview for "${taskTitle}" has been rescheduled.
New time: ${when}
Mode: ${mode}
${connect}
${reason ? `Reason: ${reason}` : ''}`;
    return { subject, html, text };
};

const interviewCancelled = ({ recipientName, companyName, taskTitle, reason }) => {
    const subject = `Interview cancelled for "${taskTitle}"`;
    const html = interviewShell(
        'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        'Interview Cancelled',
        `
          <p>Hi ${recipientName || 'there'},</p>
          <p>The interview for <strong>${taskTitle}</strong>${
              companyName ? ` with <strong>${companyName}</strong>` : ''
          } has been cancelled.</p>
          ${reason ? `<div class="reason"><strong>Reason:</strong><br>${reason}</div>` : ''}
          <p>If a new interview is arranged, you will receive another notification.</p>
        `
    );
    const text = `Hi ${recipientName || 'there'},
The interview for "${taskTitle}" has been cancelled.
${reason ? `Reason: ${reason}` : ''}`;
    return { subject, html, text };
};

// ---------------------------------------------------------------------------
// Mentor assignment templates (Module 7). These reuse interviewShell above.
// ---------------------------------------------------------------------------

const MENTOR_HEADER_COLOR = '#0a66c2';

const mentorMetaRows = (rows) =>
    rows
        .filter((r) => r && r.value)
        .map((r) => `<div class="meta-row"><strong>${r.label}:</strong> ${r.value}</div>`)
        .join('');

const mentorAssignmentRequested = ({
    mentorName,
    companyName,
    studentName,
    taskTitle,
    assignmentNote,
    dashboardUrl
}) => {
    const subject = `Mentorship request from ${companyName}`;
    const html = interviewShell(
        MENTOR_HEADER_COLOR,
        'New mentorship request',
        `
        <p>Hi ${mentorName},</p>
        <p><strong>${companyName}</strong> has asked you to mentor a student through a micro-internship.</p>
        <div class="meta">
          ${mentorMetaRows([
              { label: 'Student', value: studentName },
              { label: 'Task', value: taskTitle },
              { label: 'Company', value: companyName }
          ])}
        </div>
        ${assignmentNote ? `<div class="reason"><strong>Note from the company:</strong><br/>${assignmentNote}</div>` : ''}
        <p>Open your dashboard to accept or decline this request.</p>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">View the request</a></p>` : ''}
        `
    );
    const text = `Mentorship request from ${companyName}
Student: ${studentName}
Task: ${taskTitle}
${assignmentNote ? `Note: ${assignmentNote}` : ''}`;
    return { subject, html, text };
};

const mentorAssignmentAccepted = ({
    recipientName,
    mentorName,
    studentName,
    taskTitle,
    dashboardUrl
}) => {
    const subject = `${mentorName} accepted the mentorship for "${taskTitle}"`;
    const html = interviewShell(
        '#047857',
        'Mentorship confirmed',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${mentorName}</strong> has accepted the mentorship and will be guiding
        <strong>${studentName}</strong> through <strong>${taskTitle}</strong>.</p>
        <div class="meta">
          ${mentorMetaRows([
              { label: 'Mentor', value: mentorName },
              { label: 'Student', value: studentName },
              { label: 'Task', value: taskTitle }
          ])}
        </div>
        <p>You can now exchange guidance notes from the mentorship page.</p>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open the mentorship</a></p>` : ''}
        `
    );
    const text = `${mentorName} accepted the mentorship for "${taskTitle}" with ${studentName}.`;
    return { subject, html, text };
};

const mentorAssignmentDeclined = ({ recipientName, mentorName, taskTitle, reason, dashboardUrl }) => {
    const subject = `${mentorName} declined the mentorship for "${taskTitle}"`;
    const html = interviewShell(
        '#b91c1c',
        'Mentorship declined',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${mentorName}</strong> is unable to take on the mentorship for
        <strong>${taskTitle}</strong>.</p>
        ${reason ? `<div class="reason"><strong>Reason:</strong><br/>${reason}</div>` : ''}
        <p>You can assign a different mentor to this internship at any time.</p>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Assign another mentor</a></p>` : ''}
        `
    );
    const text = `${mentorName} declined the mentorship for "${taskTitle}".
${reason ? `Reason: ${reason}` : ''}`;
    return { subject, html, text };
};

const mentorAssignmentCancelled = ({ recipientName, companyName, taskTitle, reason }) => {
    const subject = `Mentorship for "${taskTitle}" was cancelled`;
    const html = interviewShell(
        '#b91c1c',
        'Mentorship cancelled',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${companyName}</strong> has cancelled the mentorship for
        <strong>${taskTitle}</strong>.</p>
        ${reason ? `<div class="reason"><strong>Reason:</strong><br/>${reason}</div>` : ''}
        `
    );
    const text = `The mentorship for "${taskTitle}" was cancelled by ${companyName}.
${reason ? `Reason: ${reason}` : ''}`;
    return { subject, html, text };
};

const mentorNoteAdded = ({ recipientName, authorName, taskTitle, preview, dashboardUrl }) => {
    const subject = `New guidance note from ${authorName}`;
    const html = interviewShell(
        MENTOR_HEADER_COLOR,
        'New guidance note',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${authorName}</strong> posted a note on your mentorship for
        <strong>${taskTitle}</strong>.</p>
        ${preview ? `<div class="meta"><div class="meta-row">${preview}</div></div>` : ''}
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open the conversation</a></p>` : ''}
        `
    );
    const text = `${authorName} posted a note on "${taskTitle}".
${preview || ''}`;
    return { subject, html, text };
};

const mentorVerificationDecision = ({ mentorName, status, note, dashboardUrl }) => {
    const approved = status === 'approved';
    const subject = approved
        ? 'Your mentor account has been approved'
        : status === 'rejected'
            ? 'Update on your mentor application'
            : 'Your mentor account is under review again';

    const headline = approved
        ? 'You are verified'
        : status === 'rejected'
            ? 'Mentor application not approved'
            : 'Verification reset to pending';

    const body = approved
        ? '<p>Your mentor profile has been verified. Companies can now assign you to guide students through their micro-internships.</p>'
        : status === 'rejected'
            ? '<p>Your mentor profile was not approved at this time. You can update your profile and it will be reviewed again.</p>'
            : '<p>Your mentor profile has been returned to the review queue.</p>';

    const html = interviewShell(
        approved ? '#047857' : '#b91c1c',
        headline,
        `
        <p>Hi ${mentorName},</p>
        ${body}
        ${note ? `<div class="reason"><strong>Reviewer note:</strong><br/>${note}</div>` : ''}
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Go to your dashboard</a></p>` : ''}
        `
    );
    const text = `Mentor verification: ${status}.
${note ? `Note: ${note}` : ''}`;
    return { subject, html, text };
};


// ---------------------------------------------------------------------------
// Progress tracking templates (Module 8). These reuse interviewShell above.
// ---------------------------------------------------------------------------

const PROGRESS_HEADER_COLOR = '#0a66c2';
const PROGRESS_GOOD_COLOR = '#047857';
const PROGRESS_WARN_COLOR = '#b45309';
const PROGRESS_BAD_COLOR = '#b91c1c';

const progressMetaRows = (rows) =>
    rows
        .filter((r) => r && (r.value || r.value === 0))
        .map((r) => `<div class="meta-row"><strong>${r.label}:</strong> ${r.value}</div>`)
        .join('');

const bulletList = (items) => {
    const clean = (items || []).filter(Boolean);
    if (clean.length === 0) return '';
    return `<ul>${clean.map((i) => `<li>${i}</li>`).join('')}</ul>`;
};

const milestoneAssigned = ({
    studentName,
    taskTitle,
    milestoneTitle,
    dueDate,
    authorName,
    dashboardUrl
}) => {
    const subject = `New milestone on "${taskTitle}": ${milestoneTitle}`;
    const html = interviewShell(
        PROGRESS_HEADER_COLOR,
        'New milestone added',
        `
        <p>Hi ${studentName},</p>
        <p>${authorName || 'Your supervisor'} added a milestone to your internship
        <strong>${taskTitle}</strong>.</p>
        <div class="meta">
          ${progressMetaRows([
              { label: 'Milestone', value: milestoneTitle },
              { label: 'Due', value: dueDate }
          ])}
        </div>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open your internship workspace</a></p>` : ''}
        `
    );
    const text = `New milestone on "${taskTitle}": ${milestoneTitle}${dueDate ? ` (due ${dueDate})` : ''}`;
    return { subject, html, text };
};

const milestoneSubmitted = ({
    recipientName,
    studentName,
    taskTitle,
    milestoneTitle,
    attemptNumber,
    summary,
    dashboardUrl
}) => {
    const subject = `${studentName} submitted "${milestoneTitle}" for review`;
    const html = interviewShell(
        PROGRESS_HEADER_COLOR,
        'Milestone submitted for review',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${studentName}</strong> submitted a milestone on
        <strong>${taskTitle}</strong> and is waiting on your review.</p>
        <div class="meta">
          ${progressMetaRows([
              { label: 'Milestone', value: milestoneTitle },
              { label: 'Attempt', value: attemptNumber }
          ])}
        </div>
        ${summary ? `<div class="reason"><strong>What they delivered:</strong><br/>${summary}</div>` : ''}
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Review the submission</a></p>` : ''}
        `
    );
    const text = `${studentName} submitted "${milestoneTitle}" on "${taskTitle}" (attempt ${attemptNumber}).`;
    return { subject, html, text };
};

const milestoneReviewed = ({
    studentName,
    taskTitle,
    milestoneTitle,
    approved,
    reviewerName,
    reviewNote,
    dashboardUrl
}) => {
    const subject = approved
        ? `"${milestoneTitle}" approved`
        : `Changes requested on "${milestoneTitle}"`;
    const html = interviewShell(
        approved ? PROGRESS_GOOD_COLOR : PROGRESS_WARN_COLOR,
        approved ? 'Milestone approved' : 'Changes requested',
        `
        <p>Hi ${studentName},</p>
        <p>${reviewerName || 'Your reviewer'} ${
            approved ? 'approved' : 'asked for changes on'
        } <strong>${milestoneTitle}</strong> for <strong>${taskTitle}</strong>.</p>
        ${reviewNote ? `<div class="reason"><strong>Reviewer note:</strong><br/>${reviewNote}</div>` : ''}
        ${
            approved
                ? '<p>Nice work — move on to your next milestone.</p>'
                : '<p>Make the requested changes and submit the milestone again.</p>'
        }
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open your internship workspace</a></p>` : ''}
        `
    );
    const text = `${milestoneTitle} on "${taskTitle}" was ${
        approved ? 'approved' : 'sent back for changes'
    }.${reviewNote ? ` Note: ${reviewNote}` : ''}`;
    return { subject, html, text };
};

const progressBlockerRaised = ({
    recipientName,
    studentName,
    taskTitle,
    milestoneTitle,
    body,
    dashboardUrl
}) => {
    const subject = `${studentName} is blocked on "${taskTitle}"`;
    const html = interviewShell(
        PROGRESS_BAD_COLOR,
        'Blocker raised',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${studentName}</strong> has flagged a blocker on
        <strong>${taskTitle}</strong>${milestoneTitle ? ` (${milestoneTitle})` : ''}.</p>
        ${body ? `<div class="reason">${body}</div>` : ''}
        <p>Blocked work stalls quickly — a quick reply usually unsticks it.</p>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open the internship</a></p>` : ''}
        `
    );
    const text = `${studentName} raised a blocker on "${taskTitle}". ${body || ''}`;
    return { subject, html, text };
};

const progressBlockerResolved = ({
    recipientName,
    taskTitle,
    milestoneTitle,
    resolutionNote,
    dashboardUrl
}) => {
    const subject = `Blocker cleared on "${taskTitle}"`;
    const html = interviewShell(
        PROGRESS_GOOD_COLOR,
        'Blocker cleared',
        `
        <p>Hi ${recipientName},</p>
        <p>The blocker on <strong>${taskTitle}</strong>${
            milestoneTitle ? ` (${milestoneTitle})` : ''
        } has been marked resolved.</p>
        ${resolutionNote ? `<div class="reason">${resolutionNote}</div>` : ''}
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open the internship</a></p>` : ''}
        `
    );
    const text = `The blocker on "${taskTitle}" was resolved. ${resolutionNote || ''}`;
    return { subject, html, text };
};

const progressAtRisk = ({
    recipientName,
    studentName,
    taskTitle,
    health,
    progressPercent,
    reasons,
    dashboardUrl
}) => {
    const overdue = health === 'overdue';
    const subject = overdue
        ? `"${taskTitle}" is overdue`
        : `"${taskTitle}" is falling behind`;
    const html = interviewShell(
        overdue ? PROGRESS_BAD_COLOR : PROGRESS_WARN_COLOR,
        overdue ? 'Internship overdue' : 'Internship at risk',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${studentName}</strong>'s internship on <strong>${taskTitle}</strong>
        has moved to <strong>${overdue ? 'overdue' : 'at risk'}</strong>.</p>
        <div class="meta">
          ${progressMetaRows([{ label: 'Progress', value: `${progressPercent}%` }])}
        </div>
        ${reasons && reasons.length ? `<div class="reason"><strong>Why:</strong>${bulletList(reasons)}</div>` : ''}
        <p>Stepping in now is usually enough to bring it back on track.</p>
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Review the progress report</a></p>` : ''}
        `
    );
    const text = `${studentName}'s internship on "${taskTitle}" is ${
        overdue ? 'overdue' : 'at risk'
    } at ${progressPercent}%.`;
    return { subject, html, text };
};

const progressUpdatePosted = ({
    recipientName,
    authorName,
    taskTitle,
    updateType,
    preview,
    dashboardUrl
}) => {
    const label = updateType === 'checkin' ? 'check-in' : updateType.replace('_', ' ');
    const subject = `New ${label} on "${taskTitle}"`;
    const html = interviewShell(
        PROGRESS_HEADER_COLOR,
        'New progress update',
        `
        <p>Hi ${recipientName},</p>
        <p><strong>${authorName}</strong> posted a ${label} on <strong>${taskTitle}</strong>.</p>
        ${preview ? `<div class="meta"><div class="meta-row">${preview}</div></div>` : ''}
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open the internship</a></p>` : ''}
        `
    );
    const text = `${authorName} posted a ${label} on "${taskTitle}". ${preview || ''}`;
    return { subject, html, text };
};

const internshipStatusChanged = ({
    recipientName,
    taskTitle,
    status,
    reason,
    progressPercent,
    dashboardUrl
}) => {
    const titles = {
        paused: 'Internship paused',
        in_progress: 'Internship resumed',
        abandoned: 'Internship closed',
        completed: 'Internship completed'
    };
    const colors = {
        paused: PROGRESS_WARN_COLOR,
        in_progress: PROGRESS_HEADER_COLOR,
        abandoned: PROGRESS_BAD_COLOR,
        completed: PROGRESS_GOOD_COLOR
    };
    const headline = titles[status] || 'Internship updated';
    const subject = `${headline}: "${taskTitle}"`;
    const html = interviewShell(
        colors[status] || PROGRESS_HEADER_COLOR,
        headline,
        `
        <p>Hi ${recipientName},</p>
        <p>The internship <strong>${taskTitle}</strong> is now <strong>${String(status).replace('_', ' ')}</strong>.</p>
        <div class="meta">
          ${progressMetaRows([{ label: 'Progress at this point', value: `${progressPercent}%` }])}
        </div>
        ${reason ? `<div class="reason"><strong>Reason:</strong><br/>${reason}</div>` : ''}
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">Open the internship</a></p>` : ''}
        `
    );
    const text = `"${taskTitle}" is now ${status} (${progressPercent}% complete).${
        reason ? ` Reason: ${reason}` : ''
    }`;
    return { subject, html, text };
};

const internshipCompleted = ({
    recipientName,
    studentName,
    taskTitle,
    progressPercent,
    hoursLogged,
    performanceRating,
    completionNote,
    outstandingWork,
    dashboardUrl
}) => {
    const subject = `Internship completed: "${taskTitle}"`;
    const html = interviewShell(
        PROGRESS_GOOD_COLOR,
        'Internship completed',
        `
        <p>Hi ${recipientName},</p>
        <p>The internship <strong>${taskTitle}</strong>${
            studentName ? ` with <strong>${studentName}</strong>` : ''
        } has been marked complete.</p>
        <div class="meta">
          ${progressMetaRows([
              { label: 'Milestones complete', value: `${progressPercent}%` },
              { label: 'Hours logged', value: hoursLogged },
              { label: 'Performance rating', value: performanceRating ? `${performanceRating}/5` : null }
          ])}
        </div>
        ${completionNote ? `<div class="reason"><strong>Closing note:</strong><br/>${completionNote}</div>` : ''}
        ${
            outstandingWork
                ? '<div class="reason">Note: this internship was closed with required milestones still outstanding.</div>'
                : ''
        }
        ${dashboardUrl ? `<p><a href="${dashboardUrl}">View the final report</a></p>` : ''}
        `
    );
    const text = `"${taskTitle}" completed at ${progressPercent}% with ${hoursLogged} hours logged.`;
    return { subject, html, text };
};

module.exports = {
    getEmailVerificationTemplate,
    getOTPTemplate,
    getPasswordResetTemplate,
    getWelcomeTemplate,
    getApplicationStatusChangeTemplate,
    getApplicationWithdrawnTemplate,
    interviewScheduled,
    interviewRescheduled,
    interviewCancelled,
    mentorAssignmentRequested,
    mentorAssignmentAccepted,
    mentorAssignmentDeclined,
    mentorAssignmentCancelled,
    mentorNoteAdded,
    mentorVerificationDecision,
    milestoneAssigned,
    milestoneSubmitted,
    milestoneReviewed,
    progressBlockerRaised,
    progressBlockerResolved,
    progressAtRisk,
    progressUpdatePosted,
    internshipStatusChanged,
    internshipCompleted
};