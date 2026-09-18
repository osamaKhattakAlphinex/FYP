/**
 * Module 11 — backend → AI service contract.
 *
 * `mapStudentPerformanceToDto` has to emit exactly the field set the FastAPI
 * `StudentPerformanceIn` / `PerformanceEvaluationIn` models declare
 * (ai-service/app/models/schemas.py), and the fallback must answer with
 * exactly `PerformanceInsight`. If either drifts, insights silently fall back
 * and nobody notices, because the fallback returns the same shape. The Python
 * side is pinned by ai-service/tests/test_performance_insights.py.
 *
 * No network and no database: only the pure mapper and fallback are exercised.
 */
require('dotenv').config();

const aiService = require('../src/services/aiService');
const { fallbackPerformanceInsights } = require('../src/services/analyticsService');

// Mirrors StudentPerformanceIn.
const STUDENT_FIELDS = [
    'id', 'evaluations', 'criteria_averages', 'feedback_average', 'feedback_count',
    'recommend_rate', 'completed_internships', 'abandoned_internships', 'on_time_rate'
];
// Mirrors PerformanceEvaluationIn.
const EVALUATION_FIELDS = ['score', 'finalized_days_ago'];
// Mirrors PerformanceInsight.
const RESULT_FIELDS = [
    'id', 'performance_index', 'band', 'trend', 'trend_slope', 'predicted_next_score',
    'confidence', 'strengths', 'focus_areas', 'insights'
];
const BANDS = ['excellent', 'strong', 'developing', 'needs_support', 'insufficient_data'];
const TRENDS = ['improving', 'stable', 'declining', 'insufficient_data'];

const build = (overrides = {}) =>
    aiService.mapStudentPerformanceToDto({
        id: 42,
        evaluations: [
            { score: '88.50', finalized_days_ago: '12' },
            { score: 71, finalized_days_ago: 3.7 }
        ],
        criteria_averages: { quality: '90.00', timeliness: 55, charisma: 99 },
        feedback_average: '4.25',
        feedback_count: '3',
        recommend_rate: '0.667',
        completed_internships: 2,
        abandoned_internships: '1',
        on_time_rate: 0.8,
        unrelated: 'ignored',
        ...overrides
    });

describe('mapStudentPerformanceToDto — field set', () => {
    it('emits exactly the StudentPerformanceIn fields', () => {
        expect(Object.keys(build()).sort()).toEqual([...STUDENT_FIELDS].sort());
        expect([...aiService.PERFORMANCE_STUDENT_FIELDS].sort()).toEqual([...STUDENT_FIELDS].sort());
    });

    it('emits exactly the PerformanceEvaluationIn fields', () => {
        build().evaluations.forEach((e) => expect(Object.keys(e).sort()).toEqual([...EVALUATION_FIELDS].sort()));
        expect([...aiService.PERFORMANCE_EVALUATION_FIELDS].sort()).toEqual([...EVALUATION_FIELDS].sort());
    });
});

describe('mapStudentPerformanceToDto — types the Pydantic schema is strict about', () => {
    it('converts numeric strings, keeps the id a string and drops unknown metrics', () => {
        const dto = build();
        expect(dto.id).toBe('42');
        expect(dto.evaluations).toEqual([
            { score: 88.5, finalized_days_ago: 12 },
            { score: 71, finalized_days_ago: 3 }
        ]);
        expect(dto.criteria_averages).toEqual({ quality: 90, timeliness: 55 });
        expect(dto.feedback_average).toBe(4.25);
        expect(dto.feedback_count).toBe(3);
        expect(dto.recommend_rate).toBe(0.667);
        expect(dto.abandoned_internships).toBe(1);
    });

    it('clamps into the schema ranges', () => {
        const dto = build({
            evaluations: [{ score: 140, finalized_days_ago: -5 }, { score: -3 }],
            criteria_averages: { quality: 120, effort: -1 },
            feedback_average: 9,
            recommend_rate: 1.5,
            on_time_rate: -0.2,
            feedback_count: -2
        });
        expect(dto.evaluations).toEqual([
            { score: 100, finalized_days_ago: 0 },
            { score: 0, finalized_days_ago: 0 }
        ]);
        expect(dto.criteria_averages).toEqual({ quality: 100, effort: 0 });
        expect(dto.feedback_average).toBe(5);
        expect(dto.recommend_rate).toBe(1);
        expect(dto.on_time_rate).toBe(0);
        expect(dto.feedback_count).toBe(0);
    });

    it('keeps unmeasured values null and drops evaluations without a score', () => {
        const dto = aiService.mapStudentPerformanceToDto({ id: 1, evaluations: [{ score: null }, { score: 'x' }] });
        expect(dto).toEqual({
            id: '1',
            evaluations: [],
            criteria_averages: {},
            feedback_average: null,
            feedback_count: 0,
            recommend_rate: null,
            completed_internships: 0,
            abandoned_internships: 0,
            on_time_rate: null
        });
    });
});

describe('fallbackPerformanceInsights — response shape', () => {
    it('returns exactly the PerformanceInsight fields with valid enums and ranges', () => {
        const { results } = fallbackPerformanceInsights([build(), build({ id: 7, evaluations: [] }), aiService.mapStudentPerformanceToDto({ id: 8 })]);
        expect(results).toHaveLength(3);
        results.forEach((r) => {
            expect(Object.keys(r).sort()).toEqual([...RESULT_FIELDS].sort());
            expect(BANDS).toContain(r.band);
            expect(TRENDS).toContain(r.trend);
            expect(r.performance_index).toBeGreaterThanOrEqual(0);
            expect(r.performance_index).toBeLessThanOrEqual(100);
            expect(r.confidence).toBeGreaterThanOrEqual(0);
            expect(r.confidence).toBeLessThanOrEqual(1);
            expect(r.insights.length).toBeGreaterThanOrEqual(1);
            expect(r.insights.length).toBeLessThanOrEqual(3);
            expect(typeof r.id).toBe('string');
        });
    });
});
