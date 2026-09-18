const { Student, Company } = require('../models');
const ErrorResponse = require('../utils/errorResponse');
const aiService = require('../services/aiService');
const { canSeeSummary } = require('./feedbackController');
const {
    DEFAULT_TOP_LIMIT,
    MAX_TOP_LIMIT,
    TOP_PERFORMER_SCOPES,
    TOP_PERFORMERS_PREVIEW,
    normalizeMonths,
    buildStudentAnalytics,
    buildCompanyAnalytics,
    buildAdminAnalytics,
    runPerformanceInsights,
    loadStudentData,
    loadPerformanceRecords,
    topPerformersForCompany,
    loadCompanyData,
    loadAdminAggregates,
    buildStudentEarnings,
    buildCompanySpend,
    buildAdminPayments,
    loadStudentPayments,
    loadCompanyPayments,
    loadAdminPaymentAggregates
} = require('../services/analyticsService');

// Module 11 — every response is computed on read from the authoritative rows
// of Modules 3–10 (no analytics tables), so it always reflects the latest
// recorded activity.

const resolveStudent = (userId) => Student.findOne({ where: { userId } });
const resolveCompany = (userId) => Company.findOne({ where: { userId } });

const clampLimit = (value) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) return DEFAULT_TOP_LIMIT;
    return Math.min(MAX_TOP_LIMIT, Math.max(1, n));
};

// The student's analytics plus the AI performance insight on their record.
const studentPayload = async (studentId, { audience, months, now }) => {
    const data = await loadStudentData(studentId);
    const analytics = buildStudentAnalytics(data, { audience, months, now });
    const [record] = await loadPerformanceRecords([studentId], { now });
    const { results, aiGenerated } = await runPerformanceInsights([aiService.mapStudentPerformanceToDto(record)]);
    const payload = { studentId: String(studentId), ...analytics, aiGenerated, insight: results[0] || null };
    // Module 12 — earnings are private: only the student themself and an
    // admin see them, never a company or mentor weighing the student up.
    if (audience === 'self') {
        payload.earnings = buildStudentEarnings(await loadStudentPayments(studentId), { months, now });
    }
    return payload;
};

// @desc    The logged-in student's own analytics
// @route   GET /api/analytics/student?months=6|12
// @access  Private (student)
exports.getMyStudentAnalytics = async (req, res, next) => {
    try {
        const student = await resolveStudent(req.user.id);
        if (!student) return next(new ErrorResponse('Student profile not found', 404));
        const data = await studentPayload(student.id, {
            audience: 'self',
            months: normalizeMonths(req.query.months),
            now: new Date()
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    One student's performance analytics, for someone weighing them up
// @route   GET /api/analytics/students/:studentId?months=6|12
// @access  Private (the student | admin | a company they applied to | a mentor asked to guide them)
exports.getStudentAnalytics = async (req, res, next) => {
    try {
        const { studentId } = req.params;
        if (!/^\d+$/.test(String(studentId))) return next(new ErrorResponse('Student not found', 404));
        const student = await Student.findByPk(studentId, { attributes: ['id'] });
        if (!student) return next(new ErrorResponse('Student not found', 404));

        // The same rule as the Module 10 feedback summary.
        if (!(await canSeeSummary(req.user, student.id))) {
            return next(new ErrorResponse("Not authorized to view this student's analytics", 403));
        }

        // Only the student themself and an admin see the full picture; anyone
        // else gets performance data without the student's other applications.
        const audience = ['student', 'admin'].includes(req.user.role) ? 'self' : 'viewer';
        const data = await studentPayload(student.id, {
            audience,
            months: normalizeMonths(req.query.months),
            now: new Date()
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    The logged-in company's hiring and internship analytics
// @route   GET /api/analytics/company?months=6|12
// @access  Private (company)
exports.getCompanyAnalytics = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));
        const now = new Date();
        const data = await loadCompanyData(company.id, req.user.id);
        const analytics = buildCompanyAnalytics(data, { months: normalizeMonths(req.query.months), now });
        const top = await topPerformersForCompany(company.id, {
            scope: 'interns',
            limit: TOP_PERFORMERS_PREVIEW,
            now
        });
        res.status(200).json({
            success: true,
            data: {
                companyId: String(company.id),
                ...analytics,
                aiGenerated: top.aiGenerated,
                topPerformers: top.rankings,
                // Module 12 — what the company has paid its interns.
                spend: buildCompanySpend(await loadCompanyPayments(company.id), {
                    months: normalizeMonths(req.query.months),
                    now
                })
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Ranked students — the company's former interns, or its applicants
// @route   GET /api/analytics/company/top-performers?limit=10&scope=interns|applicants
// @access  Private (company)
exports.getTopPerformers = async (req, res, next) => {
    try {
        const company = await resolveCompany(req.user.id);
        if (!company) return next(new ErrorResponse('Company profile not found', 404));
        const scope = TOP_PERFORMER_SCOPES.includes(req.query.scope) ? req.query.scope : 'interns';
        const data = await topPerformersForCompany(company.id, {
            scope,
            limit: clampLimit(req.query.limit),
            now: new Date()
        });
        res.status(200).json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

// @desc    Platform analytics: growth and overall system health (US-18)
// @route   GET /api/analytics/admin?months=6|12
// @access  Private (admin)
exports.getAdminAnalytics = async (req, res, next) => {
    try {
        const months = normalizeMonths(req.query.months);
        const now = new Date();
        const [aggregates, paymentAggregates] = await Promise.all([
            loadAdminAggregates({ months, now }),
            loadAdminPaymentAggregates()
        ]);
        res.status(200).json({
            success: true,
            data: {
                ...buildAdminAnalytics(aggregates, { months, now }),
                // Module 12 — payment volume and platform fees.
                payments: buildAdminPayments(paymentAggregates)
            }
        });
    } catch (error) {
        next(error);
    }
};
