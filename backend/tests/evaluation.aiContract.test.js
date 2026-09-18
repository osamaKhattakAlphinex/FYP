/**
 * Module 9 — backend → AI service contract.
 *
 * `mapEvaluationToDto` has to emit exactly the field set the FastAPI
 * `EvaluationSnapshot` / `EvaluationCriterionIn` / `EvaluationEvidence` models
 * declare (ai-service/app/models/schemas.py). If the two drift, every
 * evaluation silently falls back to the backend's own rules and nobody
 * notices, because the fallback returns the same shape. The Python side is
 * pinned by ai-service/tests/test_evaluator.py.
 *
 * No network and no database: only the pure mapper is exercised.
 */
require('dotenv').config();

const aiService = require('../src/services/aiService');

// Mirrors EvaluationSnapshot.
const SNAPSHOT_FIELDS = ['id', 'task_title', 'criteria', 'evidence'];
// Mirrors EvaluationCriterionIn.
const CRITERION_FIELDS = ['id', 'name', 'metric', 'weight'];
// Mirrors EvaluationEvidence.
const EVIDENCE_FIELDS = [
    'weighted_completion',
    'milestone_count',
    'completed_milestones',
    'required_outstanding',
    'closed_with_outstanding_work',
    'submission_count',
    'reviewed_count',
    'on_time_submission_rate',
    'rework_rate',
    'first_time_approval_rate',
    'average_review_score',
    'supervisor_rating',
    'hours_logged',
    'expected_hours',
    'estimated_hours',
    'active_weeks',
    'checkin_count',
    'blockers_raised',
    'blockers_resolved',
    'finished_on_time',
    'days_late'
];
// Mirrors the EvaluationMetric literal.
const METRICS = ['quality', 'timeliness', 'completion', 'communication', 'effort', 'reliability'];

const criteria = [
    { id: 7, name: 'Quality of work', metric: 'quality', weight: 3 },
    { key: 'new-1', name: 'Timeliness', metric: 'timeliness', weight: '2' }
];

const evidence = {
    weighted_completion: 80,
    milestone_count: 4,
    completed_milestones: 3,
    required_outstanding: 1,
    closed_with_outstanding_work: true,
    submission_count: 5,
    reviewed_count: 4,
    on_time_submission_rate: 0.8,
    rework_rate: 0.25,
    first_time_approval_rate: 0.667,
    average_review_score: 4.25,
    supervisor_rating: 4,
    // MySQL hands DECIMAL back as a string; the DTO must not.
    hours_logged: '38.50',
    expected_hours: 40,
    estimated_hours: null,
    active_weeks: 4,
    checkin_count: 3,
    blockers_raised: 1,
    blockers_resolved: 1,
    finished_on_time: false,
    days_late: 2
};

const build = (overrides = {}) =>
    aiService.mapEvaluationToDto(42, 'Build a dashboard', criteria, { ...evidence, ...overrides });

describe('mapEvaluationToDto — field set', () => {
    it('emits exactly the EvaluationSnapshot fields', () => {
        expect(Object.keys(build()).sort()).toEqual([...SNAPSHOT_FIELDS].sort());
    });

    it('emits exactly the EvaluationCriterionIn fields', () => {
        build().criteria.forEach((c) => {
            expect(Object.keys(c).sort()).toEqual([...CRITERION_FIELDS].sort());
        });
    });

    it('emits exactly the EvaluationEvidence fields', () => {
        expect(Object.keys(build().evidence).sort()).toEqual([...EVIDENCE_FIELDS].sort());
    });

    it('keeps the exported field map in step with the schema list', () => {
        expect(Object.keys(aiService.EVALUATION_EVIDENCE_FIELDS).sort()).toEqual([...EVIDENCE_FIELDS].sort());
    });

    it('the default rubric only uses metrics the schema accepts', () => {
        const TaskEvaluationCriterion = require('../src/models/TaskEvaluationCriterion');
        expect([...TaskEvaluationCriterion.METRICS].sort()).toEqual([...METRICS].sort());
    });
});

describe('mapEvaluationToDto — types the Pydantic schema is strict about', () => {
    it('sends ids as strings, preferring the generation key', () => {
        const dto = build();
        expect(dto.id).toBe('42');
        expect(dto.criteria.map((c) => c.id)).toEqual(['7', 'new-1']);
    });

    it('converts numeric strings to numbers and weights to integers', () => {
        const dto = build();
        expect(dto.evidence.hours_logged).toBe(38.5);
        expect(dto.criteria[1].weight).toBe(2);
    });

    it('keeps optional rates null rather than turning them into 0', () => {
        const dto = build({ rework_rate: null, supervisor_rating: undefined, finished_on_time: null });
        expect(dto.evidence.rework_rate).toBeNull();
        expect(dto.evidence.supervisor_rating).toBeNull();
        expect(dto.evidence.finished_on_time).toBeNull();
        expect(dto.evidence.estimated_hours).toBeNull();
    });

    it('defaults required fields instead of sending null or NaN', () => {
        const dto = aiService.mapEvaluationToDto(1, '', criteria, { hours_logged: 'abc' });
        expect(dto.evidence.hours_logged).toBe(0);
        expect(dto.evidence.milestone_count).toBe(0);
        expect(dto.evidence.closed_with_outstanding_work).toBe(false);
        expect(Number.isNaN(dto.evidence.weighted_completion)).toBe(false);
    });

    it('sends integer counts as integers', () => {
        const dto = build({ checkin_count: '3', days_late: 2.0 });
        expect(Number.isInteger(dto.evidence.checkin_count)).toBe(true);
        expect(Number.isInteger(dto.evidence.days_late)).toBe(true);
    });

    it('clamps weights into the 1..10 range the schema enforces', () => {
        const dto = aiService.mapEvaluationToDto(1, '', [
            { id: 1, name: 'a', metric: 'quality', weight: 0 },
            { id: 2, name: 'b', metric: 'quality', weight: 99 }
        ], evidence);
        expect(dto.criteria.map((c) => c.weight)).toEqual([1, 10]);
    });
});
