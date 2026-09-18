const { Op, fn, col } = require('sequelize');
const {
    User,
    Student,
    StudentSkill,
    Company,
    Mentor,
    Task,
    TaskSkill,
    Application,
    ApplicationStatusHistory,
    Interview,
    InternshipProgress,
    MilestoneSubmission,
    ProgressTimeLog,
    TaskEvaluationCriterion,
    InternshipEvaluation,
    EvaluationCriterionScore,
    Feedback,
    Payment
} = require('../models');
const aiService = require('./aiService');
const { summarizeFeedback } = require('./feedbackService');
const { byCurrencyTotals } = require('./paymentService');

// ---------------------------------------------------------------------------
// Module 11 — Performance Analytics
//
// No tables of its own: every number is recomputed on read from the rows of
// Modules 3–10, so the dashboards always reflect the latest recorded activity
// (the Module 8 rule "derived numbers are always recomputed"). The file has
// three layers:
//
//   1. pure builders over plain arrays (unit-tested without a database),
//   2. the JavaScript copy of ai-service/app/services/performance_insights.py
//      used when the AI service is unreachable (same constants, wording, order),
//   3. thin DB loaders that fetch only the columns the builders read.
//
// Months are bucketed in JavaScript on UTC dates rather than with SQL date
// functions, so MySQL and SQLite (the test harness) give identical results.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

const MONTH_OPTIONS = [6, 12];
const DEFAULT_MONTHS = 12;
const DEFAULT_TOP_LIMIT = 10;
const MAX_TOP_LIMIT = 50;
const TOP_PERFORMER_SCOPES = ['interns', 'applicants'];
// How many of the ranking the company dashboard shows inline.
const TOP_PERFORMERS_PREVIEW = 5;
const TOP_CATEGORIES = 8;
const TOP_COMPANIES = 5;

// The hiring pipeline in order. An application "reached" a stage when the
// furthest stage it ever held is at or beyond it, so the funnel never widens.
const FUNNEL_STAGES = ['submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'accepted'];
const DECIDED_STATUSES = ['accepted', 'rejected'];
const GRADES = ['A', 'B', 'C', 'D', 'F'];
const TASK_STATUSES = ['draft', 'active', 'paused', 'closed', 'completed'];
// A skill's score moved by at least this many points between its first and
// latest evaluation before it is called improving / declining.
const SKILL_TREND_THRESHOLD = 5;

const METRICS = TaskEvaluationCriterion.METRICS;

// Half-up, identical to the Python `_round` (floor(x·10^p + 0.5) / 10^p), so
// both sides of the AI contract produce the same digits.
const roundTo = (value, places) => {
    const f = 10 ** places;
    return Math.floor(Number(value) * f + 0.5) / f;
};
const plain = (r) => (r && typeof r.get === 'function' ? r.get({ plain: true }) : r);
const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const sumOf = (values) => values.reduce((a, b) => a + b, 0);
const meanOf = (values, places) => (values.length ? roundTo(sumOf(values) / values.length, places) : null);
// A 0..1 share, 3dp; null when there is nothing to divide by.
const rateOf = (part, whole) => (whole > 0 ? roundTo(part / whole, 3) : null);
const byId = (a, b) => Number(a.id) - Number(b.id);
const timeOf = (d) => (d ? new Date(d).getTime() : 0);

const countBy = (rows, key, keys) => {
    const out = keys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
    rows.forEach((r) => {
        if (Object.prototype.hasOwnProperty.call(out, r[key])) out[r[key]] += 1;
    });
    return out;
};

// Group-by rows ({ <key>: value, count }) → a zero-filled map.
const countsFromGroups = (groups, key, keys) => {
    const out = keys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
    (groups || []).forEach((g) => {
        const k = g[key];
        if (k == null) return;
        if (!keys.includes(k) && keys.length) return;
        out[k] = (out[k] || 0) + (Number(g.count) || 0);
    });
    return out;
};

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

const normalizeMonths = (value) => {
    const n = parseInt(value, 10);
    return MONTH_OPTIONS.includes(n) ? n : DEFAULT_MONTHS;
};

// 'YYYY-MM' in UTC. A DATEONLY column ('2026-03-31') is taken literally so a
// work date never shifts month with the server's time zone.
const monthKey = (value) => {
    if (value == null) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 7);
};

// The last `months` month keys, oldest first, ending with the month of `now`.
const lastMonthKeys = (months, now = new Date()) => {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const keys = [];
    for (let i = months - 1; i >= 0; i -= 1) {
        keys.push(new Date(Date.UTC(y, m - i, 1)).toISOString().slice(0, 7));
    }
    return keys;
};

// First instant of the oldest month in the window.
const windowStart = (months, now = new Date()) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

// Zero-filled monthly series. `series` maps an output field to
// [items, dateOf(item), valueOf(item) (default 1 = count)]. Items outside the
// window are ignored.
const monthlySeries = (months, now, series, places = 2) => {
    const keys = lastMonthKeys(months, now);
    const rows = keys.map((month) => {
        const row = { month };
        Object.keys(series).forEach((field) => { row[field] = 0; });
        return row;
    });
    const index = new Map(keys.map((k, i) => [k, i]));
    Object.entries(series).forEach(([field, [items, dateOf, valueOf]]) => {
        (items || []).forEach((item) => {
            const i = index.get(monthKey(dateOf(item)));
            if (i == null) return;
            rows[i][field] += valueOf ? Number(valueOf(item)) || 0 : 1;
        });
    });
    rows.forEach((row) => {
        Object.keys(series).forEach((field) => { row[field] = roundTo(row[field], places); });
    });
    return rows;
};

// ---------------------------------------------------------------------------
// Shared pure pieces
// ---------------------------------------------------------------------------

// Finalized evaluations only — a draft is not a fact yet — oldest first.
const finalizedEvaluations = (evaluations = []) =>
    evaluations
        .map(plain)
        .filter((e) => e && e.status === 'finalized' && num(e.finalScore) != null)
        .sort((a, b) => (timeOf(a.finalizedAt) - timeOf(b.finalizedAt)) || byId(a, b));

const criterionScore = (c) => (num(c.finalScore) != null ? num(c.finalScore) : num(c.autoScore));

// Average final criterion score per Module 9 metric across the given
// (finalized) evaluations, in metric order; metrics never scored are omitted.
const criteriaAverages = (evaluations = []) =>
    METRICS.map((metric) => {
        const values = [];
        evaluations.forEach((e) => {
            (e.criteria || []).map(plain).forEach((c) => {
                const v = criterionScore(c);
                if (c.metric === metric && v != null) values.push(v);
            });
        });
        return { metric, average: meanOf(values, 2), samples: values.length };
    }).filter((row) => row.samples > 0);

const summarizeApplications = (applications = []) => {
    const byStatus = countBy(applications, 'status', Application.STATUSES);
    const decided = byStatus.accepted + byStatus.rejected;
    return {
        total: applications.length,
        byStatus,
        // Of the applications a company decided on, the share it accepted.
        acceptanceRate: rateOf(byStatus.accepted, decided)
    };
};

const onTimeRate = (submissions = []) =>
    rateOf(submissions.filter((s) => !s.wasLate).length, submissions.length);

const isLive = (p) => !InternshipProgress.TERMINAL_STATUSES.includes(p.status);

// ---------------------------------------------------------------------------
// Student analytics
// ---------------------------------------------------------------------------

const skillKey = (name) => String(name == null ? '' : name).trim().toLowerCase();
const codePointOrder = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// "Skill improvements over time": every skill on the profile or required by
// the task of a completed internship, with the finalized scores of the
// internships that used it, oldest first. Names match case-insensitively.
const skillGrowth = ({ profileSkills = [], internships = [], evaluations = [] } = {}) => {
    const skills = new Map();
    const ensure = (name, level) => {
        const key = skillKey(name);
        if (!key) return null;
        if (!skills.has(key)) {
            skills.set(key, { key, name: String(name).trim(), profileLevel: level || null, progressIds: new Set() });
        }
        return skills.get(key);
    };

    profileSkills.map(plain).forEach((s) => ensure(s.name, s.level));
    internships.map(plain).filter((p) => p.status === 'completed').forEach((p) => {
        const required = (p.task && Array.isArray(p.task.skillsRequired) ? p.task.skillsRequired : []).map(plain);
        required.forEach((s) => {
            const entry = ensure(s.name, null);
            if (entry) entry.progressIds.add(String(p.id));
        });
    });

    const finalizedByProgress = new Map(
        finalizedEvaluations(evaluations).map((e) => [String(e.progressId), e])
    );

    return [...skills.values()]
        .map((s) => {
            const scores = [...s.progressIds]
                .map((pid) => finalizedByProgress.get(pid))
                .filter(Boolean)
                .sort((a, b) => (timeOf(a.finalizedAt) - timeOf(b.finalizedAt)) || byId(a, b))
                .map((e) => ({
                    finalizedAt: e.finalizedAt,
                    finalScore: num(e.finalScore),
                    taskTitle: e.task ? e.task.title : null
                }));
            const firstScore = scores.length ? scores[0].finalScore : null;
            const latestScore = scores.length ? scores[scores.length - 1].finalScore : null;
            const change = scores.length >= 2 ? roundTo(latestScore - firstScore, 2) : null;
            let trend = 'insufficient_data';
            if (change != null) {
                if (change >= SKILL_TREND_THRESHOLD) trend = 'improving';
                else if (change <= -SKILL_TREND_THRESHOLD) trend = 'declining';
                else trend = 'stable';
            }
            return {
                name: s.name,
                profileLevel: s.profileLevel,
                internships: s.progressIds.size,
                scores,
                firstScore,
                latestScore,
                change,
                trend,
                _key: s.key
            };
        })
        .sort((a, b) =>
            (b.internships - a.internships) ||
            (b.scores.length - a.scores.length) ||
            codePointOrder(a._key, b._key)
        )
        .map(({ _key, ...row }) => row);
};

const scoreHistory = (evaluations = []) =>
    finalizedEvaluations(evaluations).map((e) => ({
        evaluationId: String(e.id),
        progressId: e.progressId != null ? String(e.progressId) : null,
        taskTitle: e.task ? e.task.title : null,
        companyName: e.company ? e.company.companyName : null,
        finalScore: num(e.finalScore),
        grade: e.grade || InternshipEvaluation.gradeFor(e.finalScore),
        finalizedAt: e.finalizedAt
    }));

// audience 'self' — the student (or an admin); 'viewer' — a company or
// mentor weighing the student up: their applications and interviews with
// other organisations are none of the viewer's business, so they are dropped.
const buildStudentAnalytics = (data = {}, { audience = 'self', months = DEFAULT_MONTHS, now = new Date() } = {}) => {
    const applications = (data.applications || []).map(plain);
    const interviews = (data.interviews || []).map(plain);
    const internships = (data.internships || []).map(plain);
    const timeLogs = (data.timeLogs || []).map(plain);
    const submissions = (data.submissions || []).map(plain);
    const evaluations = data.evaluations || [];
    const finalized = finalizedEvaluations(evaluations);
    const feedback = summarizeFeedback(data.feedback || []);
    const internshipsByStatus = countBy(internships, 'status', InternshipProgress.STATUSES);

    const summary = {
        applications: summarizeApplications(applications),
        interviews: {
            total: interviews.length,
            completed: interviews.filter((i) => i.status === 'completed').length
        },
        internships: {
            total: internships.length,
            byStatus: internshipsByStatus,
            completed: internshipsByStatus.completed,
            active: internships.filter(isLive).length
        },
        hoursLogged: roundTo(sumOf(timeLogs.map((l) => Number(l.hours) || 0)), 2),
        finalizedEvaluations: finalized.length,
        averageEvaluationScore: meanOf(finalized.map((e) => num(e.finalScore)), 2),
        latestGrade: finalized.length
            ? finalized[finalized.length - 1].grade ||
              InternshipEvaluation.gradeFor(finalized[finalized.length - 1].finalScore)
            : null,
        feedback: {
            count: feedback.count,
            averageOverall: feedback.averageOverall,
            recommendRate: feedback.recommendRate
        },
        onTimeSubmissionRate: onTimeRate(submissions)
    };
    if (audience === 'viewer') {
        delete summary.applications;
        delete summary.interviews;
    }

    return {
        audience,
        months,
        generatedAt: now.toISOString(),
        summary,
        scoreHistory: scoreHistory(finalized),
        hoursByMonth: monthlySeries(months, now, { hours: [timeLogs, (l) => l.workDate, (l) => l.hours] }),
        criteriaAverages: criteriaAverages(finalized),
        skills: skillGrowth({ profileSkills: data.profileSkills || [], internships, evaluations: finalized })
    };
};

// ---------------------------------------------------------------------------
// Company analytics
// ---------------------------------------------------------------------------

const STAGE_INDEX = new Map(FUNNEL_STAGES.map((s, i) => [s, i]));

// Counts of applications that reached each stage. Status history (Module 4)
// shows stages an application passed through before being rejected or
// withdrawn; without history only the current status is known.
const buildFunnel = (applications = [], history = []) => {
    const furthest = new Map();
    applications.map(plain).forEach((a) => {
        furthest.set(String(a.id), STAGE_INDEX.has(a.status) ? STAGE_INDEX.get(a.status) : 0);
    });
    history.map(plain).forEach((h) => {
        const key = String(h.applicationId);
        if (!furthest.has(key) || !STAGE_INDEX.has(h.toStatus)) return;
        furthest.set(key, Math.max(furthest.get(key), STAGE_INDEX.get(h.toStatus)));
    });
    const reached = [...furthest.values()];
    return FUNNEL_STAGES.map((stage, i) => {
        const count = reached.filter((v) => v >= i).length;
        return { stage, count, rate: rateOf(count, applications.length) };
    });
};

// Mean days from submission to an accept / reject decision, 1dp.
const averageDaysToDecision = (applications = []) =>
    meanOf(
        applications
            .map(plain)
            .filter((a) => DECIDED_STATUSES.includes(a.status) && a.decidedAt && a.submittedAt)
            .map((a) => (timeOf(a.decidedAt) - timeOf(a.submittedAt)) / DAY_MS),
        1
    );

const gradeDistribution = (finalized = []) => {
    const out = GRADES.reduce((acc, g) => ({ ...acc, [g]: 0 }), {});
    finalized.forEach((e) => {
        const g = e.grade || InternshipEvaluation.gradeFor(e.finalScore);
        if (g && out[g] != null) out[g] += 1;
    });
    return out;
};

const summarizeInternships = (internships = []) => {
    const live = internships.filter(isLive);
    return {
        total: internships.length,
        byStatus: countBy(internships, 'status', InternshipProgress.STATUSES),
        // Health only means something while the work is still going on.
        byHealth: countBy(live, 'healthStatus', InternshipProgress.HEALTH_STATUSES),
        // Mean completion of the live internships, 1dp.
        averageProgress: meanOf(live.map((p) => Number(p.progressPercent) || 0), 1)
    };
};

const buildCompanyAnalytics = (data = {}, { months = DEFAULT_MONTHS, now = new Date() } = {}) => {
    const tasks = (data.tasks || []).map(plain);
    const applications = (data.applications || []).map(plain);
    const interviews = (data.interviews || []).map(plain);
    const internships = (data.internships || []).map(plain);
    const evaluations = (data.evaluations || []).map(plain);
    const finalized = finalizedEvaluations(evaluations);
    const given = (data.feedbackGiven || []).map(plain);
    const appStatus = countBy(applications, 'status', Application.STATUSES);

    const taskRows = tasks
        .map((t) => {
            const apps = applications.filter((a) => String(a.taskId) === String(t.id));
            const taskEvals = finalized.filter((e) => String(e.taskId) === String(t.id));
            return {
                taskId: String(t.id),
                title: t.title,
                status: t.status,
                applications: apps.length,
                accepted: apps.filter((a) => a.status === 'accepted').length,
                completedInternships: internships.filter(
                    (p) => String(p.taskId) === String(t.id) && p.status === 'completed'
                ).length,
                averageEvaluationScore: meanOf(taskEvals.map((e) => num(e.finalScore)), 2)
            };
        })
        .sort((a, b) => (b.applications - a.applications) || (Number(a.taskId) - Number(b.taskId)));

    return {
        months,
        generatedAt: now.toISOString(),
        summary: {
            tasks: { total: tasks.length, byStatus: countBy(tasks, 'status', TASK_STATUSES) },
            applications: { total: applications.length, byStatus: appStatus },
            funnel: buildFunnel(applications, data.history || []),
            conversionRate: rateOf(appStatus.accepted, applications.length),
            avgDaysToDecision: averageDaysToDecision(applications),
            interviews: {
                total: interviews.length,
                completed: interviews.filter((i) => i.status === 'completed').length,
                no_show: interviews.filter((i) => i.status === 'no_show').length
            },
            internships: summarizeInternships(internships),
            evaluations: {
                finalized: finalized.length,
                drafts: evaluations.filter((e) => e.status === 'draft').length,
                averageScore: meanOf(finalized.map((e) => num(e.finalScore)), 2),
                gradeDistribution: gradeDistribution(finalized)
            },
            feedbackGiven: {
                count: given.length,
                averageOverall: meanOf(given.map((f) => Number(f.overallRating)).filter((v) => !Number.isNaN(v)), 2)
            }
        },
        monthly: monthlySeries(months, now, {
            applications: [applications, (a) => a.submittedAt],
            acceptances: [applications.filter((a) => a.status === 'accepted'), (a) => a.decidedAt],
            completions: [internships.filter((p) => p.status === 'completed'), (p) => p.completedAt]
        }, 0),
        tasks: taskRows
    };
};

// ---------------------------------------------------------------------------
// Admin analytics — shaped from GROUP BY results, never from every row
// ---------------------------------------------------------------------------

const buildAdminAnalytics = (agg = {}, { months = DEFAULT_MONTHS, now = new Date() } = {}) => {
    const byRole = countsFromGroups(agg.userRoleGroups, 'role', ['student', 'company', 'mentor', 'admin']);
    const taskStatus = countsFromGroups(agg.taskStatusGroups, 'status', TASK_STATUSES);
    const appStatus = countsFromGroups(agg.applicationStatusGroups, 'status', Application.STATUSES);
    const evalStatus = countsFromGroups(agg.evaluationStatusGroups, 'status', InternshipEvaluation.STATUSES);
    const aiGroups = (agg.evaluationAiGroups || []);
    const aiCount = sumOf(aiGroups
        .filter((g) => g.aiGenerated === true || g.aiGenerated === 1 || g.aiGenerated === '1')
        .map((g) => Number(g.count) || 0));
    const evalTotal = evalStatus.draft + evalStatus.finalized;
    const feedbackContext = countsFromGroups(agg.feedbackContextGroups, 'context', Feedback.CONTEXTS);

    const byCategory = (agg.taskCategoryGroups || [])
        .map((g) => ({ category: g.category, count: Number(g.count) || 0 }))
        .filter((g) => g.category != null && g.count > 0)
        .sort((a, b) => (b.count - a.count) || codePointOrder(a.category, b.category))
        .slice(0, TOP_CATEGORIES);

    const applicationRows = (agg.recentApplications || []).map(plain);

    return {
        months,
        generatedAt: now.toISOString(),
        users: {
            total: sumOf(Object.values(byRole)),
            byRole,
            newByMonth: monthlySeries(months, now, {
                users: [(agg.recentUsers || []).map(plain), (u) => u.createdAt]
            }, 0)
        },
        companies: { total: Number(agg.companyCount) || 0 },
        mentors: {
            byVerificationStatus: countsFromGroups(agg.mentorStatusGroups, 'verificationStatus', Mentor.VERIFICATION_STATUSES)
        },
        tasks: { total: sumOf(Object.values(taskStatus)), byStatus: taskStatus, byCategory },
        applications: {
            total: sumOf(Object.values(appStatus)),
            byStatus: appStatus,
            monthly: monthlySeries(months, now, {
                applications: [applicationRows, (a) => a.submittedAt],
                acceptances: [applicationRows.filter((a) => a.status === 'accepted'), (a) => a.decidedAt],
                completions: [(agg.recentCompletions || []).map(plain), (p) => p.completedAt]
            }, 0)
        },
        interviews: { byStatus: countsFromGroups(agg.interviewStatusGroups, 'status', Interview.STATUSES) },
        internships: {
            byStatus: countsFromGroups(agg.progressStatusGroups, 'status', InternshipProgress.STATUSES),
            byHealth: countsFromGroups(agg.liveHealthGroups, 'healthStatus', InternshipProgress.HEALTH_STATUSES),
            averageProgress: num(agg.liveAverageProgress) != null ? roundTo(agg.liveAverageProgress, 1) : null,
            totalHoursLogged: roundTo(Number(agg.totalHoursLogged) || 0, 2)
        },
        evaluations: {
            total: evalTotal,
            finalized: evalStatus.finalized,
            averageScore: num(agg.finalizedAverageScore) != null ? roundTo(agg.finalizedAverageScore, 2) : null,
            gradeDistribution: countsFromGroups(agg.gradeGroups, 'grade', GRADES),
            // Share of evaluations whose scores came from the AI service rather
            // than the backend's fallback rules — a health signal for Module 9.
            aiGeneratedShare: rateOf(aiCount, evalTotal)
        },
        feedback: {
            total: sumOf(Object.values(feedbackContext)),
            averageOverall: num(agg.feedbackAverage) != null ? roundTo(agg.feedbackAverage, 2) : null,
            byContext: feedbackContext
        },
        topCompanies: (agg.completionGroups || [])
            .map((g) => ({
                companyId: String(g.companyId),
                companyName: (agg.companyNames || {})[String(g.companyId)] || null,
                completedInternships: Number(g.count) || 0
            }))
            .sort((a, b) => (b.completedInternships - a.completedInternships) || (Number(a.companyId) - Number(b.companyId)))
            .slice(0, TOP_COMPANIES),
        aiHealth: agg.aiHealth || null
    };
};

// ---------------------------------------------------------------------------
// Performance insights — JavaScript copy of performance_insights.py
// ---------------------------------------------------------------------------

const EVALUATION_WEIGHT = 0.5;
const FEEDBACK_WEIGHT = 0.2;
const RELIABILITY_WEIGHT = 0.15;
const ON_TIME_WEIGHT = 0.15;
const RECENCY_HALF_LIFE_DAYS = 180;
const RECENCY_MIN_WEIGHT = 0.01;
const BANDS = [[85, 'excellent'], [70, 'strong'], [50, 'developing']];
const LOWEST_BAND = 'needs_support';
const TREND_THRESHOLD = 3;
const MIN_TREND_EVALUATIONS = 2;
const MIN_PREDICTION_EVALUATIONS = 3;
const CONFIDENCE_FULL_EVALUATIONS = 4;
const CONFIDENCE_EVALUATION_SHARE = 0.6;
const CONFIDENCE_FEEDBACK_SHARE = 0.2;
const CONFIDENCE_ON_TIME_SHARE = 0.2;
const STRENGTH_AT = 80;
const FOCUS_BELOW = 60;
const MAX_AREAS = 3;
const MAX_INSIGHTS = 3;
const METRIC_LABELS = {
    quality: 'Quality of work',
    timeliness: 'Timeliness',
    completion: 'Scope completion',
    communication: 'Communication',
    effort: 'Effort & commitment',
    reliability: 'Reliability'
};
// Reliability and on-time delivery alone never produce an index (see the
// Python module): at least one finalized evaluation or piece of feedback.
const NO_DATA_SENTENCE =
    'Not enough recorded performance yet: an index needs at least one finalized ' +
    'evaluation or one piece of feedback.';

// String(n) matches Python's `_fmt` (int text for whole numbers, shortest
// round-trip repr otherwise) for every magnitude used here.
const fmt = (v) => String(v);
const plural = (n, word) => (n === 1 ? word : `${word}s`);

const recencyWeight = (daysAgo) =>
    Math.max(RECENCY_MIN_WEIGHT, roundTo(0.5 ** (daysAgo / RECENCY_HALF_LIFE_DAYS), 6));

// [score, daysAgo] oldest first; ties keep input order.
const chronologicalScores = (dto) =>
    (dto.evaluations || [])
        .map((e, i) => ({ e, i }))
        .sort((a, b) => (b.e.finalized_days_ago - a.e.finalized_days_ago) || (a.i - b.i))
        .map(({ e }) => [Number(e.score), Number(e.finalized_days_ago)]);

const recencyWeightedMean = (ordered) => {
    if (ordered.length === 0) return null;
    let weightTotal = 0;
    let total = 0;
    ordered.forEach(([score, days]) => {
        const w = recencyWeight(days);
        weightTotal += w;
        total += w * score;
    });
    return total / weightTotal;
};

const componentsFor = (dto, ordered) => {
    const out = [];
    const mean = recencyWeightedMean(ordered);
    if (mean != null) out.push([EVALUATION_WEIGHT, mean]);
    if (dto.feedback_average != null) out.push([FEEDBACK_WEIGHT, ((Number(dto.feedback_average) - 1) / 4) * 100]);
    const closed = dto.completed_internships + dto.abandoned_internships;
    if (closed > 0) out.push([RELIABILITY_WEIGHT, (dto.completed_internships / closed) * 100]);
    if (dto.on_time_rate != null) out.push([ON_TIME_WEIGHT, Number(dto.on_time_rate) * 100]);
    return out;
};

const performanceIndex = (components) => {
    if (components.length === 0) return 0;
    let weightTotal = 0;
    let total = 0;
    components.forEach(([weight, value]) => {
        weightTotal += weight;
        total += weight * value;
    });
    return Math.min(100, Math.max(0, roundTo(total / weightTotal, 1)));
};

const bandFor = (index, hasData) => {
    if (!hasData) return 'insufficient_data';
    const hit = BANDS.find(([threshold]) => index >= threshold);
    return hit ? hit[1] : LOWEST_BAND;
};

const trendFor = (scores) => {
    const n = scores.length;
    if (n < MIN_TREND_EVALUATIONS) return { trend: 'insufficient_data', slope: null, predicted: null };
    const xMean = (n - 1) / 2;
    let yTotal = 0;
    scores.forEach((y) => { yTotal += y; });
    const yMean = yTotal / n;
    let numerator = 0;
    let denominator = 0;
    scores.forEach((y, i) => {
        const dx = i - xMean;
        numerator += dx * (y - yMean);
        denominator += dx * dx;
    });
    const raw = numerator / denominator;
    const slope = roundTo(raw, 2);
    let trend = 'stable';
    if (slope >= TREND_THRESHOLD) trend = 'improving';
    else if (slope <= -TREND_THRESHOLD) trend = 'declining';
    const predicted = n >= MIN_PREDICTION_EVALUATIONS
        ? roundTo(Math.min(100, Math.max(0, yMean + raw * (n - xMean))), 1)
        : null;
    return { trend, slope, predicted };
};

const confidenceFor = (dto, n, hasData) => {
    if (!hasData) return 0;
    let value = Math.min(1, n / CONFIDENCE_FULL_EVALUATIONS) * CONFIDENCE_EVALUATION_SHARE;
    value += dto.feedback_count > 0 ? CONFIDENCE_FEEDBACK_SHARE : 0;
    value += dto.on_time_rate != null ? CONFIDENCE_ON_TIME_SHARE : 0;
    return roundTo(value, 3);
};

const areasFor = (averages = {}) => {
    const items = METRICS.filter((m) => averages[m] != null).map((m) => [m, Number(averages[m])]);
    const order = (m) => METRICS.indexOf(m);
    const bestFirst = [...items].sort((a, b) => (b[1] - a[1]) || (order(a[0]) - order(b[0])));
    const worstFirst = [...items].sort((a, b) => (a[1] - b[1]) || (order(a[0]) - order(b[0])));
    return {
        strengths: bestFirst.filter(([, v]) => v >= STRENGTH_AT).map(([m]) => METRIC_LABELS[m]).slice(0, MAX_AREAS),
        focus: worstFirst.filter(([, v]) => v < FOCUS_BELOW).map(([m]) => METRIC_LABELS[m]).slice(0, MAX_AREAS)
    };
};

const insightsFor = (dto, scores, { trend, slope, predicted }, hasData) => {
    if (!hasData) return [NO_DATA_SENTENCE];
    const n = scores.length;
    const out = [];
    if (n === 0) {
        out.push('No finalized evaluations yet, so there is no score trend to show.');
    } else if (n === 1) {
        out.push(`Only one finalized evaluation so far (${fmt(scores[0])}/100); a trend needs at least two.`);
    } else if (trend === 'improving') {
        out.push(`Scores are improving by about ${fmt(Math.abs(slope))} points per evaluation across ${n} evaluations.`);
    } else if (trend === 'declining') {
        out.push(`Scores are declining by about ${fmt(Math.abs(slope))} points per evaluation across ${n} evaluations.`);
    } else {
        out.push(`Scores are steady across ${n} evaluations (within ${fmt(TREND_THRESHOLD)} points per evaluation).`);
    }

    if (predicted != null) {
        out.push(`If this trend continues, the next evaluation is projected at about ${fmt(predicted)}/100.`);
    }

    const closed = dto.completed_internships + dto.abandoned_internships;
    if (closed > 0) {
        out.push(
            `Finished ${dto.completed_internships} of ${closed} ${plural(closed, 'internship')} ` +
            '(completed rather than abandoned).'
        );
    }

    if (dto.feedback_count > 0 && dto.feedback_average != null) {
        let text =
            `Average feedback rating ${fmt(roundTo(dto.feedback_average, 2))}/5 from ` +
            `${dto.feedback_count} ${plural(dto.feedback_count, 'review')}`;
        if (dto.recommend_rate != null) text += `, ${fmt(roundTo(dto.recommend_rate * 100, 0))}% would recommend`;
        out.push(`${text}.`);
    }

    if (dto.on_time_rate != null) {
        out.push(`Delivered ${fmt(roundTo(dto.on_time_rate * 100, 0))}% of milestone submissions on time.`);
    }

    return out.slice(0, MAX_INSIGHTS);
};

const analyzeStudentPerformance = (dto) => {
    const ordered = chronologicalScores(dto);
    const scores = ordered.map(([score]) => score);
    const components = componentsFor(dto, ordered);
    const hasData = scores.length > 0 || dto.feedback_average != null;
    const index = hasData ? performanceIndex(components) : 0;
    const t = trendFor(scores);
    const { strengths, focus } = areasFor(dto.criteria_averages);
    return {
        id: dto.id,
        performance_index: index,
        band: bandFor(index, hasData),
        trend: t.trend,
        trend_slope: t.slope,
        predicted_next_score: t.predicted,
        confidence: confidenceFor(dto, scores.length, hasData),
        strengths,
        focus_areas: focus,
        insights: insightsFor(dto, scores, t, hasData)
    };
};

// Same response shape as POST /performance-insights. `dtos` must already have
// gone through aiService.mapStudentPerformanceToDto, like the AI request.
const fallbackPerformanceInsights = (dtos = []) => ({ results: dtos.map(analyzeStudentPerformance) });

// An AI answer is only used when it has the full shape, one result per
// student in the same order; anything else is treated like an outage.
const isUsableInsights = (result, dtos) =>
    !!result &&
    Array.isArray(result.results) &&
    result.results.length === dtos.length &&
    result.results.every((r, i) =>
        r &&
        String(r.id) === String(dtos[i].id) &&
        Number.isFinite(Number(r.performance_index)) &&
        typeof r.band === 'string' &&
        typeof r.trend === 'string' &&
        Number.isFinite(Number(r.confidence)) &&
        ['strengths', 'focus_areas', 'insights'].every((k) => Array.isArray(r[k]))
    );

// AI first (in batches the endpoint accepts), deterministic fallback on
// outage — the Module 8–10 pattern. All-or-nothing, so one response never
// mixes AI and fallback results.
const runPerformanceInsights = async (dtos = []) => {
    if (dtos.length === 0) return { results: [], aiGenerated: false };
    try {
        const results = [];
        for (let i = 0; i < dtos.length; i += aiService.PERFORMANCE_BATCH_LIMIT) {
            const chunk = dtos.slice(i, i + aiService.PERFORMANCE_BATCH_LIMIT);
            const result = await aiService.getPerformanceInsights(chunk);
            if (!isUsableInsights(result, chunk)) {
                throw new aiService.AIServiceUnavailableError('response did not have the insights shape');
            }
            results.push(...result.results);
        }
        return { results, aiGenerated: true };
    } catch (err) {
        if (!(err instanceof aiService.AIServiceUnavailableError)) throw err;
        console.warn('[analytics] AI unavailable, using fallback rules:', err.message);
        return { ...fallbackPerformanceInsights(dtos), aiGenerated: false };
    }
};

// ---------------------------------------------------------------------------
// Performance records and the top-performer ranking (pure)
// ---------------------------------------------------------------------------

const daysAgo = (date, now) => (date ? Math.max(0, Math.floor((now.getTime() - timeOf(date)) / DAY_MS)) : 0);

// One student's track record in the /performance-insights input shape.
// Only finalized evaluations count; feedback has no draft state.
const studentPerformanceRecord = (
    { studentId, evaluations = [], internships = [], submissions = [], feedback = [] } = {},
    now = new Date()
) => {
    const finalized = finalizedEvaluations(evaluations);
    const fb = summarizeFeedback(feedback);
    const closed = internships.map(plain);
    return {
        id: String(studentId),
        evaluations: finalized.map((e) => ({
            score: num(e.finalScore),
            finalized_days_ago: daysAgo(e.finalizedAt, now)
        })),
        criteria_averages: criteriaAverages(finalized).reduce((acc, c) => ({ ...acc, [c.metric]: c.average }), {}),
        feedback_average: fb.averageOverall,
        feedback_count: fb.count,
        recommend_rate: fb.recommendRate,
        completed_internships: closed.filter((p) => p.status === 'completed').length,
        abandoned_internships: closed.filter((p) => p.status === 'abandoned').length,
        on_time_rate: onTimeRate(submissions.map(plain))
    };
};

const studentCard = (s) => {
    const p = plain(s) || {};
    return {
        id: String(p.id),
        firstName: p.firstName || null,
        lastName: p.lastName || null,
        headline: p.headline || null,
        profilePicture: p.profilePicture || null
    };
};

// Ranks by performance index (desc); ties: more finalized evaluations, then
// the higher feedback average, then the lower student id. Students with no
// recorded performance at all are left out of the ranking and counted.
const rankTopPerformers = (dtos = [], results = [], students = [], limit = DEFAULT_TOP_LIMIT) => {
    const insightById = new Map(results.map((r) => [String(r.id), r]));
    const studentById = new Map(students.map(plain).map((s) => [String(s.id), s]));
    const rows = dtos.map((dto) => {
        const r = insightById.get(String(dto.id)) || {};
        return {
            student: studentCard(studentById.get(String(dto.id)) || { id: dto.id }),
            performanceIndex: Number(r.performance_index) || 0,
            band: r.band || 'insufficient_data',
            trend: r.trend || 'insufficient_data',
            predictedNextScore: r.predicted_next_score != null ? Number(r.predicted_next_score) : null,
            confidence: Number(r.confidence) || 0,
            averageEvaluationScore: meanOf(dto.evaluations.map((e) => e.score), 2),
            evaluationCount: dto.evaluations.length,
            feedbackAverage: dto.feedback_average,
            completedInternships: dto.completed_internships,
            strengths: Array.isArray(r.strengths) ? r.strengths : []
        };
    });
    const rated = rows.filter((r) => r.band !== 'insufficient_data');
    rated.sort((a, b) =>
        (b.performanceIndex - a.performanceIndex) ||
        (b.evaluationCount - a.evaluationCount) ||
        ((b.feedbackAverage != null ? b.feedbackAverage : -1) - (a.feedbackAverage != null ? a.feedbackAverage : -1)) ||
        (Number(a.student.id) - Number(b.student.id))
    );
    return {
        candidates: rows.length,
        unrated: rows.length - rated.length,
        rankings: rated.slice(0, limit).map((r, i) => ({ rank: i + 1, ...r }))
    };
};

// ---------------------------------------------------------------------------
// DB loaders — fetch only what the builders read
// ---------------------------------------------------------------------------

const loadStudentData = async (studentId) => {
    const [applications, interviews, internships, timeLogs, submissions, evaluations, feedback, profileSkills] =
        await Promise.all([
            Application.findAll({ where: { studentId }, attributes: ['id', 'taskId', 'status', 'submittedAt', 'decidedAt'] }),
            Interview.findAll({ where: { studentId }, attributes: ['id', 'status'] }),
            InternshipProgress.findAll({
                where: { studentId },
                attributes: ['id', 'taskId', 'companyId', 'status', 'healthStatus', 'progressPercent', 'completedAt'],
                include: [{
                    model: Task,
                    as: 'task',
                    attributes: ['id', 'title'],
                    include: [{ model: TaskSkill, as: 'skillsRequired', attributes: ['name'] }]
                }]
            }),
            ProgressTimeLog.findAll({ where: { studentId }, attributes: ['id', 'workDate', 'hours'] }),
            MilestoneSubmission.findAll({ where: { studentId }, attributes: ['id', 'wasLate'] }),
            InternshipEvaluation.findAll({
                where: { studentId, status: 'finalized' },
                attributes: ['id', 'progressId', 'taskId', 'companyId', 'status', 'finalScore', 'grade', 'finalizedAt'],
                include: [
                    { model: EvaluationCriterionScore, as: 'criteria', attributes: ['id', 'metric', 'finalScore', 'autoScore'] },
                    { model: Task, as: 'task', attributes: ['id', 'title'] },
                    { model: Company, as: 'company', attributes: ['id', 'companyName'] }
                ]
            }),
            Feedback.findAll({ where: { studentId } }),
            StudentSkill.findAll({ where: { studentId }, attributes: ['id', 'name', 'level'] })
        ]);
    return { applications, interviews, internships, timeLogs, submissions, evaluations, feedback, profileSkills };
};

// Performance records for many students in a fixed number of queries. With
// `companyId`, only what happened with that company counts.
const loadPerformanceRecords = async (studentIds = [], { companyId = null, now = new Date() } = {}) => {
    const ids = [...new Set(studentIds.map(String))];
    if (ids.length === 0) return [];
    const scope = companyId != null ? { companyId } : {};

    const [evaluations, internships, feedback] = await Promise.all([
        InternshipEvaluation.findAll({
            where: { studentId: { [Op.in]: ids }, status: 'finalized', ...scope },
            attributes: ['id', 'studentId', 'progressId', 'status', 'finalScore', 'finalizedAt'],
            include: [{ model: EvaluationCriterionScore, as: 'criteria', attributes: ['id', 'metric', 'finalScore', 'autoScore'] }]
        }),
        InternshipProgress.findAll({
            where: { studentId: { [Op.in]: ids }, ...scope },
            attributes: ['id', 'studentId', 'status']
        }),
        Feedback.findAll({
            where: { studentId: { [Op.in]: ids }, ...scope },
            attributes: ['id', 'studentId', 'context', 'overallRating', 'ratings', 'wouldRecommend', 'authorRole', 'createdAt']
        })
    ]);
    const progressIds = internships.map((p) => p.id);
    const submissions = progressIds.length
        ? await MilestoneSubmission.findAll({
            where: { progressId: { [Op.in]: progressIds } },
            attributes: ['id', 'studentId', 'progressId', 'wasLate']
        })
        : [];

    const forStudent = (rows, id) => rows.filter((r) => String(r.studentId) === id);
    return ids.map((id) =>
        studentPerformanceRecord({
            studentId: id,
            evaluations: forStudent(evaluations, id),
            internships: forStudent(internships, id),
            submissions: forStudent(submissions, id),
            feedback: forStudent(feedback, id)
        }, now)
    );
};

// interns: students who completed or closed an internship with the company.
// applicants: everyone who applied to one of its tasks.
const loadCandidateIds = async (companyId, scope) => {
    let rows;
    if (scope === 'applicants') {
        rows = await Application.findAll({
            attributes: ['id', 'studentId'],
            include: [{ model: Task, as: 'task', attributes: [], where: { companyId } }]
        });
    } else {
        rows = await InternshipProgress.findAll({
            where: { companyId, status: { [Op.in]: InternshipProgress.TERMINAL_STATUSES } },
            attributes: ['id', 'studentId']
        });
    }
    return [...new Set(rows.map((r) => String(r.studentId)))].sort((a, b) => Number(a) - Number(b));
};

// The whole top-performer computation: candidates → records → one AI batch →
// ranking. Only finalized evaluations are counted (see studentPerformanceRecord).
const topPerformersForCompany = async (companyId, { scope = 'interns', limit = DEFAULT_TOP_LIMIT, now = new Date() } = {}) => {
    const ids = await loadCandidateIds(companyId, scope);
    const records = await loadPerformanceRecords(ids, {
        companyId: scope === 'applicants' ? null : companyId,
        now
    });
    const dtos = records.map(aiService.mapStudentPerformanceToDto);
    const { results, aiGenerated } = await runPerformanceInsights(dtos);
    const students = ids.length
        ? await Student.findAll({
            where: { id: { [Op.in]: ids } },
            attributes: ['id', 'firstName', 'lastName', 'headline', 'profilePicture']
        })
        : [];
    return { scope, limit, aiGenerated, ...rankTopPerformers(dtos, results, students, limit) };
};

const loadCompanyData = async (companyId, userId) => {
    const tasks = await Task.findAll({ where: { companyId }, attributes: ['id', 'title', 'status'] });
    const taskIds = tasks.map((t) => t.id);
    const applications = taskIds.length
        ? await Application.findAll({
            where: { taskId: { [Op.in]: taskIds } },
            attributes: ['id', 'taskId', 'studentId', 'status', 'submittedAt', 'decidedAt']
        })
        : [];
    const appIds = applications.map((a) => a.id);
    const [history, interviews, internships, evaluations, feedbackGiven] = await Promise.all([
        appIds.length
            ? ApplicationStatusHistory.findAll({
                where: { applicationId: { [Op.in]: appIds } },
                attributes: ['id', 'applicationId', 'toStatus']
            })
            : [],
        Interview.findAll({ where: { companyId }, attributes: ['id', 'status'] }),
        InternshipProgress.findAll({
            where: { companyId },
            attributes: ['id', 'taskId', 'studentId', 'status', 'healthStatus', 'progressPercent', 'completedAt']
        }),
        InternshipEvaluation.findAll({
            where: { companyId },
            attributes: ['id', 'taskId', 'progressId', 'status', 'finalScore', 'grade', 'finalizedAt']
        }),
        Feedback.findAll({ where: { authorUserId: userId }, attributes: ['id', 'overallRating'] })
    ]);
    return { tasks, applications, history, interviews, internships, evaluations, feedbackGiven };
};

const countGroups = (Model, column, where = {}) =>
    Model.findAll({
        where,
        attributes: [column, [fn('COUNT', col('id')), 'count']],
        group: [column],
        raw: true
    });

const aggregateValue = async (Model, aggregate, column, where = {}) => {
    const row = await Model.findOne({ where, attributes: [[fn(aggregate, col(column)), 'value']], raw: true });
    return row ? num(row.value) : null;
};

// Platform-wide counts come from GROUP BY queries; only the rows inside the
// month window are fetched (one or two columns) for the monthly series.
const loadAdminAggregates = async ({ months = DEFAULT_MONTHS, now = new Date() } = {}) => {
    const since = windowStart(months, now);
    const live = { status: { [Op.notIn]: InternshipProgress.TERMINAL_STATUSES } };
    const [
        userRoleGroups, recentUsers, companyCount, mentorStatusGroups,
        taskStatusGroups, taskCategoryGroups, applicationStatusGroups, recentApplications,
        interviewStatusGroups, progressStatusGroups, liveHealthGroups, liveAverageProgress,
        totalHoursLogged, recentCompletions, evaluationStatusGroups, evaluationAiGroups,
        finalizedAverageScore, gradeGroups, feedbackContextGroups, feedbackAverage, completionGroups
    ] = await Promise.all([
        countGroups(User, 'role'),
        User.findAll({ where: { createdAt: { [Op.gte]: since } }, attributes: ['id', 'createdAt'] }),
        Company.count(),
        countGroups(Mentor, 'verificationStatus'),
        countGroups(Task, 'status'),
        countGroups(Task, 'category'),
        countGroups(Application, 'status'),
        Application.findAll({
            where: { [Op.or]: [{ submittedAt: { [Op.gte]: since } }, { decidedAt: { [Op.gte]: since } }] },
            attributes: ['id', 'status', 'submittedAt', 'decidedAt']
        }),
        countGroups(Interview, 'status'),
        countGroups(InternshipProgress, 'status'),
        countGroups(InternshipProgress, 'healthStatus', live),
        aggregateValue(InternshipProgress, 'AVG', 'progressPercent', live),
        ProgressTimeLog.sum('hours'),
        InternshipProgress.findAll({
            where: { status: 'completed', completedAt: { [Op.gte]: since } },
            attributes: ['id', 'completedAt']
        }),
        countGroups(InternshipEvaluation, 'status'),
        countGroups(InternshipEvaluation, 'aiGenerated'),
        aggregateValue(InternshipEvaluation, 'AVG', 'finalScore', { status: 'finalized' }),
        countGroups(InternshipEvaluation, 'grade', { status: 'finalized' }),
        countGroups(Feedback, 'context'),
        aggregateValue(Feedback, 'AVG', 'overallRating'),
        countGroups(InternshipProgress, 'companyId', { status: 'completed' })
    ]);

    // Names only for the companies that can appear in the top list.
    const topIds = [...completionGroups]
        .sort((a, b) => (Number(b.count) - Number(a.count)) || (Number(a.companyId) - Number(b.companyId)))
        .slice(0, TOP_COMPANIES)
        .map((g) => g.companyId);
    const companies = topIds.length
        ? await Company.findAll({ where: { id: { [Op.in]: topIds } }, attributes: ['id', 'companyName'] })
        : [];

    return {
        userRoleGroups, recentUsers, companyCount, mentorStatusGroups,
        taskStatusGroups, taskCategoryGroups, applicationStatusGroups, recentApplications,
        interviewStatusGroups, progressStatusGroups, liveHealthGroups, liveAverageProgress,
        totalHoursLogged, recentCompletions, evaluationStatusGroups, evaluationAiGroups,
        finalizedAverageScore, gradeGroups, feedbackContextGroups, feedbackAverage, completionGroups,
        companyNames: companies.reduce((acc, c) => ({ ...acc, [String(c.id)]: c.companyName }), {}),
        aiHealth: aiService.getAIHealth()
    };
};

// ---------------------------------------------------------------------------
// Money (Module 12) — additive: the payment figures on the three dashboards.
// Amounts in different currencies are never added together. Headline figures
// are in the "primary" currency (the one with the most paid volume) and
// `byCurrency` carries every currency. Only `succeeded` payments count as
// money moved; refunded ones are reported separately.
// ---------------------------------------------------------------------------

const buildStudentEarnings = (payments = [], { months = DEFAULT_MONTHS, now = new Date() } = {}) => {
    const rows = payments.map(plain);
    const totals = byCurrencyTotals(rows);
    const primary = totals[0] || null;
    const currency = primary ? primary.currency : null;
    const paid = rows.filter((p) => p.status === 'succeeded');
    return {
        currency,
        totalNet: primary ? primary.net : 0,
        refunded: primary ? primary.refundedNet : 0,
        pending: primary ? primary.open : 0,
        payments: paid.length,
        byCurrency: totals.map((r) => ({
            currency: r.currency, totalNet: r.net, refunded: r.refundedNet, pending: r.open
        })),
        byMonth: monthlySeries(months, now, {
            net: [paid.filter((p) => p.currency === currency), (p) => p.paidAt, (p) => p.netAmount]
        })
    };
};

const buildCompanySpend = (payments = [], { months = DEFAULT_MONTHS, now = new Date() } = {}) => {
    const rows = payments.map(plain);
    const totals = byCurrencyTotals(rows);
    const primary = totals[0] || null;
    const currency = primary ? primary.currency : null;
    const paid = rows.filter((p) => p.status === 'succeeded');
    return {
        currency,
        totalPaid: primary ? primary.paid : 0,
        totalFees: primary ? primary.fees : 0,
        refunded: primary ? primary.refunded : 0,
        open: rows.filter((p) => Payment.OPEN_STATUSES.includes(p.status)).length,
        payments: paid.length,
        byCurrency: totals.map((r) => ({
            currency: r.currency, totalPaid: r.paid, totalFees: r.fees, refunded: r.refunded
        })),
        byMonth: monthlySeries(months, now, {
            paid: [paid.filter((p) => p.currency === currency), (p) => p.paidAt, (p) => p.amount]
        })
    };
};

// From GROUP BY rows only (see loadAdminPaymentAggregates).
const buildAdminPayments = (agg = {}) => {
    const byStatus = countsFromGroups(agg.statusGroups, 'status', Payment.STATUSES);
    const byProvider = countsFromGroups(agg.providerGroups, 'provider', []);
    const refundedBy = new Map((agg.refundedByCurrency || []).map((g) => [g.currency, num(g.amount) || 0]));
    const byCurrency = (agg.succeededByCurrency || []).map((g) => ({
        currency: g.currency,
        volume: roundTo(num(g.volume) || 0, 2),
        fees: roundTo(num(g.fees) || 0, 2),
        refunded: roundTo(refundedBy.get(g.currency) || 0, 2),
        payments: Number(g.count) || 0
    }));
    // A currency that only ever saw refunds still shows up.
    refundedBy.forEach((amount, currency) => {
        if (!byCurrency.some((r) => r.currency === currency)) {
            byCurrency.push({ currency, volume: 0, fees: 0, refunded: roundTo(amount, 2), payments: 0 });
        }
    });
    byCurrency.sort((a, b) => (b.volume - a.volume) || codePointOrder(a.currency, b.currency));
    const primary = byCurrency[0] || null;
    return {
        total: sumOf(Object.values(byStatus)),
        byStatus,
        byProvider,
        currency: primary ? primary.currency : null,
        volume: primary ? primary.volume : 0,
        fees: primary ? primary.fees : 0,
        refunded: primary ? primary.refunded : 0,
        byCurrency
    };
};

const PAYMENT_ANALYTICS_ATTRS = ['id', 'kind', 'status', 'amount', 'platformFee', 'netAmount', 'currency', 'paidAt'];

const loadStudentPayments = (studentId) =>
    Payment.findAll({ where: { studentId }, attributes: PAYMENT_ANALYTICS_ATTRS });

const loadCompanyPayments = (companyId) =>
    Payment.findAll({ where: { companyId }, attributes: PAYMENT_ANALYTICS_ATTRS });

const sumsByCurrency = (status) =>
    Payment.findAll({
        where: { status },
        attributes: [
            'currency',
            [fn('SUM', col('amount')), status === 'refunded' ? 'amount' : 'volume'],
            [fn('SUM', col('platformFee')), 'fees'],
            [fn('COUNT', col('id')), 'count']
        ],
        group: ['currency'],
        raw: true
    });

const loadAdminPaymentAggregates = async () => {
    const [statusGroups, providerGroups, succeededByCurrency, refundedByCurrency] = await Promise.all([
        countGroups(Payment, 'status'),
        countGroups(Payment, 'provider'),
        sumsByCurrency('succeeded'),
        sumsByCurrency('refunded')
    ]);
    return { statusGroups, providerGroups, succeededByCurrency, refundedByCurrency };
};

module.exports = {
    MONTH_OPTIONS,
    DEFAULT_MONTHS,
    DEFAULT_TOP_LIMIT,
    MAX_TOP_LIMIT,
    TOP_PERFORMER_SCOPES,
    TOP_PERFORMERS_PREVIEW,
    FUNNEL_STAGES,
    SKILL_TREND_THRESHOLD,
    NO_DATA_SENTENCE,
    METRIC_LABELS,
    roundTo,
    normalizeMonths,
    monthKey,
    lastMonthKeys,
    windowStart,
    monthlySeries,
    finalizedEvaluations,
    criteriaAverages,
    summarizeApplications,
    skillGrowth,
    buildStudentAnalytics,
    buildFunnel,
    averageDaysToDecision,
    buildCompanyAnalytics,
    buildAdminAnalytics,
    recencyWeight,
    fallbackPerformanceInsights,
    isUsableInsights,
    runPerformanceInsights,
    studentPerformanceRecord,
    rankTopPerformers,
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
};
