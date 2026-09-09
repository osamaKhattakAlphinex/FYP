/**
 * Module 8 — rule-level tests.
 *
 * These cover the parts of progress tracking that are pure logic: the health
 * derivation, the milestone state machine, overdue detection, the weighted
 * completion formula and the access predicates. No database is required, so
 * they run anywhere:
 *
 *     npm test
 *
 * The remaining behaviour (transactions, notifications, HTTP wiring) is
 * covered by the manual QA plan in docs/qa/module-8-progress-tracking.md.
 */

// dotenv/config would be loaded by the app; the models only need a Sequelize
// instance to be constructed, not a live connection.
require('dotenv').config();

const InternshipProgress = require('../src/models/InternshipProgress');
const ProgressMilestone = require('../src/models/ProgressMilestone');

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-15T12:00:00Z');
const iso = (offsetDays) =>
    new Date(NOW.getTime() + offsetDays * DAY).toISOString().slice(0, 10);

// Builds a detached model instance so instance methods can be exercised
// without touching the database.
const buildProgress = (attrs = {}) =>
    InternshipProgress.build({
        applicationId: 1,
        studentId: 10,
        taskId: 20,
        companyId: 30,
        status: 'in_progress',
        ...attrs
    });

const buildMilestone = (attrs = {}) =>
    ProgressMilestone.build({
        progressId: 1,
        title: 'Milestone',
        status: 'pending',
        weight: 1,
        isRequired: true,
        ...attrs
    });

// ---------------------------------------------------------------------------
// Health derivation
// ---------------------------------------------------------------------------

describe('InternshipProgress.deriveHealth', () => {
    const base = {
        status: 'in_progress',
        startDate: iso(-10),
        targetEndDate: iso(10),
        progressPercent: 50,
        overdueMilestoneCount: 0,
        openBlockerCount: 0,
        lastActivityAt: new Date(NOW.getTime() - DAY),
        now: NOW
    };

    it('reports on_track when progress matches the elapsed schedule', () => {
        expect(InternshipProgress.deriveHealth(base)).toBe('on_track');
    });

    it('reports overdue once the target end date has passed', () => {
        expect(
            InternshipProgress.deriveHealth({ ...base, targetEndDate: iso(-2) })
        ).toBe('overdue');
    });

    it('does not report overdue on the target end date itself', () => {
        // A DATEONLY deadline means "by the end of that day", so the last day
        // is still a working day. (It may still be at_risk on other grounds.)
        expect(
            InternshipProgress.deriveHealth({ ...base, targetEndDate: iso(0) })
        ).not.toBe('overdue');
    });

    it('reports overdue when a milestone is past its due date', () => {
        expect(
            InternshipProgress.deriveHealth({ ...base, overdueMilestoneCount: 1 })
        ).toBe('overdue');
    });

    it('prefers overdue over at_risk when both apply', () => {
        expect(
            InternshipProgress.deriveHealth({
                ...base,
                overdueMilestoneCount: 1,
                openBlockerCount: 3
            })
        ).toBe('overdue');
    });

    it('reports at_risk while a blocker is open', () => {
        expect(
            InternshipProgress.deriveHealth({ ...base, openBlockerCount: 1 })
        ).toBe('at_risk');
    });

    it('reports at_risk when progress lags the schedule beyond tolerance', () => {
        // 50% of the window used, only 10% of the work done.
        expect(
            InternshipProgress.deriveHealth({ ...base, progressPercent: 10 })
        ).toBe('at_risk');
    });

    it('tolerates a small lag without flagging it', () => {
        // 50% elapsed, 40% done — inside the 15-point tolerance.
        expect(
            InternshipProgress.deriveHealth({ ...base, progressPercent: 40 })
        ).toBe('on_track');
    });

    it('reports at_risk after a week of silence', () => {
        expect(
            InternshipProgress.deriveHealth({
                ...base,
                lastActivityAt: new Date(NOW.getTime() - 8 * DAY)
            })
        ).toBe('at_risk');
    });

    it('does not flag silence on a paused internship', () => {
        expect(
            InternshipProgress.deriveHealth({
                ...base,
                status: 'paused',
                lastActivityAt: new Date(NOW.getTime() - 30 * DAY)
            })
        ).toBe('on_track');
    });

    it('never flags a closed internship', () => {
        ['completed', 'abandoned'].forEach((status) => {
            expect(
                InternshipProgress.deriveHealth({
                    ...base,
                    status,
                    targetEndDate: iso(-30),
                    overdueMilestoneCount: 5,
                    openBlockerCount: 5
                })
            ).toBe('on_track');
        });
    });

    it('is on_track when there is no schedule to fall behind', () => {
        expect(
            InternshipProgress.deriveHealth({
                ...base,
                startDate: null,
                targetEndDate: null,
                progressPercent: 0
            })
        ).toBe('on_track');
    });

    it('treats a same-day window as a real one-day window', () => {
        const sameDay = iso(0);
        // Half the day gone with nothing done is genuinely behind.
        expect(
            InternshipProgress.deriveHealth({
                ...base,
                startDate: sameDay,
                targetEndDate: sameDay,
                progressPercent: 0
            })
        ).toBe('at_risk');
    });

    it('survives an inverted window without dividing by zero', () => {
        expect(
            InternshipProgress.HEALTH_STATUSES
        ).toContain(
            InternshipProgress.deriveHealth({
                ...base,
                startDate: iso(5),
                targetEndDate: iso(4),
                progressPercent: 0
            })
        );
    });
});

// ---------------------------------------------------------------------------
// Milestone state machine
// ---------------------------------------------------------------------------

describe('ProgressMilestone transitions', () => {
    it('allows the normal forward path', () => {
        expect(ProgressMilestone.canTransition('pending', 'in_progress')).toBe(true);
        expect(ProgressMilestone.canTransition('in_progress', 'submitted')).toBe(true);
        expect(ProgressMilestone.canTransition('submitted', 'completed')).toBe(true);
    });

    it('allows the rework loop', () => {
        expect(ProgressMilestone.canTransition('submitted', 'changes_requested')).toBe(true);
        expect(ProgressMilestone.canTransition('changes_requested', 'in_progress')).toBe(true);
        expect(ProgressMilestone.canTransition('changes_requested', 'submitted')).toBe(true);
    });

    it('rejects skipping review', () => {
        expect(ProgressMilestone.canTransition('pending', 'completed')).toBe(false);
        expect(ProgressMilestone.canTransition('in_progress', 'completed')).toBe(false);
    });

    it('allows submitting straight from pending', () => {
        // A student who never pressed "Start" must still be able to hand work
        // in — the UI offers Submit on a pending milestone.
        expect(ProgressMilestone.canTransition('pending', 'submitted')).toBe(true);
    });

    it('the submit predicate and the state machine agree', () => {
        // These two drifting apart is what produces a confusing 400 on a button
        // the UI has already offered.
        const predicateAllows = ProgressMilestone.STATUSES.filter((s) =>
            buildMilestone({ status: s }).canBeSubmittedByStudent()
        );
        predicateAllows.forEach((s) => {
            expect(ProgressMilestone.canTransition(s, 'submitted')).toBe(true);
        });
    });

    it('the start predicate and the state machine agree', () => {
        const predicateAllows = ProgressMilestone.STATUSES.filter((s) =>
            buildMilestone({ status: s }).canBeStartedByStudent()
        );
        predicateAllows.forEach((s) => {
            expect(ProgressMilestone.canTransition(s, 'in_progress')).toBe(true);
        });
    });

    it('rejects a no-op transition', () => {
        ProgressMilestone.STATUSES.forEach((s) => {
            expect(ProgressMilestone.canTransition(s, s)).toBe(false);
        });
    });

    it('lets a reviewer reopen an approved milestone', () => {
        expect(ProgressMilestone.canTransition('completed', 'in_progress')).toBe(true);
    });

    it('lets a cancelled milestone be restored to pending only', () => {
        expect(ProgressMilestone.canTransition('cancelled', 'pending')).toBe(true);
        expect(ProgressMilestone.canTransition('cancelled', 'in_progress')).toBe(false);
        expect(ProgressMilestone.canTransition('cancelled', 'completed')).toBe(false);
    });

    it('allows blocking from every live state and unblocking back to work', () => {
        ['pending', 'in_progress', 'submitted', 'changes_requested'].forEach((s) => {
            expect(ProgressMilestone.canTransition(s, 'blocked')).toBe(true);
        });
        expect(ProgressMilestone.canTransition('blocked', 'in_progress')).toBe(true);
    });

    it('never allows a transition out of an unknown status', () => {
        expect(ProgressMilestone.canTransition('nonsense', 'pending')).toBe(false);
        expect(ProgressMilestone.allowedTransitions('nonsense')).toEqual([]);
    });

    it('every declared target is itself a valid status', () => {
        Object.entries(ProgressMilestone.TRANSITIONS).forEach(([from, targets]) => {
            expect(ProgressMilestone.STATUSES).toContain(from);
            targets.forEach((to) => expect(ProgressMilestone.STATUSES).toContain(to));
        });
    });
});

// ---------------------------------------------------------------------------
// Overdue detection
// ---------------------------------------------------------------------------

describe('ProgressMilestone.isOverdue', () => {
    it('is false without a due date', () => {
        expect(buildMilestone({ dueDate: null }).isOverdue(NOW)).toBe(false);
    });

    it('is false on the due date itself (due means end of that day)', () => {
        expect(buildMilestone({ dueDate: iso(0) }).isOverdue(NOW)).toBe(false);
    });

    it('is true the day after the due date', () => {
        expect(buildMilestone({ dueDate: iso(-2) }).isOverdue(NOW)).toBe(true);
    });

    it('is false once the milestone is completed, however late', () => {
        expect(
            buildMilestone({ dueDate: iso(-30), status: 'completed' }).isOverdue(NOW)
        ).toBe(false);
    });

    it('is false for a cancelled milestone', () => {
        expect(
            buildMilestone({ dueDate: iso(-30), status: 'cancelled' }).isOverdue(NOW)
        ).toBe(false);
    });

    it('is true for a submitted-but-unreviewed milestone past its date', () => {
        expect(
            buildMilestone({ dueDate: iso(-3), status: 'submitted' }).isOverdue(NOW)
        ).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Weighted completion
//
// Mirrors the formula recalcProgressMetrics applies, so the expectation the
// controller relies on is pinned down independently of the database.
// ---------------------------------------------------------------------------

const weightedPercent = (milestones) => {
    const counted = milestones.filter((m) => m.countsTowardsTotal());
    const total = counted.reduce((s, m) => s + Number(m.weight), 0);
    const earned = counted
        .filter((m) => m.earnsWeight())
        .reduce((s, m) => s + Number(m.weight), 0);
    return total ? Math.round((earned / total) * 100) : 0;
};

describe('weighted completion', () => {
    it('is 0 with no milestones', () => {
        expect(weightedPercent([])).toBe(0);
    });

    it('is 0 when nothing is complete', () => {
        expect(
            weightedPercent([buildMilestone(), buildMilestone({ status: 'in_progress' })])
        ).toBe(0);
    });

    it('counts only completed milestones, not submitted ones', () => {
        expect(
            weightedPercent([
                buildMilestone({ status: 'completed' }),
                buildMilestone({ status: 'submitted' })
            ])
        ).toBe(50);
    });

    it('respects weights', () => {
        // 3 of 4 total weight earned.
        expect(
            weightedPercent([
                buildMilestone({ status: 'completed', weight: 3 }),
                buildMilestone({ status: 'pending', weight: 1 })
            ])
        ).toBe(75);
    });

    it('drops cancelled milestones from the denominator', () => {
        // Cancelling remaining work must not make the student look behind.
        expect(
            weightedPercent([
                buildMilestone({ status: 'completed' }),
                buildMilestone({ status: 'cancelled' })
            ])
        ).toBe(100);
    });

    it('reaches 100 only when every counted milestone is complete', () => {
        expect(
            weightedPercent([
                buildMilestone({ status: 'completed' }),
                buildMilestone({ status: 'completed' }),
                buildMilestone({ status: 'blocked' })
            ])
        ).toBe(67);
    });
});

// ---------------------------------------------------------------------------
// Access predicates
// ---------------------------------------------------------------------------

describe('InternshipProgress access rules', () => {
    const progress = buildProgress();

    const student = { role: 'student', studentId: 10 };
    const otherStudent = { role: 'student', studentId: 11 };
    const company = { role: 'company', companyId: 30 };
    const otherCompany = { role: 'company', companyId: 31 };
    const activeMentor = {
        role: 'mentor',
        mentorId: 5,
        isAssignedMentor: true,
        isActiveMentor: true
    };
    const pastMentor = {
        role: 'mentor',
        mentorId: 6,
        isAssignedMentor: true,
        isActiveMentor: false
    };
    const strangerMentor = { role: 'mentor', mentorId: 7 };
    const admin = { role: 'admin' };

    it('lets the participants view it', () => {
        [student, company, activeMentor, pastMentor, admin].forEach((a) => {
            expect(progress.canBeViewedBy(a)).toBe(true);
        });
    });

    it('keeps everyone else out', () => {
        [otherStudent, otherCompany, strangerMentor, null, undefined, {}].forEach((a) => {
            expect(progress.canBeViewedBy(a)).toBe(false);
        });
    });

    it('only the owning student can do the work', () => {
        expect(progress.canBeWorkedOnBy(student)).toBe(true);
        [otherStudent, company, activeMentor, admin].forEach((a) => {
            expect(progress.canBeWorkedOnBy(a)).toBe(false);
        });
    });

    it('a paused internship accepts no student work', () => {
        expect(buildProgress({ status: 'paused' }).canBeWorkedOnBy(student)).toBe(false);
    });

    it('a closed internship accepts no student work', () => {
        ['completed', 'abandoned'].forEach((status) => {
            expect(buildProgress({ status }).canBeWorkedOnBy(student)).toBe(false);
        });
    });

    it('company, active mentor and admin can supervise; a past mentor cannot', () => {
        [company, activeMentor, admin].forEach((a) => {
            expect(progress.canBeSupervisedBy(a)).toBe(true);
        });
        [pastMentor, student, otherCompany].forEach((a) => {
            expect(progress.canBeSupervisedBy(a)).toBe(false);
        });
    });

    it('the plan is frozen once the internship closes', () => {
        const closed = buildProgress({ status: 'completed' });
        [company, activeMentor, admin].forEach((a) => {
            expect(closed.canPlanBeEditedBy(a)).toBe(false);
        });
    });

    it('only the owning company or an admin can pause or abandon', () => {
        expect(progress.canStatusBeChangedBy(company)).toBe(true);
        expect(progress.canStatusBeChangedBy(admin)).toBe(true);
        [activeMentor, student, otherCompany].forEach((a) => {
            expect(progress.canStatusBeChangedBy(a)).toBe(false);
        });
    });

    it('an already-closed internship cannot be closed again', () => {
        expect(buildProgress({ status: 'completed' }).canBeClosedBy(company)).toBe(false);
        expect(buildProgress({ status: 'abandoned' }).canBeClosedBy(admin)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

describe('schedule helpers', () => {
    it('returns null for the elapsed ratio when the window is undated', () => {
        expect(buildProgress({ startDate: null, targetEndDate: null }).scheduleElapsedRatio(NOW))
            .toBeNull();
    });

    it('clamps the elapsed ratio into 0..1', () => {
        const past = buildProgress({ startDate: iso(-30), targetEndDate: iso(-10) });
        const future = buildProgress({ startDate: iso(10), targetEndDate: iso(20) });
        expect(past.scheduleElapsedRatio(NOW)).toBe(1);
        expect(future.scheduleElapsedRatio(NOW)).toBe(0);
    });

    it('reports roughly half a window as 0.5', () => {
        const p = buildProgress({ startDate: iso(-10), targetEndDate: iso(10) });
        expect(p.scheduleElapsedRatio(NOW)).toBeCloseTo(0.5, 1);
    });

    it('reports negative days remaining once the deadline passes', () => {
        expect(buildProgress({ targetEndDate: iso(-3) }).daysRemaining(NOW)).toBeLessThan(0);
    });
});

// ---------------------------------------------------------------------------
// Serialisation contract the frontend depends on
// ---------------------------------------------------------------------------

// toJSON() reads the real clock, so these fixtures are relative to today
// rather than to the frozen NOW the rule tests use.
const realIso = (offsetDays) =>
    new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

describe('toJSON shape', () => {
    it('exposes _id, metrics and schedule on a progress record', () => {
        const json = buildProgress({
            id: 42,
            progressPercent: 60,
            milestoneCount: 5,
            completedMilestoneCount: 3,
            totalHoursLogged: '12.50',
            startDate: realIso(-5),
            targetEndDate: realIso(5)
        }).toJSON();

        expect(json._id).toBe(42);
        expect(json.metrics.progressPercent).toBe(60);
        expect(json.metrics.completedMilestoneCount).toBe(3);
        // DECIMAL comes back from MySQL as a string; the API must not.
        expect(json.metrics.totalHoursLogged).toBe(12.5);
        expect(json.schedule.daysRemaining).toBeGreaterThan(0);
    });

    it('exposes derived milestone fields', () => {
        const json = buildMilestone({
            id: 7,
            weight: 3,
            status: 'in_progress',
            dueDate: realIso(-2),
            actualHours: '4.25'
        }).toJSON();

        expect(json._id).toBe(7);
        expect(json.weight).toBe(3);
        expect(json.actualHours).toBe(4.25);
        expect(json.isOverdue).toBe(true);
        expect(json.allowedTransitions).toContain('submitted');
    });
});
