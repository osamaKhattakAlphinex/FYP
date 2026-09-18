const crypto = require('crypto');
const {
    sequelize,
    InternshipProgress,
    ProgressMilestone,
    MilestoneSubmission,
    ProgressUpdate,
    Task,
    Student,
    Company,
    TaskEvaluationCriterion,
    InternshipEvaluation,
    EvaluationCriterionScore
} = require('../models');
const aiService = require('./aiService');
const ErrorResponse = require('../utils/errorResponse');
const { notifyEvaluationReady } = require('../utils/evaluationNotifications');

// ---------------------------------------------------------------------------
// Module 9 — Automated Evaluation
//
// Module 8 records the evidence (weighted milestones, review scores, on-time
// flags, rework, hours, check-ins, blockers, the closing rating). This service
// turns it into a rubric-based evaluation: every criterion gets an automated
// 0-100 score with a written reason; reviewers adjust and finalize in the
// controller. Kept out of the controller so the rules are unit-testable.
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const NOT_COMPLETED_MESSAGE = 'Evaluation becomes available once the internship is completed';
const FINALIZED_MESSAGE =
    'This evaluation has been finalized. An admin must reopen it before it can be changed.';

const roundTo = (value, places) => {
    const f = 10 ** places;
    return Math.round(Number(value) * f) / f;
};
const plain = (r) => (r && typeof r.get === 'function' ? r.get({ plain: true }) : r);

// DATEONLY columns come back as 'YYYY-MM-DD'; DATE columns as Date objects.
const startOfDay = (value) => {
    if (value == null) return null;
    const iso = value instanceof Date ? value.toISOString() : String(value);
    return new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime();
};

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

// Pure: turns the rows of one internship into the evidence snapshot the rules
// score. Field names are the snake_case AI contract (EvaluationEvidence).
// Rates are 0..1 and null when there was nothing to measure — null is scored
// as "no evidence", never as zero.
const computeEvidence = ({ progress, milestones = [], submissions = [], updates = [], now = new Date() }) => {
    const p = plain(progress) || {};
    const ms = milestones.map(plain);
    const subs = submissions.map(plain);
    const ups = updates.map(plain);

    const counted = ms.filter((m) => !ProgressMilestone.EXCLUDED_FROM_TOTAL.includes(m.status));
    const completed = counted.filter((m) => ProgressMilestone.EARNING_STATUSES.includes(m.status));
    const requiredOutstanding = ms.filter(
        (m) => m.isRequired !== false && ProgressMilestone.OUTSTANDING_STATUSES.includes(m.status)
    ).length;

    // Same definitions as the Module 8 report, so the two never disagree.
    const reviewed = subs.filter((s) => ['approved', 'changes_requested'].includes(s.status));
    const reworkRate = reviewed.length
        ? reviewed.filter((s) => s.status === 'changes_requested').length / reviewed.length
        : null;
    const onTimeRate = subs.length ? subs.filter((s) => !s.wasLate).length / subs.length : null;

    // Of the milestones that were approved, how many passed on attempt 1. A
    // milestone reopened and re-approved counts by its earliest approval.
    const firstApprovedAttempt = new Map();
    subs.filter((s) => s.status === 'approved').forEach((s) => {
        const key = String(s.milestoneId);
        const attempt = Number(s.attemptNumber) || 1;
        if (!firstApprovedAttempt.has(key) || attempt < firstApprovedAttempt.get(key)) {
            firstApprovedAttempt.set(key, attempt);
        }
    });
    const firstTimeApprovalRate = firstApprovedAttempt.size
        ? [...firstApprovedAttempt.values()].filter((a) => a === 1).length / firstApprovedAttempt.size
        : null;

    const scores = subs.map((s) => s.reviewScore).filter((v) => v != null).map(Number);
    const averageReviewScore = scores.length
        ? roundTo(scores.reduce((a, b) => a + b, 0) / scores.length, 2)
        : null;

    // The active window: start of the start date to the end of the day it
    // finished. Never less than one week, so a short internship is not scored
    // as if it had lasted a few hours.
    const startMs =
        startOfDay(p.startDate) ??
        (p.startedAt ? new Date(p.startedAt).getTime() : null) ??
        (p.createdAt ? new Date(p.createdAt).getTime() : now.getTime());
    const endDay = p.actualEndDate || p.completedAt || null;
    const endMs = endDay != null ? startOfDay(endDay) + DAY_MS : now.getTime();
    const activeWeeks = Math.max(1, roundTo((endMs - startMs) / WEEK_MS, 1));

    const expectedHours =
        p.expectedHoursPerWeek != null && Number(p.expectedHoursPerWeek) > 0
            ? roundTo(Number(p.expectedHoursPerWeek) * activeWeeks, 2)
            : null;
    const estimatedTotal = counted.reduce(
        (sum, m) => sum + (m.estimatedHours != null ? Number(m.estimatedHours) : 0),
        0
    );

    const blockers = ups.filter((u) => u.type === 'blocker');

    let finishedOnTime = null;
    let daysLate = 0;
    if (p.targetEndDate && endDay != null) {
        const lateBy = Math.ceil((startOfDay(endDay) - startOfDay(p.targetEndDate)) / DAY_MS);
        finishedOnTime = lateBy <= 0;
        daysLate = Math.max(0, lateBy);
    }

    const rate = (v) => (v == null ? null : roundTo(v, 3));

    return {
        weighted_completion: Number(p.progressPercent) || 0,
        milestone_count: counted.length,
        completed_milestones: completed.length,
        required_outstanding: requiredOutstanding,
        closed_with_outstanding_work: !!p.closedWithOutstandingWork,
        submission_count: subs.length,
        reviewed_count: reviewed.length,
        on_time_submission_rate: rate(onTimeRate),
        rework_rate: rate(reworkRate),
        first_time_approval_rate: rate(firstTimeApprovalRate),
        average_review_score: averageReviewScore,
        supervisor_rating: p.performanceRating != null ? Number(p.performanceRating) : null,
        hours_logged: roundTo(Number(p.totalHoursLogged) || 0, 2),
        expected_hours: expectedHours,
        estimated_hours: estimatedTotal > 0 ? roundTo(estimatedTotal, 2) : null,
        active_weeks: activeWeeks,
        checkin_count: ups.filter((u) => u.type === 'checkin').length,
        blockers_raised: blockers.length,
        blockers_resolved: blockers.filter((u) => u.resolvedAt != null).length,
        finished_on_time: finishedOnTime,
        days_late: daysLate
    };
};

// Thin DB loader around computeEvidence.
const loadEvidence = async (progress, options = {}) => {
    const { transaction } = options;
    const [milestones, submissions, updates] = await Promise.all([
        ProgressMilestone.findAll({ where: { progressId: progress.id }, transaction }),
        MilestoneSubmission.findAll({ where: { progressId: progress.id }, transaction }),
        ProgressUpdate.findAll({ where: { progressId: progress.id }, transaction })
    ]);
    return computeEvidence({ progress, milestones, submissions, updates });
};

// ---------------------------------------------------------------------------
// Rubric
// ---------------------------------------------------------------------------

// The task's own rubric, or the platform default when it has none.
const criteriaForTask = async (taskId, options = {}) => {
    const rows = await TaskEvaluationCriterion.findAll({
        where: { taskId },
        order: [['orderIndex', 'ASC'], ['id', 'ASC']],
        transaction: options.transaction
    });
    if (rows.length > 0) {
        return { criteria: rows.map((r) => r.toJSON()), isDefault: false };
    }
    return {
        criteria: TaskEvaluationCriterion.DEFAULT_CRITERIA.map((c) => ({ ...c })),
        isDefault: true
    };
};

// ---------------------------------------------------------------------------
// Fallback rules — a JavaScript copy of ai-service/app/services/evaluator.py,
// used when the AI service is unreachable. Same constants, same formulas,
// same response shape, so the numbers do not depend on whether it was up.
// ---------------------------------------------------------------------------

const NEUTRAL_SCORE = 60;
const QUALITY_REVIEW_SHARE = 0.7;
const QUALITY_SUPERVISOR_SHARE = 0.3;
const QUALITY_REWORK_THRESHOLD = 0.3;
const QUALITY_REWORK_MAX_PENALTY = 15;
const QUALITY_REWORK_FULL_AT = 0.7;
const LATE_FINISH_PENALTY = 20;
const LATE_FINISH_PER_DAY = 2;
const LATE_FINISH_MAX_PENALTY = 30;
const OUTSTANDING_WORK_PENALTY = 15;
const CHECKINS_PER_WEEK_TARGET = 1;
const CHECKIN_SHARE = 80;
const BLOCKER_RESOLVED_BONUS = 20;
const EFFORT_BAND_LOW = 0.9;
const EFFORT_BAND_HIGH = 1.3;
const EFFORT_OVERRUN_FLOOR = 80;
const EFFORT_OVERRUN_FLOOR_AT = 2;
const UNRESOLVED_BLOCKER_PENALTY = 10;
const STRENGTH_AT = 80;
const IMPROVEMENT_BELOW = 60;
const MAX_FEEDBACK_ITEMS = 3;
// The evidence line carrying the supervisor's private rating starts with this;
// the controller strips such lines from the student's view.
const SUPERVISOR_RATING_PREFIX = 'Supervisor closing rating';

const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const pct = (r) => `${Math.round(r * 100)}%`;
const neutral = (reason) => ({
    score: NEUTRAL_SCORE,
    hasEvidence: false,
    rationale: `Neutral score — insufficient evidence: ${reason}`,
    evidence: []
});

const RULES = {
    quality(ev) {
        const review = ev.average_review_score != null ? ((ev.average_review_score - 1) / 4) * 100 : null;
        const supervisor = ev.supervisor_rating != null ? ((ev.supervisor_rating - 1) / 4) * 100 : null;
        if (review == null && supervisor == null) {
            return neutral('no submission was given a review score and no closing rating was recorded.');
        }
        let base;
        let how;
        if (review != null && supervisor != null) {
            base = QUALITY_REVIEW_SHARE * review + QUALITY_SUPERVISOR_SHARE * supervisor;
            how = "review scores (70%) blended with the supervisor's closing rating (30%)";
        } else if (review != null) {
            base = review;
            how = 'the average review score';
        } else {
            base = supervisor;
            how = "the supervisor's closing rating";
        }
        const evidence = [];
        if (ev.average_review_score != null) {
            evidence.push(
                `Average review score ${Number(ev.average_review_score).toFixed(2)}/5 across ${ev.reviewed_count} reviewed submission(s)`
            );
        }
        if (ev.supervisor_rating != null) {
            evidence.push(`${SUPERVISOR_RATING_PREFIX} ${ev.supervisor_rating}/5`);
        }
        let penalty = 0;
        if (ev.rework_rate != null && ev.rework_rate > QUALITY_REWORK_THRESHOLD) {
            const share = (ev.rework_rate - QUALITY_REWORK_THRESHOLD) /
                (QUALITY_REWORK_FULL_AT - QUALITY_REWORK_THRESHOLD);
            penalty = QUALITY_REWORK_MAX_PENALTY * clamp(share, 0, 1);
            evidence.push(`${pct(ev.rework_rate)} of reviews asked for changes`);
        }
        let rationale = `Based on ${how}.`;
        if (penalty > 0) rationale += ` ${penalty.toFixed(1)} points deducted for a high rework rate.`;
        return { score: clamp(base - penalty), hasEvidence: true, rationale, evidence };
    },

    timeliness(ev) {
        if (ev.on_time_submission_rate == null && ev.finished_on_time == null) {
            return neutral('nothing was submitted and the internship had no target end date.');
        }
        const evidence = [];
        let base;
        let rationale;
        if (ev.on_time_submission_rate != null) {
            base = ev.on_time_submission_rate * 100;
            evidence.push(
                `${pct(ev.on_time_submission_rate)} of ${ev.submission_count} submission(s) were handed in by their due date`
            );
            rationale = 'Share of submissions delivered on time.';
        } else {
            base = NEUTRAL_SCORE;
            rationale = 'No submissions to time; starts from the neutral score.';
        }
        if (ev.finished_on_time === false) {
            const penalty = Math.min(
                LATE_FINISH_MAX_PENALTY,
                LATE_FINISH_PENALTY + LATE_FINISH_PER_DAY * ev.days_late
            );
            evidence.push(`Finished ${ev.days_late} day(s) after the target end date`);
            rationale += ` ${penalty} points deducted for finishing after the deadline.`;
            base -= penalty;
        } else if (ev.finished_on_time === true) {
            evidence.push('Finished by the target end date');
        }
        return { score: clamp(base), hasEvidence: true, rationale, evidence };
    },

    completion(ev) {
        if (!(ev.milestone_count > 0)) {
            return neutral('no milestones were planned, so there was no scope to measure against.');
        }
        const evidence = [
            `${ev.completed_milestones} of ${ev.milestone_count} milestone(s) approved (${ev.weighted_completion}% by weight)`
        ];
        let score = Number(ev.weighted_completion);
        let rationale = 'Weighted share of the planned milestones that were approved.';
        if (ev.closed_with_outstanding_work) {
            score -= OUTSTANDING_WORK_PENALTY;
            evidence.push(`Closed with ${ev.required_outstanding} required milestone(s) still open`);
            rationale += ` ${OUTSTANDING_WORK_PENALTY} points deducted because the internship was closed with required work outstanding.`;
        }
        return { score: clamp(score), hasEvidence: true, rationale, evidence };
    },

    communication(ev) {
        if (!(ev.checkin_count > 0) && !(ev.blockers_raised > 0)) {
            return neutral(
                'no check-ins or blockers were posted on the platform; communication may have happened elsewhere.'
            );
        }
        const weeks = Math.max(1, Number(ev.active_weeks) || 1);
        const rate = ev.checkin_count / weeks;
        let score = Math.min(1, rate / CHECKINS_PER_WEEK_TARGET) * CHECKIN_SHARE;
        const evidence = [
            `${ev.checkin_count} check-in(s) over ${weeks} active week(s) (${rate.toFixed(2)}/week)`
        ];
        let rationale = `Check-in cadence against a target of ${CHECKINS_PER_WEEK_TARGET} per week (worth up to ${CHECKIN_SHARE} points).`;
        if (ev.blockers_raised > 0) {
            evidence.push(`${ev.blockers_raised} blocker(s) raised, ${ev.blockers_resolved} resolved`);
        }
        if (ev.blockers_raised > 0 && ev.blockers_resolved > 0) {
            score += BLOCKER_RESOLVED_BONUS;
            rationale += ` +${BLOCKER_RESOLVED_BONUS} for raising blockers early and seeing them resolved.`;
        }
        return { score: clamp(score), hasEvidence: true, rationale, evidence };
    },

    effort(ev) {
        const baseline = ev.expected_hours || ev.estimated_hours;
        if (!baseline || baseline <= 0) {
            return neutral('no weekly hours target or milestone estimates to compare against.');
        }
        const source = ev.expected_hours ? 'expected hours' : 'estimated hours';
        const ratio = ev.hours_logged / baseline;
        let score;
        if (ratio < EFFORT_BAND_LOW) {
            score = (ratio / EFFORT_BAND_LOW) * 100;
        } else if (ratio <= EFFORT_BAND_HIGH) {
            score = 100;
        } else {
            const over = (ratio - EFFORT_BAND_HIGH) / (EFFORT_OVERRUN_FLOOR_AT - EFFORT_BAND_HIGH);
            score = Math.max(EFFORT_OVERRUN_FLOOR, 100 - clamp(over, 0, 1) * (100 - EFFORT_OVERRUN_FLOOR));
        }
        return {
            score: clamp(score),
            hasEvidence: true,
            rationale: `Logged hours as a share of the ${source}; ${EFFORT_BAND_LOW}–${EFFORT_BAND_HIGH}× scores full marks and over-running is only gently penalised.`,
            evidence: [`${ev.hours_logged}h logged against ${baseline}h ${source} (${ratio.toFixed(2)}×)`]
        };
    },

    reliability(ev) {
        const evidence = [];
        let base;
        let rationale;
        if (ev.first_time_approval_rate != null) {
            base = ev.first_time_approval_rate * 100;
            evidence.push(`${pct(ev.first_time_approval_rate)} of approved milestones passed on the first attempt`);
            rationale = 'Share of milestones approved without needing rework.';
        } else if (ev.rework_rate != null) {
            base = (1 - ev.rework_rate) * 100;
            evidence.push(`${pct(1 - ev.rework_rate)} of reviews were approvals`);
            rationale = 'Share of reviews that did not ask for changes.';
        } else {
            return neutral('no submission was reviewed.');
        }
        const unresolved = Math.max(0, ev.blockers_raised - ev.blockers_resolved);
        if (unresolved > 0) {
            base -= UNRESOLVED_BLOCKER_PENALTY;
            evidence.push(`${unresolved} blocker(s) left unresolved`);
            rationale += ` ${UNRESOLVED_BLOCKER_PENALTY} points deducted for unresolved blockers.`;
        }
        return { score: clamp(base), hasEvidence: true, rationale, evidence };
    }
};

const STRENGTH_TEXT = {
    quality: 'Consistently high-quality deliverables that reviewers rated well.',
    timeliness: 'Reliable delivery — work was handed in on schedule.',
    completion: 'Delivered the planned scope in full.',
    communication: 'Kept supervisors informed with regular check-ins.',
    effort: 'Put in the time the internship called for.',
    reliability: 'Work was usually accepted first time, with little rework.'
};
const IMPROVEMENT_TEXT = {
    quality: 'Raise the quality bar before submitting: self-review against the brief and ask for early feedback.',
    timeliness: 'Plan backwards from due dates and flag slippage before a deadline passes.',
    completion: 'Break remaining scope into smaller milestones and close each one out before starting the next.',
    communication: 'Post a short check-in at least once a week, and raise blockers as soon as they appear.',
    effort: 'Block out regular working time so logged hours track the agreed weekly commitment.',
    reliability: 'Clarify acceptance criteria up front to cut down on rework after review.'
};

// Same response shape as POST /evaluate-internship.
const fallbackEvaluation = (dto) => {
    const ev = dto.evidence || {};
    const scored = (dto.criteria || []).map((c) => {
        const rule = RULES[c.metric];
        const r = rule ? rule(ev) : neutral('unknown metric.');
        return { criterion: c, ...r, score: roundTo(clamp(r.score), 1) };
    });

    const overall = InternshipEvaluation.weightedScore(
        scored.map((s) => ({ weight: s.criterion.weight, score: s.score })),
        'score'
    ) ?? 0;
    const grade = InternshipEvaluation.gradeFor(overall);
    const backed = scored.filter((s) => s.hasEvidence).length;
    const confidence = scored.length ? roundTo(backed / scored.length, 3) : 0;

    const byName = (a, b) => String(a.criterion.name).localeCompare(String(b.criterion.name));
    const strengths = [];
    [...scored].sort((a, b) => (b.score - a.score) || byName(a, b)).forEach((s) => {
        const text = STRENGTH_TEXT[s.criterion.metric];
        if (s.hasEvidence && s.score >= STRENGTH_AT && text && !strengths.includes(text)) strengths.push(text);
    });
    const improvements = [];
    [...scored].sort((a, b) => (a.score - b.score) || byName(a, b)).forEach((s) => {
        const text = IMPROVEMENT_TEXT[s.criterion.metric];
        if (s.hasEvidence && s.score < IMPROVEMENT_BELOW && text && !improvements.includes(text)) improvements.push(text);
    });

    const ranked = [...scored].sort((a, b) => (b.score - a.score) || byName(a, b));
    const parts = [
        `Overall ${Math.round(overall)}/100 (grade ${grade}) on ${scored.length} criteria for "${dto.task_title || 'this internship'}".`
    ];
    if (ranked.length > 1) {
        const best = ranked[0];
        const worst = ranked[ranked.length - 1];
        parts.push(
            `Strongest: ${best.criterion.name} (${Math.round(best.score)}); weakest: ${worst.criterion.name} (${Math.round(worst.score)}).`
        );
    }
    parts.push(`${backed} of ${scored.length} criteria were backed by recorded evidence.`);
    if (confidence < 0.5) {
        parts.push('Evidence is thin, so treat this as a starting point and adjust where you know more.');
    }

    return {
        evaluation_id: String(dto.id),
        overall_score: overall,
        grade,
        confidence,
        summary: parts.join(' '),
        criteria: scored.map((s) => ({
            id: String(s.criterion.id),
            score: s.score,
            rationale: s.rationale,
            evidence: s.evidence,
            has_evidence: s.hasEvidence
        })),
        strengths: strengths.slice(0, MAX_FEEDBACK_ITEMS),
        improvements: improvements.slice(0, MAX_FEEDBACK_ITEMS)
    };
};

// An AI answer is only used when it scores every criterion we sent; anything
// else is treated like an outage rather than half-applied.
const isUsableResult = (result, dto) => {
    if (!result || !Array.isArray(result.criteria)) return false;
    const byId = new Map(result.criteria.map((c) => [String(c.id), c]));
    return dto.criteria.every((c) => {
        const r = byId.get(String(c.id));
        return r && Number.isFinite(Number(r.score)) && Number(r.score) >= 0 && Number(r.score) <= 100;
    });
};

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

// `EV-` + 10 uppercase hex characters (40 bits of randomness).
const generateVerificationCode = () => `EV-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

const evaluationIncludes = () => ([
    { model: EvaluationCriterionScore, as: 'criteria' },
    { model: Student, as: 'student', attributes: ['id', 'firstName', 'lastName', 'profilePicture'] },
    { model: Task, as: 'task', attributes: ['id', 'title', 'category'] },
    { model: Company, as: 'company', attributes: ['id', 'companyName', 'logo'] }
]);

const loadEvaluation = (id, options = {}) =>
    InternshipEvaluation.findByPk(id, { include: evaluationIncludes(), transaction: options.transaction });

// Recomputes the overall numbers from the criterion rows — never edited directly.
const applyTotals = (evaluation, rows) => {
    evaluation.autoScore = InternshipEvaluation.weightedScore(rows, 'autoScore');
    evaluation.finalScore = InternshipEvaluation.weightedScore(rows, 'finalScore');
    evaluation.grade = InternshipEvaluation.gradeFor(evaluation.finalScore);
};

// Creates the draft for a completed internship, or regenerates an existing
// draft. On first generation the rubric is snapshotted into the evaluation's
// own rows; on regeneration those rows are re-scored and a reviewer's
// adjustment is kept (`finalScore` only follows `autoScore` while unadjusted).
//
// trigger: 'completion' (fire-and-forget from Module 8), 'backfill' (a
// supervisor opened an internship completed before Module 9), or 'manual'.
const generateEvaluation = async (progressId, { trigger = 'manual' } = {}) => {
    const progress = await InternshipProgress.findByPk(progressId, {
        include: [{ model: Task, as: 'task', attributes: ['id', 'title', 'companyId'] }]
    });
    if (!progress) throw new ErrorResponse('Progress record not found', 404);
    if (progress.status !== 'completed') throw new ErrorResponse(NOT_COMPLETED_MESSAGE, 400);

    const existing = await InternshipEvaluation.findOne({
        where: { progressId: progress.id },
        include: [{ model: EvaluationCriterionScore, as: 'criteria' }]
    });
    if (existing && existing.isFinalized()) throw new ErrorResponse(FINALIZED_MESSAGE, 409);

    const evidence = await loadEvidence(progress);

    // Criteria to score: the evaluation's own snapshot when it has one,
    // otherwise the task rubric (or the default) as it stands right now.
    let lines;
    if (existing && existing.criteria && existing.criteria.length > 0) {
        lines = [...existing.criteria]
            .sort((a, b) => (a.orderIndex - b.orderIndex) || (Number(a.id) - Number(b.id)))
            .map((row) => ({ key: String(row.id), row, name: row.name, metric: row.metric, weight: row.weight }));
    } else {
        const { criteria } = await criteriaForTask(progress.taskId);
        lines = criteria.map((c, i) => ({
            key: `new-${i}`,
            name: c.name,
            description: c.description || null,
            metric: c.metric,
            weight: Number(c.weight) || 1,
            orderIndex: i
        }));
    }

    const dto = aiService.mapEvaluationToDto(
        existing ? existing.id : `progress-${progress.id}`,
        progress.task ? progress.task.title : '',
        lines,
        evidence
    );

    // --- AI scoring, with graceful degradation (same pattern as Module 8) ---
    let result;
    let aiGenerated = false;
    try {
        result = await aiService.evaluateInternship(dto);
        if (!isUsableResult(result, dto)) {
            throw new aiService.AIServiceUnavailableError('response did not score every criterion');
        }
        aiGenerated = true;
    } catch (err) {
        if (!(err instanceof aiService.AIServiceUnavailableError)) throw err;
        console.warn('[evaluation] AI unavailable, using fallback rules:', err.message);
        result = fallbackEvaluation(dto);
    }
    const byKey = new Map(result.criteria.map((c) => [String(c.id), c]));
    const scoreFor = (key) => roundTo(Number(byKey.get(key).score), 2);

    const t = await sequelize.transaction();
    let evaluation = existing;
    let created = false;
    try {
        if (!evaluation) {
            evaluation = await InternshipEvaluation.create(
                {
                    progressId: progress.id,
                    applicationId: progress.applicationId,
                    studentId: progress.studentId,
                    taskId: progress.taskId,
                    companyId: progress.companyId,
                    status: 'draft'
                },
                { transaction: t }
            );
            created = true;
            await EvaluationCriterionScore.bulkCreate(
                lines.map((line) => {
                    const r = byKey.get(line.key);
                    const score = scoreFor(line.key);
                    return {
                        evaluationId: evaluation.id,
                        name: line.name,
                        description: line.description,
                        metric: line.metric,
                        weight: line.weight,
                        orderIndex: line.orderIndex,
                        autoScore: score,
                        finalScore: score,
                        rationale: r.rationale,
                        evidence: Array.isArray(r.evidence) ? r.evidence : [],
                        hasEvidence: r.has_evidence !== false,
                        adjusted: false
                    };
                }),
                { transaction: t }
            );
        } else {
            for (const line of lines) {
                const r = byKey.get(line.key);
                const row = line.row;
                row.autoScore = scoreFor(line.key);
                row.rationale = r.rationale;
                row.evidence = Array.isArray(r.evidence) ? r.evidence : [];
                row.hasEvidence = r.has_evidence !== false;
                // A reviewer's adjustment survives regeneration.
                if (!row.adjusted) row.finalScore = row.autoScore;
                await row.save({ transaction: t });
            }
        }

        const rows = await EvaluationCriterionScore.findAll({
            where: { evaluationId: evaluation.id },
            transaction: t
        });
        applyTotals(evaluation, rows);
        evaluation.confidence = result.confidence != null ? roundTo(result.confidence, 3) : null;
        evaluation.aiGenerated = aiGenerated;
        // The automated narrative is regenerated with the scores; the
        // reviewer's own note and per-criterion adjustments are kept.
        evaluation.summary = result.summary || null;
        evaluation.strengths = Array.isArray(result.strengths) ? result.strengths : [];
        evaluation.improvements = Array.isArray(result.improvements) ? result.improvements : [];
        evaluation.evidence = evidence;
        evaluation.generatedAt = new Date();
        evaluation.generationCount = (Number(evaluation.generationCount) || 0) + 1;
        await evaluation.save({ transaction: t });

        await t.commit();
    } catch (err) {
        try { await t.rollback(); } catch (e) { /* already rolled back */ }
        // Completion fires generation in the background while a supervisor
        // may already be opening the tab: if another request created the row
        // first, its (deterministic, identical) draft is the answer.
        if (!existing && err.name === 'SequelizeUniqueConstraintError') {
            const winner = await InternshipEvaluation.findOne({ where: { progressId: progress.id } });
            if (winner) return { evaluation: await loadEvaluation(winner.id), created: false };
        }
        throw err;
    }

    if (created && trigger === 'completion') notifyEvaluationReady(evaluation.id);

    return { evaluation: await loadEvaluation(evaluation.id), created };
};

module.exports = {
    NOT_COMPLETED_MESSAGE,
    FINALIZED_MESSAGE,
    SUPERVISOR_RATING_PREFIX,
    NEUTRAL_SCORE,
    computeEvidence,
    loadEvidence,
    criteriaForTask,
    fallbackEvaluation,
    isUsableResult,
    generateVerificationCode,
    evaluationIncludes,
    loadEvaluation,
    applyTotals,
    generateEvaluation
};
