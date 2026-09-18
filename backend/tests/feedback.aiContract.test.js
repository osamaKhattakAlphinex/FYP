/**
 * Module 10 — backend → AI service contract.
 *
 * `mapFeedbackAssistToDto` has to emit exactly the field set the FastAPI
 * `FeedbackSnapshot` / `FeedbackCriterionIn` / `FeedbackIndicators` /
 * `FeedbackDraft` models declare (ai-service/app/models/schemas.py), and the
 * fallback must answer with exactly `FeedbackAssistResponse`. If either
 * drifts, assists silently fall back and nobody notices, because the
 * fallback returns the same shape. The Python side is pinned by
 * ai-service/tests/test_feedback_assistant.py.
 *
 * No network and no database: only the pure mapper and fallback are exercised.
 */
require('dotenv').config();

const aiService = require('../src/services/aiService');
const { fallbackFeedbackAssist } = require('../src/services/feedbackService');

// Mirrors FeedbackSnapshot.
const SNAPSHOT_FIELDS = ['context', 'task_title', 'student_name', 'overall_rating', 'criteria', 'indicators', 'draft'];
// Mirrors FeedbackCriterionIn.
const CRITERION_FIELDS = ['name', 'metric', 'score', 'weight'];
// Mirrors FeedbackIndicators.
const INDICATOR_FIELDS = [
    'weighted_completion',
    'on_time_submission_rate',
    'rework_rate',
    'average_review_score',
    'checkin_count',
    'hours_logged'
];
// Mirrors FeedbackDraft.
const DRAFT_FIELDS = ['strengths', 'improvements', 'suggestions', 'overall_rating'];
// Mirrors FeedbackAssistResponse / FeedbackReview / FeedbackIssue.
const RESPONSE_FIELDS = [
    'suggested_overall_rating',
    'suggested_strengths',
    'suggested_improvements',
    'suggested_suggestions',
    'review'
];
const REVIEW_FIELDS = ['quality_score', 'issues'];
const ISSUE_FIELDS = ['code', 'severity', 'message'];

const build = (overrides = {}) =>
    aiService.mapFeedbackAssistToDto({
        context: 'internship',
        taskTitle: 'Build a dashboard',
        studentName: 'Sara Student',
        overallRating: '4',
        criteria: [
            { name: 'Quality of work', metric: 'quality', score: '91.50', weight: 3 },
            { name: 'Timeliness', metric: 'timeliness', score: 40, weight: '2' }
        ],
        indicators: {
            weighted_completion: 80,
            on_time_submission_rate: 0.75,
            rework_rate: null,
            average_review_score: '4.25',
            checkin_count: '3',
            hours_logged: '12.50',
            unrelated: 'ignored'
        },
        draft: { strengths: 'Good tests', improvements: null, suggestions: ['Plan earlier'], overall_rating: 4 },
        ...overrides
    });

describe('mapFeedbackAssistToDto — field set', () => {
    it('emits exactly the FeedbackSnapshot fields', () => {
        expect(Object.keys(build()).sort()).toEqual([...SNAPSHOT_FIELDS].sort());
    });

    it('emits exactly the FeedbackCriterionIn fields', () => {
        build().criteria.forEach((c) => expect(Object.keys(c).sort()).toEqual([...CRITERION_FIELDS].sort()));
    });

    it('emits exactly the FeedbackIndicators fields', () => {
        expect(Object.keys(build().indicators).sort()).toEqual([...INDICATOR_FIELDS].sort());
        expect(Object.keys(aiService.FEEDBACK_INDICATOR_FIELDS).sort()).toEqual([...INDICATOR_FIELDS].sort());
        expect([...aiService.FEEDBACK_SNAPSHOT_FIELDS].sort()).toEqual([...SNAPSHOT_FIELDS].sort());
    });

    it('emits exactly the FeedbackDraft fields', () => {
        expect(Object.keys(build().draft).sort()).toEqual([...DRAFT_FIELDS].sort());
    });
});

describe('mapFeedbackAssistToDto — types the Pydantic schema is strict about', () => {
    it('converts numeric strings to numbers and keeps unmeasured rates null', () => {
        const dto = build();
        expect(dto.criteria[0].score).toBe(91.5);
        expect(dto.criteria[1].weight).toBe(2);
        expect(dto.indicators.average_review_score).toBe(4.25);
        expect(dto.indicators.hours_logged).toBe(12.5);
        expect(dto.indicators.checkin_count).toBe(3);
        expect(dto.indicators.rework_rate).toBeNull();
        expect(dto.overall_rating).toBe(4);
    });

    it('clamps scores, weights and ratings into the schema ranges', () => {
        const dto = build({
            overallRating: 9,
            criteria: [
                { name: 'a', metric: 'quality', score: 140, weight: 0 },
                { name: 'b', metric: 'effort', score: -5, weight: 99 }
            ],
            draft: { overall_rating: 0 }
        });
        expect(dto.criteria.map((c) => [c.score, c.weight])).toEqual([[100, 1], [0, 10]]);
        expect(dto.overall_rating).toBe(5);
        expect(dto.draft.overall_rating).toBe(1);
    });

    it('drops criteria with an unknown metric or no score', () => {
        const dto = build({
            criteria: [
                { name: 'a', metric: 'charisma', score: 50 },
                { name: 'b', metric: 'quality', score: null },
                { name: 'c', metric: 'quality', score: 70 }
            ]
        });
        expect(dto.criteria.map((c) => c.name)).toEqual(['c']);
    });

    it('defaults to an internship with an empty draft', () => {
        const dto = aiService.mapFeedbackAssistToDto({ context: 'bogus' });
        expect(dto.context).toBe('internship');
        expect(dto.draft).toEqual({ strengths: null, improvements: null, suggestions: [], overall_rating: null });
        expect(dto.criteria).toEqual([]);
        expect(Object.values(dto.indicators).every((v) => v === null)).toBe(true);
        expect(dto.overall_rating).toBeNull();
    });

    it('keeps the interview context', () => {
        expect(build({ context: 'interview' }).context).toBe('interview');
    });
});

describe('fallbackFeedbackAssist — response shape', () => {
    it('returns exactly the FeedbackAssistResponse fields for both contexts', () => {
        [build(), build({ context: 'interview' })].forEach((dto) => {
            const r = fallbackFeedbackAssist(dto);
            expect(Object.keys(r).sort()).toEqual([...RESPONSE_FIELDS].sort());
            expect(Object.keys(r.review).sort()).toEqual([...REVIEW_FIELDS].sort());
            r.review.issues.forEach((i) => expect(Object.keys(i).sort()).toEqual([...ISSUE_FIELDS].sort()));
            expect(Number.isInteger(r.review.quality_score)).toBe(true);
            expect(['info', 'warning', 'critical']).toEqual(
                expect.arrayContaining(r.review.issues.map((i) => i.severity))
            );
        });
    });

    it('never suggests more than 5 suggestions or a rating outside 1-5', () => {
        const r = fallbackFeedbackAssist(build());
        expect(r.suggested_suggestions.length).toBeLessThanOrEqual(5);
        expect(r.suggested_overall_rating).toBeGreaterThanOrEqual(1);
        expect(r.suggested_overall_rating).toBeLessThanOrEqual(5);
    });
});
