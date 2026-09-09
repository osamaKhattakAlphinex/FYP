/**
 * Module 8 — backend → AI service contract.
 *
 * `mapProgressToDto` has to emit exactly the field set that the FastAPI
 * `ProgressSnapshot` model declares (ai-service/app/models/schemas.py). If the
 * two drift, the progress report silently falls back to the local rule set for
 * every internship and nobody notices, because the fallback returns the same
 * shape. These tests pin the contract from the JavaScript side; the Python
 * side is pinned by ai-service/tests/test_progress_analyzer.py.
 *
 * No network and no database: only the pure mapper is exercised.
 */
require('dotenv').config();

const aiService = require('../src/services/aiService');

const DAY = 24 * 60 * 60 * 1000;
const dateIn = (n) => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);

// Mirrors ProgressSnapshot in ai-service/app/models/schemas.py.
const SNAPSHOT_FIELDS = [
    'id',
    'task_title',
    'status',
    'progress_percent',
    'elapsed_ratio',
    'days_remaining',
    'days_since_last_activity',
    'expected_hours_per_week',
    'total_hours_logged',
    'open_blockers',
    'overdue_milestones',
    'recent_checkins',
    'on_time_submission_rate',
    'rework_rate',
    'milestones'
];

// Mirrors MilestoneSnapshot in the same file.
const MILESTONE_FIELDS = [
    'id',
    'title',
    'status',
    'weight',
    'is_required',
    'due_in_days',
    'is_overdue',
    'submission_count',
    'estimated_hours',
    'actual_hours'
];

// Plain objects rather than model instances — plainify() handles both, and this
// keeps the test free of a Sequelize connection.
const progressRow = (overrides = {}) => ({
    id: 42,
    status: 'in_progress',
    progressPercent: 20,
    startDate: dateIn(-30),
    targetEndDate: dateIn(5),
    lastActivityAt: new Date(Date.now() - 9 * DAY),
    expectedHoursPerWeek: 12,
    // MySQL hands DECIMAL back as a string; the DTO must not.
    totalHoursLogged: '8.50',
    openBlockerCount: 1,
    overdueMilestoneCount: 1,
    ...overrides
});

const milestoneRow = (overrides = {}) => ({
    id: 1,
    title: 'Setup',
    status: 'completed',
    weight: 1,
    isRequired: true,
    dueDate: dateIn(-12),
    isOverdue: false,
    submissionCount: 1,
    estimatedHours: '6.00',
    actualHours: '8.50',
    ...overrides
});

const build = (progress = progressRow(), milestones = [milestoneRow()], extras = {}) =>
    aiService.mapProgressToDto(progress, milestones, {
        taskTitle: 'Build a React analytics dashboard',
        recentCheckins: 0,
        onTimeSubmissionRate: 0.5,
        reworkRate: 0.5,
        ...extras
    });

describe('mapProgressToDto — field set', () => {
    it('emits exactly the ProgressSnapshot fields', () => {
        const dto = build();
        expect(Object.keys(dto).sort()).toEqual([...SNAPSHOT_FIELDS].sort());
    });

    it('emits exactly the MilestoneSnapshot fields', () => {
        const dto = build();
        expect(Object.keys(dto.milestones[0]).sort()).toEqual([...MILESTONE_FIELDS].sort());
    });

    it('requires a progress record', () => {
        expect(() => aiService.mapProgressToDto(null)).toThrow(/required/);
    });
});

describe('mapProgressToDto — types the Pydantic schema is strict about', () => {
    it('sends ids as strings', () => {
        const dto = build();
        expect(typeof dto.id).toBe('string');
        expect(typeof dto.milestones[0].id).toBe('string');
    });

    it('converts DECIMAL strings to numbers', () => {
        const dto = build();
        expect(dto.total_hours_logged).toBe(8.5);
        expect(dto.milestones[0].actual_hours).toBe(8.5);
        expect(dto.milestones[0].estimated_hours).toBe(6);
    });

    it('sends whole-number day counts', () => {
        const dto = build();
        expect(Number.isInteger(dto.days_remaining)).toBe(true);
        expect(Number.isInteger(dto.milestones[0].due_in_days)).toBe(true);
    });

    it('keeps elapsed_ratio inside 0..1', () => {
        expect(build().elapsed_ratio).toBeGreaterThanOrEqual(0);
        expect(build().elapsed_ratio).toBeLessThanOrEqual(1);

        // Long past the deadline it must clamp, not exceed 1.
        const past = build(progressRow({ startDate: dateIn(-60), targetEndDate: dateIn(-30) }));
        expect(past.elapsed_ratio).toBe(1);
    });

    it('never emits NaN for an undated internship', () => {
        const dto = build(
            progressRow({ startDate: null, targetEndDate: null, lastActivityAt: null }),
            [milestoneRow({ dueDate: null })]
        );

        // Pydantic accepts null for these; NaN would be rejected outright.
        expect(dto.elapsed_ratio).toBeNull();
        expect(dto.days_remaining).toBeNull();
        expect(dto.days_since_last_activity).toBeNull();
        expect(dto.milestones[0].due_in_days).toBeNull();
    });

    it('handles a missing estimate without turning it into 0', () => {
        const dto = build(progressRow(), [milestoneRow({ estimatedHours: null })]);
        expect(dto.milestones[0].estimated_hours).toBeNull();
    });

    it('defaults an absent hours-per-week to null, not 0', () => {
        const dto = build(progressRow({ expectedHoursPerWeek: null }));
        expect(dto.expected_hours_per_week).toBeNull();
    });

    it('treats an empty plan as an empty list', () => {
        expect(build(progressRow(), []).milestones).toEqual([]);
    });
});

describe('mapProgressToDto — value mapping', () => {
    it('carries the caller-supplied rates through', () => {
        const dto = build(progressRow(), [milestoneRow()], {
            onTimeSubmissionRate: 0.25,
            reworkRate: 0.75,
            recentCheckins: 3
        });
        expect(dto.on_time_submission_rate).toBe(0.25);
        expect(dto.rework_rate).toBe(0.75);
        expect(dto.recent_checkins).toBe(3);
    });

    it('passes rates through as null when there is nothing to measure', () => {
        const dto = build(progressRow(), [milestoneRow()], {
            onTimeSubmissionRate: null,
            reworkRate: null
        });
        expect(dto.on_time_submission_rate).toBeNull();
        expect(dto.rework_rate).toBeNull();
    });

    it('renames the cached counters to the snake_case contract', () => {
        const dto = build(progressRow({ openBlockerCount: 2, overdueMilestoneCount: 3 }));
        expect(dto.open_blockers).toBe(2);
        expect(dto.overdue_milestones).toBe(3);
    });

    it('reports a negative due_in_days for an overdue milestone', () => {
        const dto = build(progressRow(), [milestoneRow({ dueDate: dateIn(-3) })]);
        expect(dto.milestones[0].due_in_days).toBeLessThan(0);
    });

    it('defaults isRequired to true only when it is not explicitly false', () => {
        expect(build(progressRow(), [milestoneRow({ isRequired: false })]).milestones[0].is_required)
            .toBe(false);
        expect(build(progressRow(), [milestoneRow({ isRequired: undefined })]).milestones[0].is_required)
            .toBe(true);
    });
});
