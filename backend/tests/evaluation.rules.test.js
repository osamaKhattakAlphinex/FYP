/**
 * Module 9 — rule-level tests.
 *
 * The parts of automated evaluation that are pure logic: grade bands, the
 * weighted score, the access predicates, the evidence builder, the fallback
 * scoring rules, the rubric validator and the verification code format. No
 * database is required:
 *
 *     npm test
 *
 * HTTP flows (generation on completion, adjust/finalize/reopen, the public
 * verify endpoint) are exercised by the integration run recorded in
 * docs/qa/module-9-automated-evaluation.md.
 */
require('dotenv').config();

const InternshipEvaluation = require('../src/models/InternshipEvaluation');
const TaskEvaluationCriterion = require('../src/models/TaskEvaluationCriterion');
const {
    computeEvidence,
    fallbackEvaluation,
    isUsableResult,
    generateVerificationCode,
    NEUTRAL_SCORE,
    SUPERVISOR_RATING_PREFIX
} = require('../src/services/evaluationService');
const aiService = require('../src/services/aiService');

const buildEvaluation = (attrs = {}) =>
    InternshipEvaluation.build({
        progressId: 1,
        applicationId: 2,
        studentId: 10,
        taskId: 20,
        companyId: 30,
        status: 'draft',
        ...attrs
    });

const actors = {
    admin: { role: 'admin', userId: 1 },
    owner: { role: 'company', companyId: 30 },
    strangerCompany: { role: 'company', companyId: 31 },
    student: { role: 'student', studentId: 10 },
    otherStudent: { role: 'student', studentId: 11 },
    activeMentor: { role: 'mentor', mentorId: 5, isAssignedMentor: true, isActiveMentor: true },
    pastMentor: { role: 'mentor', mentorId: 6, isAssignedMentor: true, isActiveMentor: false },
    unassignedMentor: { role: 'mentor', mentorId: 7, isAssignedMentor: false, isActiveMentor: false }
};

// ---------------------------------------------------------------------------
// Grade bands and the weighted score
// ---------------------------------------------------------------------------

describe('InternshipEvaluation.gradeFor', () => {
    it.each([
        [100, 'A'], [85, 'A'], [84.99, 'B'], [70, 'B'], [69.99, 'C'],
        [55, 'C'], [54.99, 'D'], [40, 'D'], [39.99, 'F'], [0, 'F']
    ])('%p → %p', (score, grade) => {
        expect(InternshipEvaluation.gradeFor(score)).toBe(grade);
    });

    it('returns null when there is no score', () => {
        expect(InternshipEvaluation.gradeFor(null)).toBeNull();
    });
});

describe('InternshipEvaluation.weightedScore', () => {
    it('weights each row by its weight and rounds to 2dp', () => {
        const rows = [
            { weight: 3, finalScore: 90 },
            { weight: 1, finalScore: 50 },
            { weight: 2, finalScore: '71.5' } // MySQL DECIMAL arrives as a string
        ];
        // (270 + 50 + 143) / 6 = 77.1666…
        expect(InternshipEvaluation.weightedScore(rows, 'finalScore')).toBe(77.17);
    });

    it('skips rows without a score and is null when none remain', () => {
        expect(InternshipEvaluation.weightedScore([{ weight: 2, x: null }], 'x')).toBeNull();
        expect(InternshipEvaluation.weightedScore([], 'x')).toBeNull();
        expect(
            InternshipEvaluation.weightedScore([{ weight: 2, x: null }, { weight: 1, x: 40 }], 'x')
        ).toBe(40);
    });
});

// ---------------------------------------------------------------------------
// Access predicates
// ---------------------------------------------------------------------------

describe('InternshipEvaluation access predicates', () => {
    it('blocks the student from a draft and allows them once finalized', () => {
        expect(buildEvaluation().canBeViewedBy(actors.student)).toBe(false);
        expect(buildEvaluation({ status: 'finalized' }).canBeViewedBy(actors.student)).toBe(true);
    });

    it('never shows one student another student\'s evaluation', () => {
        expect(buildEvaluation({ status: 'finalized' }).canBeViewedBy(actors.otherStudent)).toBe(false);
    });

    it('lets the owning company, admin and assigned mentors view a draft', () => {
        const ev = buildEvaluation();
        expect(ev.canBeViewedBy(actors.owner)).toBe(true);
        expect(ev.canBeViewedBy(actors.admin)).toBe(true);
        expect(ev.canBeViewedBy(actors.activeMentor)).toBe(true);
        expect(ev.canBeViewedBy(actors.pastMentor)).toBe(true);
    });

    it('refuses a stranger company and an unassigned mentor', () => {
        const ev = buildEvaluation({ status: 'finalized' });
        expect(ev.canBeViewedBy(actors.strangerCompany)).toBe(false);
        expect(ev.canBeViewedBy(actors.unassignedMentor)).toBe(false);
        expect(ev.canBeEditedBy(actors.strangerCompany)).toBe(false);
    });

    it('lets a mentor whose assignment is completed edit and finalize a draft', () => {
        const ev = buildEvaluation();
        expect(ev.canBeEditedBy(actors.pastMentor)).toBe(true);
        expect(ev.canBeFinalizedBy(actors.pastMentor)).toBe(true);
    });

    it('never lets the student edit, even their own draft', () => {
        expect(buildEvaluation().canBeEditedBy(actors.student)).toBe(false);
    });

    it('freezes a finalized evaluation for everyone', () => {
        const ev = buildEvaluation({ status: 'finalized' });
        Object.values(actors).forEach((actor) => {
            expect(ev.canBeEditedBy(actor)).toBe(false);
            expect(ev.canBeFinalizedBy(actor)).toBe(false);
        });
    });

    it('only lets an admin reopen, and only a finalized evaluation', () => {
        const fin = buildEvaluation({ status: 'finalized' });
        expect(fin.canBeReopenedBy(actors.admin)).toBe(true);
        expect(fin.canBeReopenedBy(actors.owner)).toBe(false);
        expect(fin.canBeReopenedBy(actors.pastMentor)).toBe(false);
        expect(buildEvaluation().canBeReopenedBy(actors.admin)).toBe(false);
    });

    it('treats a missing actor as no access', () => {
        const ev = buildEvaluation();
        expect(ev.canBeViewedBy(null)).toBe(false);
        expect(ev.canBeEditedBy(undefined)).toBe(false);
    });
});

describe('InternshipEvaluation#toJSON', () => {
    it('adds _id, casts decimals and sorts criteria by orderIndex', () => {
        const ev = buildEvaluation({ autoScore: '72.50', finalScore: '70.00', confidence: '0.800' });
        ev.id = 9;
        ev.setDataValue('criteria', [
            { id: 2, orderIndex: 1, name: 'B' },
            { id: 1, orderIndex: 0, name: 'A' }
        ]);
        const json = ev.toJSON();
        expect(json._id).toBe(9);
        expect(json.autoScore).toBe(72.5);
        expect(json.finalScore).toBe(70);
        expect(json.confidence).toBe(0.8);
        expect(json.criteria.map((c) => c.name)).toEqual(['A', 'B']);
        expect(json.strengths).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Evidence builder
// ---------------------------------------------------------------------------

describe('computeEvidence', () => {
    const progress = {
        id: 1,
        status: 'completed',
        progressPercent: 75,
        startDate: '2026-06-01',
        targetEndDate: '2026-06-28',
        actualEndDate: '2026-07-01',
        expectedHoursPerWeek: 10,
        totalHoursLogged: '38.50',
        performanceRating: 4,
        closedWithOutstandingWork: true
    };
    const milestones = [
        { id: 1, status: 'completed', isRequired: true, estimatedHours: '10' },
        { id: 2, status: 'completed', isRequired: true, estimatedHours: '8' },
        { id: 3, status: 'in_progress', isRequired: true, estimatedHours: '6' },
        { id: 4, status: 'cancelled', isRequired: true, estimatedHours: '99' },
        { id: 5, status: 'pending', isRequired: false, estimatedHours: null }
    ];
    const submissions = [
        { milestoneId: 1, attemptNumber: 1, status: 'approved', wasLate: false, reviewScore: 5 },
        { milestoneId: 2, attemptNumber: 1, status: 'changes_requested', wasLate: false, reviewScore: 2 },
        { milestoneId: 2, attemptNumber: 2, status: 'approved', wasLate: true, reviewScore: 4 },
        { milestoneId: 3, attemptNumber: 1, status: 'superseded', wasLate: false, reviewScore: null }
    ];
    const updates = [
        { type: 'checkin' },
        { type: 'checkin' },
        { type: 'note' },
        { type: 'blocker', resolvedAt: new Date() },
        { type: 'blocker', resolvedAt: null },
        { type: 'risk_flag', resolvedAt: null }
    ];
    const ev = computeEvidence({ progress, milestones, submissions, updates });

    it('counts the plan the way Module 8 does (cancelled drops out)', () => {
        expect(ev.weighted_completion).toBe(75);
        expect(ev.milestone_count).toBe(4);
        expect(ev.completed_milestones).toBe(2);
        expect(ev.required_outstanding).toBe(1);
        expect(ev.closed_with_outstanding_work).toBe(true);
        expect(ev.estimated_hours).toBe(24);
    });

    it('derives the submission rates', () => {
        expect(ev.submission_count).toBe(4);
        expect(ev.reviewed_count).toBe(3);
        expect(ev.on_time_submission_rate).toBe(0.75);
        expect(ev.rework_rate).toBe(0.333);
        // milestone 1 first time, milestone 2 on attempt 2
        expect(ev.first_time_approval_rate).toBe(0.5);
        expect(ev.average_review_score).toBe(3.67);
        expect(ev.supervisor_rating).toBe(4);
    });

    it('measures the active window, hours and the deadline', () => {
        // 1 Jun 00:00 → end of 1 Jul = 31 days = 4.4 weeks
        expect(ev.active_weeks).toBe(4.4);
        expect(ev.expected_hours).toBe(44);
        expect(ev.hours_logged).toBe(38.5);
        expect(ev.finished_on_time).toBe(false);
        expect(ev.days_late).toBe(3);
    });

    it('counts only student check-ins and blockers', () => {
        expect(ev.checkin_count).toBe(2);
        expect(ev.blockers_raised).toBe(2);
        expect(ev.blockers_resolved).toBe(1);
    });

    it('reports null rates, not zero, when there is nothing to measure', () => {
        const empty = computeEvidence({
            progress: { progressPercent: 0, startDate: '2026-06-01', actualEndDate: '2026-06-02' }
        });
        expect(empty.on_time_submission_rate).toBeNull();
        expect(empty.rework_rate).toBeNull();
        expect(empty.first_time_approval_rate).toBeNull();
        expect(empty.average_review_score).toBeNull();
        expect(empty.supervisor_rating).toBeNull();
        expect(empty.expected_hours).toBeNull();
        expect(empty.estimated_hours).toBeNull();
        expect(empty.finished_on_time).toBeNull();
        // never less than one week
        expect(empty.active_weeks).toBe(1);
    });

    it('finishing on the target date itself is on time', () => {
        const onTime = computeEvidence({
            progress: { ...progress, actualEndDate: '2026-06-28' }
        });
        expect(onTime.finished_on_time).toBe(true);
        expect(onTime.days_late).toBe(0);
    });

    it('emits exactly the AI contract fields', () => {
        expect(Object.keys(ev).sort()).toEqual(Object.keys(aiService.EVALUATION_EVIDENCE_FIELDS).sort());
    });
});

// ---------------------------------------------------------------------------
// Fallback rules (mirror of ai-service/app/services/evaluator.py)
// ---------------------------------------------------------------------------

const strong = (overrides = {}) => ({
    weighted_completion: 100,
    milestone_count: 4,
    completed_milestones: 4,
    required_outstanding: 0,
    closed_with_outstanding_work: false,
    submission_count: 4,
    reviewed_count: 4,
    on_time_submission_rate: 1,
    rework_rate: 0,
    first_time_approval_rate: 1,
    average_review_score: 4.75,
    supervisor_rating: 5,
    hours_logged: 40,
    expected_hours: 40,
    estimated_hours: 36,
    active_weeks: 4,
    checkin_count: 4,
    blockers_raised: 1,
    blockers_resolved: 1,
    finished_on_time: true,
    days_late: 0,
    ...overrides
});

const DEFAULT_DTO_CRITERIA = TaskEvaluationCriterion.DEFAULT_CRITERIA.map((c, i) => ({
    id: `c${i}`,
    name: c.name,
    metric: c.metric,
    weight: c.weight
}));

const dtoFor = (evidence, criteria = DEFAULT_DTO_CRITERIA) =>
    aiService.mapEvaluationToDto('ev-1', 'Build a dashboard', criteria, evidence);

const single = (metric, evidence) =>
    fallbackEvaluation(dtoFor(evidence, [{ id: 'x', name: metric, metric, weight: 1 }])).criteria[0];

describe('fallbackEvaluation — shape and aggregation', () => {
    it('returns the /evaluate-internship response shape', () => {
        const res = fallbackEvaluation(dtoFor(strong()));
        expect(Object.keys(res).sort()).toEqual(
            ['confidence', 'criteria', 'evaluation_id', 'grade', 'improvements', 'overall_score', 'strengths', 'summary'].sort()
        );
        expect(Object.keys(res.criteria[0]).sort()).toEqual(
            ['evidence', 'has_evidence', 'id', 'rationale', 'score'].sort()
        );
        expect(res.criteria.map((c) => c.id)).toEqual(DEFAULT_DTO_CRITERIA.map((c) => c.id));
        expect(isUsableResult(res, dtoFor(strong()))).toBe(true);
    });

    it('gives a strong internship an A with full confidence', () => {
        const res = fallbackEvaluation(dtoFor(strong()));
        expect(res.grade).toBe('A');
        expect(res.confidence).toBe(1);
        expect(res.improvements).toEqual([]);
        expect(res.strengths.length).toBeGreaterThan(0);
        expect(res.strengths.length).toBeLessThanOrEqual(3);
    });

    it('is the weighted mean of its criteria', () => {
        const res = fallbackEvaluation(dtoFor(strong({ checkin_count: 0, blockers_raised: 0 })));
        const expected = InternshipEvaluation.weightedScore(
            res.criteria.map((c, i) => ({ weight: DEFAULT_DTO_CRITERIA[i].weight, s: c.score })),
            's'
        );
        expect(res.overall_score).toBe(expected);
    });

    it('is deterministic', () => {
        const a = fallbackEvaluation(dtoFor(strong({ checkin_count: 3 })));
        const b = fallbackEvaluation(dtoFor(strong({ checkin_count: 3 })));
        expect(a).toEqual(b);
    });

    it('scores every criterion neutrally, with zero confidence, when nothing was recorded', () => {
        const empty = aiService.mapEvaluationToDto('e', '', DEFAULT_DTO_CRITERIA, {});
        const res = fallbackEvaluation(empty);
        res.criteria.forEach((c) => {
            expect(c.score).toBe(NEUTRAL_SCORE);
            expect(c.has_evidence).toBe(false);
            expect(c.rationale).toMatch(/insufficient evidence/);
        });
        expect(res.confidence).toBe(0);
        expect(res.grade).toBe('C');
        expect(res.improvements).toEqual([]);
    });

    it('keeps every score inside 0..100', () => {
        const harsh = fallbackEvaluation(
            dtoFor(strong({ on_time_submission_rate: 0, finished_on_time: false, days_late: 90, weighted_completion: 5, closed_with_outstanding_work: true }))
        );
        harsh.criteria.forEach((c) => {
            expect(c.score).toBeGreaterThanOrEqual(0);
            expect(c.score).toBeLessThanOrEqual(100);
        });
    });
});

describe('fallbackEvaluation — per metric (same numbers as the Python tests)', () => {
    it('quality blends reviews and the closing rating 70/30, minus rework', () => {
        expect(single('quality', strong({ average_review_score: 5, supervisor_rating: 1 })).score).toBe(70);
        expect(single('quality', strong({ average_review_score: 3, supervisor_rating: null })).score).toBe(50);
        expect(single('quality', strong({ average_review_score: null, supervisor_rating: 4 })).score).toBe(75);
        expect(single('quality', strong({ average_review_score: 5, supervisor_rating: null, rework_rate: 0.9 })).score).toBe(85);
    });

    it('quality quotes the closing rating with the prefix the controller strips for students', () => {
        const c = single('quality', strong());
        expect(c.evidence.some((l) => l.startsWith(SUPERVISOR_RATING_PREFIX))).toBe(true);
    });

    it('timeliness uses the on-time rate, minus a capped late-finish penalty', () => {
        expect(single('timeliness', strong({ on_time_submission_rate: 0.75 })).score).toBe(75);
        expect(single('timeliness', strong({ on_time_submission_rate: 0.75, finished_on_time: false, days_late: 3 })).score).toBe(49);
        expect(single('timeliness', strong({ finished_on_time: false, days_late: 40 })).score).toBe(70);
    });

    it('completion is weighted completion, minus 15 when closed with work outstanding', () => {
        expect(single('completion', strong({ weighted_completion: 80 })).score).toBe(80);
        expect(single('completion', strong({ weighted_completion: 80, closed_with_outstanding_work: true })).score).toBe(65);
    });

    it('communication rewards weekly check-ins and resolved blockers', () => {
        expect(single('communication', strong({ checkin_count: 2, blockers_raised: 0, blockers_resolved: 0 })).score).toBe(40);
        expect(single('communication', strong({ checkin_count: 6 })).score).toBe(100);
    });

    it('effort peaks in the 0.9-1.3× band and over-running bottoms out at 80', () => {
        expect(single('effort', strong({ hours_logged: 40 })).score).toBe(100);
        expect(single('effort', strong({ hours_logged: 18 })).score).toBe(50);
        expect(single('effort', strong({ hours_logged: 80 })).score).toBe(80);
        expect(single('effort', strong({ hours_logged: 400 })).score).toBe(80);
        expect(single('effort', strong({ expected_hours: null, estimated_hours: null })).has_evidence).toBe(false);
    });

    it('reliability uses first-time approvals, falls back to 1 - rework, minus unresolved blockers', () => {
        expect(single('reliability', strong({ first_time_approval_rate: 0.5 })).score).toBe(50);
        expect(single('reliability', strong({ first_time_approval_rate: null, rework_rate: 0.25 })).score).toBe(75);
        expect(single('reliability', strong({ first_time_approval_rate: 0.5, blockers_raised: 2, blockers_resolved: 1 })).score).toBe(40);
    });
});

describe('isUsableResult', () => {
    it('rejects an AI answer that does not score every criterion', () => {
        const dto = dtoFor(strong());
        expect(isUsableResult(null, dto)).toBe(false);
        expect(isUsableResult({ criteria: [{ id: 'c0', score: 50 }] }, dto)).toBe(false);
        const out = fallbackEvaluation(dto);
        out.criteria[0].score = 140;
        expect(isUsableResult(out, dto)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Rubric validation and verification codes
// ---------------------------------------------------------------------------

describe('TaskEvaluationCriterion.validateRubric', () => {
    const ok = [
        { name: 'Code quality', metric: 'quality', weight: 3 },
        { name: 'Delivery', metric: 'timeliness', weight: 1, description: 'On time' }
    ];

    it('accepts a valid rubric and the default one', () => {
        expect(TaskEvaluationCriterion.validateRubric(ok)).toEqual([]);
        expect(TaskEvaluationCriterion.validateRubric(TaskEvaluationCriterion.DEFAULT_CRITERIA)).toEqual([]);
    });

    it('rejects duplicate names case-insensitively', () => {
        const errors = TaskEvaluationCriterion.validateRubric([
            { name: 'Quality', metric: 'quality', weight: 1 },
            { name: ' quality ', metric: 'effort', weight: 1 }
        ]);
        expect(errors.join(' ')).toMatch(/listed twice/);
    });

    it('rejects an empty or oversized rubric', () => {
        expect(TaskEvaluationCriterion.validateRubric([])).not.toEqual([]);
        const nine = Array.from({ length: 9 }, (_, i) => ({ name: `Criterion ${i}`, metric: 'quality', weight: 1 }));
        expect(TaskEvaluationCriterion.validateRubric(nine)).not.toEqual([]);
        expect(TaskEvaluationCriterion.validateRubric('nope')).not.toEqual([]);
    });

    it('rejects unknown metrics and out-of-range weights', () => {
        expect(TaskEvaluationCriterion.validateRubric([{ name: 'Charm', metric: 'charisma', weight: 1 }])).not.toEqual([]);
        expect(TaskEvaluationCriterion.validateRubric([{ name: 'Quality', metric: 'quality', weight: 0 }])).not.toEqual([]);
        expect(TaskEvaluationCriterion.validateRubric([{ name: 'Quality', metric: 'quality', weight: 2.5 }])).not.toEqual([]);
    });

    it('ships a default rubric that covers five distinct metrics', () => {
        const metrics = TaskEvaluationCriterion.DEFAULT_CRITERIA.map((c) => c.metric);
        expect(new Set(metrics).size).toBe(5);
        metrics.forEach((m) => expect(TaskEvaluationCriterion.METRICS).toContain(m));
    });
});

describe('generateVerificationCode', () => {
    it('is EV- plus 10 uppercase hex characters, and not repeated', () => {
        const codes = new Set(Array.from({ length: 200 }, generateVerificationCode));
        codes.forEach((c) => expect(c).toMatch(/^EV-[0-9A-F]{10}$/));
        expect(codes.size).toBe(200);
    });
});
