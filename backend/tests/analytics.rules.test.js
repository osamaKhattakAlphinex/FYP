/**
 * Module 11 — rule-level tests.
 *
 * Every analytics number is produced by a pure builder in
 * src/services/analyticsService.js, so the maths is tested here over plain
 * arrays with no database:
 *
 *     npm test
 *
 * Each expected value is worked out by hand in the comment beside it. The
 * fallback insight numbers are the same ones pinned on the Python side in
 * ai-service/tests/test_performance_insights.py. HTTP flows (loaders, access
 * matrix, exact dashboard numbers over real rows) are exercised by the
 * integration run recorded in docs/qa/module-11-performance-analytics.md.
 */
require('dotenv').config();

const aiService = require('../src/services/aiService');
const A = require('../src/services/analyticsService');

const NOW = new Date('2026-09-18T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysBefore = (n) => new Date(NOW.getTime() - n * DAY);

const dto = (overrides = {}) => aiService.mapStudentPerformanceToDto({ id: 's1', ...overrides });
const insight = (overrides) => A.fallbackPerformanceInsights([dto(overrides)]).results[0];
const evals = (...pairs) => pairs.map(([score, days]) => ({ score, finalized_days_ago: days }));

const evaluation = (id, progressId, finalScore, finalizedAt, extra = {}) => ({
    id,
    progressId,
    status: 'finalized',
    finalScore: String(finalScore), // MySQL DECIMALs arrive as strings
    grade: null,
    finalizedAt,
    criteria: [],
    ...extra
});

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

describe('month bucketing', () => {
    it('lists the last N months oldest first, ending with the current month', () => {
        const keys = A.lastMonthKeys(12, NOW);
        expect(keys).toHaveLength(12);
        expect(keys[0]).toBe('2025-10');
        expect(keys[11]).toBe('2026-09');
    });

    it('crosses a year boundary correctly', () => {
        expect(A.lastMonthKeys(6, new Date('2026-01-15T00:00:00Z'))).toEqual([
            '2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'
        ]);
        expect(A.windowStart(6, new Date('2026-01-15T00:00:00Z')).toISOString()).toBe('2025-08-01T00:00:00.000Z');
    });

    it('takes DATEONLY strings literally and dates in UTC', () => {
        expect(A.monthKey('2026-03-31')).toBe('2026-03');
        expect(A.monthKey(new Date('2026-03-31T23:30:00Z'))).toBe('2026-03');
        expect(A.monthKey(new Date('2026-04-01T00:00:00Z'))).toBe('2026-04');
        expect(A.monthKey('not a date')).toBeNull();
        expect(A.monthKey(null)).toBeNull();
    });

    it('zero-fills, sums per month and ignores rows outside the window', () => {
        const logs = [
            { workDate: '2026-09-01', hours: '2.50' },
            { workDate: '2026-09-30', hours: 1.25 },
            { workDate: '2026-07-10', hours: 4 },
            { workDate: '2026-03-31', hours: 9 }, // outside a 6-month window
            { workDate: '2026-10-01', hours: 9 } // future month
        ];
        const series = A.monthlySeries(6, NOW, { hours: [logs, (l) => l.workDate, (l) => l.hours] });
        expect(series).toEqual([
            { month: '2026-04', hours: 0 },
            { month: '2026-05', hours: 0 },
            { month: '2026-06', hours: 0 },
            { month: '2026-07', hours: 4 },
            { month: '2026-08', hours: 0 },
            { month: '2026-09', hours: 3.75 }
        ]);
    });

    it('accepts only 6 or 12 months', () => {
        expect(A.normalizeMonths('6')).toBe(6);
        expect(A.normalizeMonths(12)).toBe(12);
        expect(A.normalizeMonths('24')).toBe(12);
        expect(A.normalizeMonths(undefined)).toBe(12);
    });
});

// ---------------------------------------------------------------------------
// Rates, funnel, decisions
// ---------------------------------------------------------------------------

describe('rates', () => {
    it('acceptance rate is accepted ÷ decided, null when nothing was decided', () => {
        expect(A.summarizeApplications([]).acceptanceRate).toBeNull();
        expect(A.summarizeApplications([{ status: 'submitted' }]).acceptanceRate).toBeNull();
        const s = A.summarizeApplications(
            ['accepted', 'rejected', 'rejected', 'submitted', 'withdrawn'].map((status) => ({ status }))
        );
        expect(s.total).toBe(5);
        expect(s.acceptanceRate).toBe(0.333); // 1 / 3
        expect(s.byStatus).toEqual({
            submitted: 1, under_review: 0, shortlisted: 0, interview_scheduled: 0,
            accepted: 1, rejected: 2, withdrawn: 1
        });
    });

    it('rounds half up like the Python side', () => {
        expect(A.roundTo(2.345, 2)).toBe(2.35);
        expect(A.roundTo(0.5, 0)).toBe(1);
        expect(A.roundTo(-2.5, 0)).toBe(-2);
    });
});

describe('funnel', () => {
    const apps = [
        { id: 1, status: 'submitted' },
        { id: 2, status: 'under_review' },
        { id: 3, status: 'shortlisted' },
        { id: 4, status: 'accepted' },
        { id: 5, status: 'rejected' }
    ];

    it('without history uses the current status (rejected counts only as submitted)', () => {
        // furthest stage index: 0, 1, 2, 4, 0
        expect(A.buildFunnel(apps, [])).toEqual([
            { stage: 'submitted', count: 5, rate: 1 },
            { stage: 'under_review', count: 3, rate: 0.6 },
            { stage: 'shortlisted', count: 2, rate: 0.4 },
            { stage: 'interview_scheduled', count: 1, rate: 0.2 },
            { stage: 'accepted', count: 1, rate: 0.2 }
        ]);
    });

    it('with history credits the stages a rejected application passed through', () => {
        const history = [
            { applicationId: 5, toStatus: 'submitted' },
            { applicationId: 5, toStatus: 'shortlisted' },
            { applicationId: 5, toStatus: 'rejected' },
            { applicationId: 99, toStatus: 'accepted' } // not this company's application
        ];
        // furthest: 0, 1, 2, 4, 2 (shortlisted before the rejection)
        expect(A.buildFunnel(apps, history).map((s) => s.count)).toEqual([5, 4, 3, 1, 1]);
    });

    it('is empty-safe', () => {
        expect(A.buildFunnel([], [])).toEqual(
            A.FUNNEL_STAGES.map((stage) => ({ stage, count: 0, rate: null }))
        );
    });

    it('averages days to an accept / reject decision only', () => {
        const apps2 = [
            { status: 'accepted', submittedAt: daysBefore(10), decidedAt: daysBefore(8) }, // 2 days
            { status: 'rejected', submittedAt: daysBefore(10), decidedAt: daysBefore(5) }, // 5 days
            { status: 'withdrawn', submittedAt: daysBefore(10), decidedAt: daysBefore(1) },
            { status: 'submitted', submittedAt: daysBefore(3), decidedAt: null }
        ];
        expect(A.averageDaysToDecision(apps2)).toBe(3.5);
        expect(A.averageDaysToDecision([])).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Evaluations and skills
// ---------------------------------------------------------------------------

describe('criteria averages', () => {
    it('averages the final criterion score per metric, in metric order, finalized only', () => {
        const rows = A.finalizedEvaluations([
            evaluation(1, 10, 80, daysBefore(30), {
                criteria: [
                    { metric: 'timeliness', finalScore: '70.00' },
                    { metric: 'quality', finalScore: '80.00' }
                ]
            }),
            evaluation(2, 11, 90, daysBefore(10), {
                criteria: [
                    { metric: 'quality', finalScore: null, autoScore: '91.00' }, // falls back to the auto score
                    { metric: 'effort', finalScore: 55 }
                ]
            }),
            evaluation(3, 12, 10, daysBefore(5), {
                status: 'draft',
                criteria: [{ metric: 'quality', finalScore: 0 }]
            })
        ]);
        expect(A.criteriaAverages(rows)).toEqual([
            { metric: 'quality', average: 85.5, samples: 2 },
            { metric: 'timeliness', average: 70, samples: 1 },
            { metric: 'effort', average: 55, samples: 1 }
        ]);
    });
});

describe('skill growth', () => {
    const internships = [
        { id: 1, status: 'completed', task: { skillsRequired: [{ name: 'react ' }, { name: 'Node.js' }] } },
        { id: 2, status: 'completed', task: { skillsRequired: [{ name: 'REACT' }, { name: 'Figma' }] } },
        { id: 3, status: 'in_progress', task: { skillsRequired: [{ name: 'Python' }] } },
        { id: 4, status: 'completed', task: { skillsRequired: [{ name: 'Figma' }] } }
    ];
    const evaluationsForSkills = [
        evaluation(11, 1, 70, daysBefore(200), { task: { title: 'First' } }),
        evaluation(12, 2, 78, daysBefore(100), { task: { title: 'Second' } }),
        evaluation(14, 4, 73, daysBefore(50), { task: { title: 'Fourth' } }),
        evaluation(15, 3, 99, daysBefore(10), { status: 'draft' })
    ];

    const rows = A.skillGrowth({
        profileSkills: [{ name: 'React', level: 'Advanced' }, { name: 'SQL', level: 'Beginner' }],
        internships,
        evaluations: evaluationsForSkills
    });
    const find = (name) => rows.find((r) => r.name.toLowerCase() === name.toLowerCase());

    it('merges names case-insensitively and keeps the profile spelling and level', () => {
        expect(rows.map((r) => r.name)).toEqual(['Figma', 'React', 'Node.js', 'SQL']);
        expect(find('react')).toMatchObject({ name: 'React', profileLevel: 'Advanced', internships: 2 });
        expect(find('node.js').profileLevel).toBeNull();
    });

    it('only counts completed internships', () => {
        expect(find('python')).toBeUndefined();
        expect(find('sql')).toMatchObject({ internships: 0, scores: [], trend: 'insufficient_data', change: null });
    });

    it('tracks scores chronologically with first, latest and change', () => {
        const react = find('react');
        expect(react.scores.map((s) => [s.finalScore, s.taskTitle])).toEqual([[70, 'First'], [78, 'Second']]);
        expect(react).toMatchObject({ firstScore: 70, latestScore: 78, change: 8, trend: 'improving' });
        expect(find('figma')).toMatchObject({ firstScore: 78, latestScore: 73, change: -5, trend: 'declining' });
        expect(find('node.js')).toMatchObject({ firstScore: 70, latestScore: 70, change: null, trend: 'insufficient_data' });
    });

    it('calls |change| < 5 stable', () => {
        const [row] = A.skillGrowth({
            internships: [
                { id: 1, status: 'completed', task: { skillsRequired: [{ name: 'Go' }] } },
                { id: 2, status: 'completed', task: { skillsRequired: [{ name: 'Go' }] } }
            ],
            evaluations: [evaluation(1, 1, 70, daysBefore(20)), evaluation(2, 2, 74.99, daysBefore(10))]
        });
        expect(row).toMatchObject({ change: 4.99, trend: 'stable' });
    });
});

// ---------------------------------------------------------------------------
// Student analytics
// ---------------------------------------------------------------------------

describe('buildStudentAnalytics', () => {
    const data = {
        applications: [
            { status: 'accepted' }, { status: 'accepted' }, { status: 'rejected' }, { status: 'submitted' }
        ],
        interviews: [{ status: 'completed' }, { status: 'cancelled' }],
        internships: [
            { id: 1, status: 'completed', task: { skillsRequired: [] } },
            { id: 2, status: 'in_progress', task: { skillsRequired: [] } }
        ],
        timeLogs: [{ workDate: '2026-09-02', hours: '3.50' }, { workDate: '2026-08-02', hours: 2 }],
        submissions: [{ wasLate: false }, { wasLate: true }, { wasLate: false }],
        evaluations: [
            evaluation(1, 1, 80, daysBefore(40), { grade: 'B', task: { title: 'T1' }, company: { companyName: 'Acme' } }),
            evaluation(2, 2, 91, daysBefore(5), { grade: 'A' }),
            evaluation(3, 3, 20, daysBefore(1), { status: 'draft', grade: 'F' })
        ],
        feedback: [
            { id: 1, context: 'internship', overallRating: 4, wouldRecommend: true, createdAt: daysBefore(3) },
            { id: 2, context: 'interview', overallRating: 5, wouldRecommend: null, createdAt: daysBefore(2) }
        ],
        profileSkills: []
    };

    it('computes the self summary by hand', () => {
        const out = A.buildStudentAnalytics(data, { audience: 'self', months: 6, now: NOW });
        expect(out.summary).toEqual({
            applications: {
                total: 4,
                byStatus: {
                    submitted: 1, under_review: 0, shortlisted: 0, interview_scheduled: 0,
                    accepted: 2, rejected: 1, withdrawn: 0
                },
                acceptanceRate: 0.667 // 2 / 3
            },
            interviews: { total: 2, completed: 1 },
            internships: {
                total: 2,
                byStatus: { not_started: 0, in_progress: 1, paused: 0, completed: 1, abandoned: 0 },
                completed: 1,
                active: 1
            },
            hoursLogged: 5.5,
            finalizedEvaluations: 2,
            averageEvaluationScore: 85.5, // (80 + 91) / 2 — the draft 20 is excluded
            latestGrade: 'A',
            feedback: { count: 2, averageOverall: 4.5, recommendRate: 1 },
            onTimeSubmissionRate: 0.667 // 2 / 3
        });
        expect(out.scoreHistory.map((s) => [s.evaluationId, s.finalScore, s.grade])).toEqual([
            ['1', 80, 'B'], ['2', 91, 'A']
        ]);
        expect(out.scoreHistory[0]).toMatchObject({ taskTitle: 'T1', companyName: 'Acme', progressId: '1' });
        expect(out.hoursByMonth.slice(-2)).toEqual([{ month: '2026-08', hours: 2 }, { month: '2026-09', hours: 3.5 }]);
        expect(out.hoursByMonth).toHaveLength(6);
    });

    it('viewer audience drops applications and interviews only', () => {
        const out = A.buildStudentAnalytics(data, { audience: 'viewer', now: NOW });
        expect(out.audience).toBe('viewer');
        expect(out.summary.applications).toBeUndefined();
        expect(out.summary.interviews).toBeUndefined();
        expect(out.summary.averageEvaluationScore).toBe(85.5);
        expect(out.scoreHistory).toHaveLength(2);
        expect(out.hoursByMonth).toHaveLength(12);
    });

    it('a brand new student gets zeros and nulls, not errors', () => {
        const out = A.buildStudentAnalytics({}, { now: NOW });
        expect(out.summary.applications.acceptanceRate).toBeNull();
        expect(out.summary.averageEvaluationScore).toBeNull();
        expect(out.summary.latestGrade).toBeNull();
        expect(out.summary.onTimeSubmissionRate).toBeNull();
        expect(out.summary.feedback).toEqual({ count: 0, averageOverall: null, recommendRate: null });
        expect(out.scoreHistory).toEqual([]);
        expect(out.criteriaAverages).toEqual([]);
        expect(out.skills).toEqual([]);
        expect(out.hoursByMonth.every((m) => m.hours === 0)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Company analytics
// ---------------------------------------------------------------------------

describe('buildCompanyAnalytics', () => {
    const data = {
        tasks: [
            { id: 1, title: 'Dashboard', status: 'active' },
            { id: 2, title: 'Landing page', status: 'closed' },
            { id: 3, title: 'Unused', status: 'draft' }
        ],
        applications: [
            { id: 1, taskId: 1, status: 'accepted', submittedAt: daysBefore(40), decidedAt: daysBefore(36) },
            { id: 2, taskId: 1, status: 'rejected', submittedAt: daysBefore(40), decidedAt: daysBefore(38) },
            { id: 3, taskId: 1, status: 'submitted', submittedAt: daysBefore(2), decidedAt: null },
            { id: 4, taskId: 2, status: 'accepted', submittedAt: daysBefore(100), decidedAt: daysBefore(94) }
        ],
        history: [{ applicationId: 2, toStatus: 'shortlisted' }],
        interviews: [{ status: 'completed' }, { status: 'no_show' }, { status: 'scheduled' }],
        internships: [
            { id: 1, taskId: 1, status: 'completed', healthStatus: 'on_track', progressPercent: 100, completedAt: daysBefore(10) },
            { id: 2, taskId: 2, status: 'in_progress', healthStatus: 'at_risk', progressPercent: 40 },
            { id: 3, taskId: 2, status: 'paused', healthStatus: 'on_track', progressPercent: 55 }
        ],
        evaluations: [
            { id: 1, taskId: 1, progressId: 1, status: 'finalized', finalScore: '88.00', grade: 'A', finalizedAt: daysBefore(9) },
            { id: 2, taskId: 2, progressId: 2, status: 'draft', finalScore: '30.00', grade: 'F' }
        ],
        feedbackGiven: [{ overallRating: 4 }, { overallRating: 5 }, { overallRating: 5 }]
    };
    const out = A.buildCompanyAnalytics(data, { months: 6, now: NOW });

    it('summarises tasks, applications and the funnel', () => {
        expect(out.summary.tasks).toEqual({
            total: 3, byStatus: { draft: 1, active: 1, paused: 0, closed: 1, completed: 0 }
        });
        expect(out.summary.applications.total).toBe(4);
        // furthest stages: accepted, shortlisted (from history), submitted, accepted
        expect(out.summary.funnel.map((s) => s.count)).toEqual([4, 3, 3, 2, 2]);
        expect(out.summary.conversionRate).toBe(0.5); // 2 / 4
        expect(out.summary.avgDaysToDecision).toBe(4); // (4 + 2 + 6) / 3
    });

    it('summarises interviews, internships, evaluations and feedback given', () => {
        expect(out.summary.interviews).toEqual({ total: 3, completed: 1, no_show: 1 });
        expect(out.summary.internships).toEqual({
            total: 3,
            byStatus: { not_started: 0, in_progress: 1, paused: 1, completed: 1, abandoned: 0 },
            byHealth: { on_track: 1, at_risk: 1, overdue: 0 }, // live only
            averageProgress: 47.5 // (40 + 55) / 2
        });
        expect(out.summary.evaluations).toEqual({
            finalized: 1, drafts: 1, averageScore: 88, gradeDistribution: { A: 1, B: 0, C: 0, D: 0, F: 0 }
        });
        expect(out.summary.feedbackGiven).toEqual({ count: 3, averageOverall: 4.67 });
    });

    it('builds monthly buckets and per-task rows', () => {
        expect(out.monthly).toHaveLength(6);
        // application 4 (100 days ago = June) and its acceptance (94 days ago = June)
        expect(out.monthly.find((m) => m.month === '2026-06')).toEqual({
            month: '2026-06', applications: 1, acceptances: 1, completions: 0
        });
        // apps 1-2 on Aug 9, app 1 accepted Aug 13; app 3 + completion in September
        expect(out.monthly.find((m) => m.month === '2026-08')).toEqual({
            month: '2026-08', applications: 2, acceptances: 1, completions: 0
        });
        expect(out.monthly.find((m) => m.month === '2026-09')).toEqual({
            month: '2026-09', applications: 1, acceptances: 0, completions: 1
        });
        expect(out.tasks).toEqual([
            { taskId: '1', title: 'Dashboard', status: 'active', applications: 3, accepted: 1, completedInternships: 1, averageEvaluationScore: 88 },
            { taskId: '2', title: 'Landing page', status: 'closed', applications: 1, accepted: 1, completedInternships: 0, averageEvaluationScore: null },
            { taskId: '3', title: 'Unused', status: 'draft', applications: 0, accepted: 0, completedInternships: 0, averageEvaluationScore: null }
        ]);
    });

    it('is empty-safe', () => {
        const empty = A.buildCompanyAnalytics({}, { now: NOW });
        expect(empty.summary.conversionRate).toBeNull();
        expect(empty.summary.avgDaysToDecision).toBeNull();
        expect(empty.summary.internships.averageProgress).toBeNull();
        expect(empty.summary.evaluations.averageScore).toBeNull();
        expect(empty.summary.feedbackGiven).toEqual({ count: 0, averageOverall: null });
        expect(empty.tasks).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

describe('buildAdminAnalytics', () => {
    const categories = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((category, i) => ({ category, count: i === 8 ? 1 : 2 + i }));
    const out = A.buildAdminAnalytics({
        userRoleGroups: [{ role: 'student', count: 5 }, { role: 'company', count: '2' }, { role: 'admin', count: 1 }],
        recentUsers: [{ createdAt: daysBefore(1) }, { createdAt: daysBefore(400) }],
        companyCount: 2,
        mentorStatusGroups: [{ verificationStatus: 'approved', count: 3 }],
        taskStatusGroups: [{ status: 'active', count: 4 }, { status: 'closed', count: 1 }],
        taskCategoryGroups: categories,
        applicationStatusGroups: [{ status: 'accepted', count: 2 }, { status: 'submitted', count: 3 }],
        recentApplications: [{ status: 'accepted', submittedAt: daysBefore(5), decidedAt: daysBefore(2) }],
        interviewStatusGroups: [{ status: 'completed', count: 2 }],
        progressStatusGroups: [{ status: 'completed', count: 3 }, { status: 'in_progress', count: 1 }],
        liveHealthGroups: [{ healthStatus: 'at_risk', count: 1 }],
        liveAverageProgress: '42.5000',
        totalHoursLogged: '12.25',
        recentCompletions: [{ completedAt: daysBefore(3) }],
        evaluationStatusGroups: [{ status: 'finalized', count: 3 }, { status: 'draft', count: 1 }],
        evaluationAiGroups: [{ aiGenerated: 1, count: 1 }, { aiGenerated: 0, count: 3 }],
        finalizedAverageScore: '81.666667',
        gradeGroups: [{ grade: 'A', count: 1 }, { grade: 'B', count: 2 }, { grade: null, count: 5 }],
        feedbackContextGroups: [{ context: 'internship', count: 4 }, { context: 'interview', count: 1 }],
        feedbackAverage: 4.4,
        completionGroups: [{ companyId: 7, count: 2 }, { companyId: 3, count: 2 }, { companyId: 9, count: 1 }],
        companyNames: { 3: 'Beta', 7: 'Acme' },
        aiHealth: { reachable: false }
    }, { months: 12, now: NOW });

    it('shapes users, tasks and applications', () => {
        expect(out.users.total).toBe(8);
        expect(out.users.byRole).toEqual({ student: 5, company: 2, mentor: 0, admin: 1 });
        expect(out.users.newByMonth.find((m) => m.month === '2026-09').users).toBe(1);
        expect(out.users.newByMonth.reduce((s, m) => s + m.users, 0)).toBe(1); // 400 days ago is outside
        expect(out.companies.total).toBe(2);
        expect(out.mentors.byVerificationStatus).toEqual({ pending: 0, approved: 3, rejected: 0 });
        expect(out.tasks.total).toBe(5);
        expect(out.tasks.byCategory).toHaveLength(8);
        expect(out.tasks.byCategory[0]).toEqual({ category: 'H', count: 9 });
        expect(out.tasks.byCategory.map((c) => c.category)).not.toContain('I');
        expect(out.applications.total).toBe(5);
        expect(out.applications.monthly.find((m) => m.month === '2026-09')).toEqual({
            month: '2026-09', applications: 1, acceptances: 1, completions: 1
        });
    });

    it('shapes internships, evaluations, feedback and top companies', () => {
        expect(out.internships).toEqual({
            byStatus: { not_started: 0, in_progress: 1, paused: 0, completed: 3, abandoned: 0 },
            byHealth: { on_track: 0, at_risk: 1, overdue: 0 },
            averageProgress: 42.5,
            totalHoursLogged: 12.25
        });
        expect(out.evaluations).toEqual({
            total: 4,
            finalized: 3,
            averageScore: 81.67,
            gradeDistribution: { A: 1, B: 2, C: 0, D: 0, F: 0 },
            aiGeneratedShare: 0.25
        });
        expect(out.feedback).toEqual({ total: 5, averageOverall: 4.4, byContext: { internship: 4, interview: 1 } });
        // tie on 2 completions → lower company id first
        expect(out.topCompanies).toEqual([
            { companyId: '3', companyName: 'Beta', completedInternships: 2 },
            { companyId: '7', companyName: 'Acme', completedInternships: 2 },
            { companyId: '9', companyName: null, completedInternships: 1 }
        ]);
        expect(out.aiHealth).toEqual({ reachable: false });
    });

    it('is empty-safe', () => {
        const empty = A.buildAdminAnalytics({}, { now: NOW });
        expect(empty.users.total).toBe(0);
        expect(empty.evaluations.aiGeneratedShare).toBeNull();
        expect(empty.evaluations.averageScore).toBeNull();
        expect(empty.internships.averageProgress).toBeNull();
        expect(empty.topCompanies).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Fallback performance insights (mirrors test_performance_insights.py)
// ---------------------------------------------------------------------------

describe('fallbackPerformanceInsights', () => {
    it('no components → insufficient data', () => {
        expect(insight({})).toEqual({
            id: 's1',
            performance_index: 0,
            band: 'insufficient_data',
            trend: 'insufficient_data',
            trend_slope: null,
            predicted_next_score: null,
            confidence: 0,
            strengths: [],
            focus_areas: [],
            insights: [A.NO_DATA_SENTENCE]
        });
    });

    it('reliability and on-time data alone give no index', () => {
        const r = insight({ completed_internships: 1, on_time_rate: 1 });
        expect([r.performance_index, r.band, r.confidence, r.insights])
            .toEqual([0, 'insufficient_data', 0, [A.NO_DATA_SENTENCE]]);
    });

    it('weights all four components', () => {
        // 80·0.5 + 75·0.2 + 50·0.15 + 100·0.15 = 77.5
        const r = insight({
            evaluations: evals([80, 0]), feedback_average: 4, feedback_count: 2,
            completed_internships: 1, abandoned_internships: 1, on_time_rate: 1
        });
        expect(r.performance_index).toBe(77.5);
        expect(r.band).toBe('strong');
    });

    it('renormalises the weights of missing components', () => {
        // (100·0.2 + 50·0.15) / 0.35 = 78.571… → 78.6
        expect(insight({ feedback_average: 5, feedback_count: 1, on_time_rate: 0.5 }).performance_index).toBe(78.6);
    });

    it('weights recent evaluations more (half-life 180 days, 1% floor)', () => {
        expect(insight({ evaluations: evals([100, 0], [0, 180]) }).performance_index).toBe(66.7);
        expect(A.recencyWeight(0)).toBe(1);
        expect(A.recencyWeight(180)).toBe(0.5);
        expect(A.recencyWeight(360)).toBe(0.25);
        expect(A.recencyWeight(5000)).toBe(0.01);
    });

    it.each([
        [85, 'excellent'], [84.96, 'excellent'], [84.9, 'strong'], [70, 'strong'],
        [69.9, 'developing'], [50, 'developing'], [49.9, 'needs_support'], [0, 'needs_support']
    ])('band for a single score of %p is %p', (score, band) => {
        expect(insight({ evaluations: evals([score, 0]) }).band).toBe(band);
    });

    it('fits a least-squares trend and predicts only with 3+ evaluations', () => {
        const up = insight({ evaluations: evals([90, 0], [80, 100], [70, 200], [60, 300]) });
        expect([up.trend, up.trend_slope, up.predicted_next_score]).toEqual(['improving', 10, 100]);

        const flat = insight({ evaluations: evals([60, 20], [70, 10], [65, 0]) });
        expect([flat.trend, flat.trend_slope, flat.predicted_next_score]).toEqual(['stable', 2.5, 70]);

        const down = insight({ evaluations: evals([40, 2], [20, 1], [0, 0]) });
        expect([down.trend, down.predicted_next_score]).toEqual(['declining', 0]);

        const two = insight({ evaluations: evals([70, 10], [90, 0]) });
        expect([two.trend, two.trend_slope, two.predicted_next_score]).toEqual(['improving', 20, null]);
    });

    it.each([[73, 'improving'], [72.99, 'stable'], [67, 'declining'], [67.01, 'stable']])(
        'trend threshold: 70 then %p is %p',
        (second, trend) => {
            expect(insight({ evaluations: evals([70, 1], [second, 0]) }).trend).toBe(trend);
        }
    );

    it('keeps input order for evaluations of the same age', () => {
        expect(insight({ evaluations: evals([50, 10], [90, 10]) }).trend_slope).toBe(40);
    });

    it('computes confidence from evaluations, feedback and on-time data', () => {
        expect(insight({ evaluations: evals([70, 0]), feedback_average: 4, feedback_count: 1, on_time_rate: 1 }).confidence).toBe(0.55);
        expect(insight({ feedback_average: 4, feedback_count: 1 }).confidence).toBe(0.2);
        expect(insight({ evaluations: evals([70, 0], [70, 1], [70, 2]) }).confidence).toBe(0.45);
    });

    it('lists strengths ≥ 80 and focus areas < 60 with rubric labels', () => {
        const r = insight({
            evaluations: evals([70, 0]),
            criteria_averages: { quality: 90, timeliness: 85, completion: 80, communication: 59, effort: 40, reliability: 60 }
        });
        expect(r.strengths).toEqual(['Quality of work', 'Timeliness', 'Scope completion']);
        expect(r.focus_areas).toEqual(['Effort & commitment', 'Communication']);
        expect(insight({ evaluations: evals([70, 0]), criteria_averages: { effort: 90, quality: 90 } }).strengths)
            .toEqual(['Quality of work', 'Effort & commitment']);
    });

    it('writes at most three plain sentences, identical to the Python wording', () => {
        expect(insight({
            evaluations: evals([90, 0], [80, 100], [70, 200], [60, 300]),
            completed_internships: 2, feedback_average: 4.5, feedback_count: 2, recommend_rate: 1, on_time_rate: 0.75
        }).insights).toEqual([
            'Scores are improving by about 10 points per evaluation across 4 evaluations.',
            'If this trend continues, the next evaluation is projected at about 100/100.',
            'Finished 2 of 2 internships (completed rather than abandoned).'
        ]);
        expect(insight({
            feedback_average: 4.25, feedback_count: 1, recommend_rate: 0.5,
            completed_internships: 1, on_time_rate: 2 / 3
        }).insights).toEqual([
            'No finalized evaluations yet, so there is no score trend to show.',
            'Finished 1 of 1 internship (completed rather than abandoned).',
            'Average feedback rating 4.25/5 from 1 review, 50% would recommend.'
        ]);
        expect(insight({ evaluations: evals([82.5, 0]) }).insights[0])
            .toBe('Only one finalized evaluation so far (82.5/100); a trend needs at least two.');
        expect(insight({ evaluations: evals([70, 1], [71, 0]) }).insights)
            .toEqual(['Scores are steady across 2 evaluations (within 3 points per evaluation).']);
    });

    it('is deterministic and keeps input order', () => {
        const dtos = [dto({ id: 'b', evaluations: evals([50, 0]) }), dto({ id: 'a', evaluations: evals([90, 0]) })];
        const first = A.fallbackPerformanceInsights(dtos);
        expect(first.results.map((r) => r.id)).toEqual(['b', 'a']);
        expect(A.fallbackPerformanceInsights(dtos)).toEqual(first);
    });
});

describe('runPerformanceInsights', () => {
    afterEach(() => jest.restoreAllMocks());
    const dtos = [dto({ id: '1', evaluations: evals([80, 0]) }), dto({ id: '2' })];

    it('uses the AI answer when it has the full shape', async () => {
        const answer = A.fallbackPerformanceInsights(dtos);
        answer.results[0].insights = ['from the AI'];
        jest.spyOn(aiService, 'getPerformanceInsights').mockResolvedValue(answer);
        const r = await A.runPerformanceInsights(dtos);
        expect(r.aiGenerated).toBe(true);
        expect(r.results[0].insights).toEqual(['from the AI']);
    });

    it('falls back on an outage or a malformed answer', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const spy = jest.spyOn(aiService, 'getPerformanceInsights')
            .mockRejectedValueOnce(new aiService.AIServiceUnavailableError('down'))
            .mockResolvedValueOnce({ results: [{ id: '1' }] });
        const expected = A.fallbackPerformanceInsights(dtos).results;
        for (let i = 0; i < 2; i += 1) {
            const r = await A.runPerformanceInsights(dtos);
            expect(r.aiGenerated).toBe(false);
            expect(r.results).toEqual(expected);
        }
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('rethrows programming errors', async () => {
        jest.spyOn(aiService, 'getPerformanceInsights').mockRejectedValue(new TypeError('bug'));
        await expect(A.runPerformanceInsights(dtos)).rejects.toThrow('bug');
    });

    it('batches more than 200 students into several calls and skips an empty set', async () => {
        const many = Array.from({ length: 450 }, (_, i) => dto({ id: String(i) }));
        const spy = jest.spyOn(aiService, 'getPerformanceInsights')
            .mockImplementation(async (chunk) => A.fallbackPerformanceInsights(chunk));
        const r = await A.runPerformanceInsights(many);
        expect(spy.mock.calls.map(([chunk]) => chunk.length)).toEqual([200, 200, 50]);
        expect(r.results).toHaveLength(450);
        expect(await A.runPerformanceInsights([])).toEqual({ results: [], aiGenerated: false });
    });

    it('rejects answers whose ids are out of order', () => {
        const answer = A.fallbackPerformanceInsights(dtos);
        expect(A.isUsableInsights(answer, dtos)).toBe(true);
        expect(A.isUsableInsights({ results: [...answer.results].reverse() }, dtos)).toBe(false);
        expect(A.isUsableInsights(null, dtos)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Performance records and ranking
// ---------------------------------------------------------------------------

describe('studentPerformanceRecord', () => {
    it('counts finalized evaluations only and measures their age in whole days', () => {
        const r = A.studentPerformanceRecord({
            studentId: 5,
            evaluations: [
                evaluation(1, 1, 70, daysBefore(30.5), { criteria: [{ metric: 'quality', finalScore: '70' }] }),
                evaluation(2, 2, 90, daysBefore(0.2), { criteria: [{ metric: 'quality', finalScore: 90 }] }),
                evaluation(3, 3, 10, daysBefore(1), { status: 'draft' })
            ],
            internships: [{ status: 'completed' }, { status: 'completed' }, { status: 'abandoned' }, { status: 'in_progress' }],
            submissions: [{ wasLate: false }, { wasLate: true }, { wasLate: false }, { wasLate: false }],
            feedback: [
                { id: 1, context: 'internship', overallRating: 5, wouldRecommend: true, createdAt: NOW },
                { id: 2, context: 'internship', overallRating: 4, wouldRecommend: false, createdAt: NOW }
            ]
        }, NOW);
        expect(r).toEqual({
            id: '5',
            evaluations: [{ score: 70, finalized_days_ago: 30 }, { score: 90, finalized_days_ago: 0 }],
            criteria_averages: { quality: 80 },
            feedback_average: 4.5,
            feedback_count: 2,
            recommend_rate: 0.5,
            completed_internships: 2,
            abandoned_internships: 1,
            on_time_rate: 0.75
        });
    });
});

describe('rankTopPerformers', () => {
    const records = [
        { id: '1', evaluations: [{ score: 80 }], feedback_average: 4, completed_internships: 1 },
        { id: '2', evaluations: [{ score: 80 }, { score: 80 }], feedback_average: 3, completed_internships: 2 },
        { id: '3', evaluations: [{ score: 80 }, { score: 80 }], feedback_average: 5, completed_internships: 2 },
        { id: '4', evaluations: [], feedback_average: null, completed_internships: 0 },
        { id: '5', evaluations: [{ score: 95 }], feedback_average: null, completed_internships: 1 },
        { id: '6', evaluations: [{ score: 80 }], feedback_average: 4, completed_internships: 1 }
    ];
    const result = (id, index, band = 'strong') => ({
        id, performance_index: index, band, trend: 'stable', predicted_next_score: null, confidence: 0.5, strengths: ['Timeliness']
    });
    const results = [
        result('1', 80), result('2', 80), result('3', 80),
        result('4', 0, 'insufficient_data'), result('5', 90, 'excellent'), result('6', 80)
    ];
    const students = records.map((r) => ({ id: Number(r.id), firstName: `S${r.id}`, lastName: 'X', headline: null }));

    it('orders by index, then evaluation count, then feedback average, then id', () => {
        const out = A.rankTopPerformers(records, results, students, 10);
        expect(out.rankings.map((r) => r.student.id)).toEqual(['5', '3', '2', '1', '6']);
        expect(out.rankings.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
        expect(out.candidates).toBe(6);
        expect(out.unrated).toBe(1);
        expect(out.rankings[1]).toEqual({
            rank: 2,
            student: { id: '3', firstName: 'S3', lastName: 'X', headline: null, profilePicture: null },
            performanceIndex: 80,
            band: 'strong',
            trend: 'stable',
            predictedNextScore: null,
            confidence: 0.5,
            averageEvaluationScore: 80,
            evaluationCount: 2,
            feedbackAverage: 5,
            completedInternships: 2,
            strengths: ['Timeliness']
        });
    });

    it('applies the limit after ranking', () => {
        expect(A.rankTopPerformers(records, results, students, 2).rankings.map((r) => r.student.id)).toEqual(['5', '3']);
    });
});
