const { InternshipEvaluation, EvaluationCriterionScore, Feedback } = require('../models');
const aiService = require('./aiService');
const {
    loadEvidence,
    criteriaForTask,
    fallbackEvaluation
} = require('./evaluationService');

// ---------------------------------------------------------------------------
// Module 10 — Feedback System
//
// A JavaScript copy of ai-service/app/services/feedback_assistant.py. It is
// used (a) when the AI service is unreachable, with the same response shape,
// and (b) always, as the server-side tone guard on create/update — so saving
// feedback never depends on the AI service being up. Keep constants, messages
// and issue order identical to the Python module.
// ---------------------------------------------------------------------------

const STRENGTH_AT = 80;
const IMPROVEMENT_BELOW = 60;
const MAX_ITEMS = 3;
const MAX_SUGGESTIONS = 5;

const ON_TIME_STRENGTH_AT = 0.9;
const ON_TIME_IMPROVEMENT_BELOW = 0.6;
const REWORK_STRENGTH_AT_MOST = 0.1;
const REWORK_IMPROVEMENT_ABOVE = 0.4;

const STRENGTH_TEXT = {
    quality: 'Delivered high-quality work that reviewers rated well.',
    timeliness: 'Reliable with deadlines: work was handed in on schedule.',
    completion: 'Completed the planned scope in full.',
    communication: 'Kept supervisors informed with regular check-ins.',
    effort: 'Committed the time the internship called for.',
    reliability: 'Work was usually accepted first time, with little rework.'
};
const IMPROVEMENT_TEXT = {
    quality: 'Raise the quality of submissions: self-review against the brief before handing work in.',
    timeliness: 'Work on delivering by the agreed due dates.',
    completion: 'Finish the agreed scope: some planned milestones were not completed.',
    communication: 'Communicate more often: share progress and raise blockers early.',
    effort: 'Put in steadier effort so logged time matches the agreed weekly commitment.',
    reliability: 'Reduce rework by clarifying what is expected before submitting.'
};
const SUGGESTION_TEXT = {
    quality: 'Ask for a review checkpoint midway through each milestone so issues are caught before the final submission.',
    timeliness: 'Set an internal deadline two days ahead of each due date and flag any slippage as soon as it appears.',
    completion: 'Break the remaining scope into small milestones and close each one out before starting the next.',
    communication: 'Post a short written check-in every week covering progress, next steps and blockers.',
    effort: 'Block out fixed working hours each week so time spent matches the agreed commitment.',
    reliability: 'Confirm the acceptance criteria before starting each milestone to cut down on rework.'
};
const GENERIC_GROWTH_SUGGESTION =
    'Pick one skill used in this internship to deepen next and set a concrete goal for it.';

const TEMPLATE_PREFIX = 'Template: ';
const INTERVIEW_STRENGTHS = [
    `${TEMPLATE_PREFIX}name one thing the candidate did well, e.g. how clearly they explained their past work.`
];
const INTERVIEW_IMPROVEMENTS = [
    `${TEMPLATE_PREFIX}name one area to prepare better, e.g. giving concrete examples when answering technical questions.`
];
const INTERVIEW_SUGGESTIONS = [
    'Prepare two short examples of past work using the situation, action, result format.',
    "Research the company's product before an interview and prepare one question about it."
];

const MIN_COMBINED_LENGTH = 40;
const SHOUTING_MIN_LETTERS = 20;
const SHOUTING_UPPER_SHARE = 0.6;
const SEVERITY_PENALTY = { critical: 40, warning: 15, info: 5 };

// Personal, insulting words only — technical terms that sound negative
// ("lazy loading", "dumb component", "garbage collection") are deliberately
// absent so honest engineering feedback is never blocked.
const HARSH_WORDS = [
    'stupid', 'idiot', 'idiotic', 'moron', 'moronic', 'incompetent', 'pathetic',
    'worthless', 'useless', 'hopeless', 'clueless', 'loser', 'shut up'
];
const ACTION_VERBS = [
    'add', 'aim', 'ask', 'break', 'build', 'check', 'clarify', 'communicate', 'consider',
    'document', 'focus', 'improve', 'keep', 'learn', 'plan', 'practice', 'practise',
    'prepare', 'prioritise', 'prioritize', 'read', 'refactor', 'review', 'schedule', 'set',
    'share', 'spend', 'split', 'start', 'test', 'track', 'try', 'use', 'work on', 'write'
];

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordPattern = (word) => new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
const HARSH_PATTERNS = HARSH_WORDS.map((w) => [w, wordPattern(w)]);
const ACTION_PATTERNS = ACTION_VERBS.map(wordPattern);

const clean = (text) => (text == null ? '' : String(text).trim());
const cleanList = (items) =>
    (Array.isArray(items) ? items : []).map(clean).filter((s) => s.length > 0);
// Code-point ordering, like Python's default string sort (not localeCompare).
const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

// Weighted criterion mean mapped onto 1..5 (score / 20), half up; null without criteria.
const suggestRating = (criteria) => {
    if (!Array.isArray(criteria) || criteria.length === 0) return null;
    const totalWeight = criteria.reduce((sum, c) => sum + (Number(c.weight) || 1), 0);
    const mean = criteria.reduce((sum, c) => sum + (Number(c.weight) || 1) * Number(c.score), 0) / totalWeight;
    return Math.max(1, Math.min(5, Math.floor(mean / 20 + 0.5)));
};

const draftInternship = (criteria, ind) => {
    const strengths = [];
    const improvements = [];
    const rows = (criteria || []).map((c) => ({ ...c, score: Number(c.score), name: c.name || '' }));

    [...rows].sort((a, b) => (b.score - a.score) || byName(a, b)).forEach((c) => {
        if (c.score >= STRENGTH_AT && !strengths.includes(c.metric)) strengths.push(c.metric);
    });
    [...rows].sort((a, b) => (a.score - b.score) || byName(a, b)).forEach((c) => {
        if (c.score < IMPROVEMENT_BELOW && !improvements.includes(c.metric)) improvements.push(c.metric);
    });

    // Indicators only speak where no criterion already has, so the student is
    // never praised and criticised for the same thing.
    const add = (metric, into) => {
        if (!strengths.includes(metric) && !improvements.includes(metric)) into.push(metric);
    };
    const i = ind || {};
    if (i.on_time_submission_rate != null) {
        if (i.on_time_submission_rate >= ON_TIME_STRENGTH_AT) add('timeliness', strengths);
        else if (i.on_time_submission_rate < ON_TIME_IMPROVEMENT_BELOW) add('timeliness', improvements);
    }
    if (i.rework_rate != null) {
        if (i.rework_rate <= REWORK_STRENGTH_AT_MOST) add('reliability', strengths);
        else if (i.rework_rate > REWORK_IMPROVEMENT_ABOVE) add('reliability', improvements);
    }

    return { strengths: strengths.slice(0, MAX_ITEMS), improvements: improvements.slice(0, MAX_ITEMS) };
};

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

const findHarshWords = (text) => HARSH_PATTERNS.filter(([, p]) => p.test(text)).map(([w]) => w);
const isActionable = (text) => ACTION_PATTERNS.some((p) => p.test(text));
const isShouting = (text) => {
    const letters = (String(text).match(/[A-Za-z]/g) || []).length;
    if (letters < SHOUTING_MIN_LETTERS) return false;
    const upper = (String(text).match(/[A-Z]/g) || []).length;
    return upper / letters >= SHOUTING_UPPER_SHARE;
};

// draft: { strengths, improvements, suggestions, overall_rating } (snake_case,
// as in the AI contract). Returns { quality_score, issues: [{code,severity,message}] }.
const reviewDraft = (draft = {}, fallbackRating = null) => {
    const strengths = clean(draft.strengths);
    const improvements = clean(draft.improvements);
    const suggestions = cleanList(draft.suggestions);
    const rating = draft.overall_rating != null ? Number(draft.overall_rating) : fallbackRating;
    const everything = [strengths, improvements, ...suggestions].join(' ').trim();

    const issues = [];
    const flag = (code, severity, message) => issues.push({ code, severity, message });

    const harsh = findHarshWords(everything);
    if (harsh.length > 0) {
        const quoted = harsh.map((w) => `"${w}"`).join(', ');
        flag(
            'harsh_language',
            'critical',
            `Remove personal or insulting language (${quoted}). Describe the work and its impact, not the person.`
        );
    }

    if (strengths.length + improvements.length < MIN_COMBINED_LENGTH) {
        flag(
            'too_short',
            'warning',
            `The feedback is very short. Aim for at least ${MIN_COMBINED_LENGTH} characters across strengths and improvements so the student has something to learn from.`
        );
    }

    // Judged per field: one shouted paragraph is shouting even when the rest
    // of the feedback is written normally.
    if ([strengths, improvements, suggestions.join(' ')].some(isShouting)) {
        flag(
            'shouting',
            'warning',
            'Most of the text is in capital letters, which reads as shouting. Use normal sentence case.'
        );
    }

    if (suggestions.length === 0) {
        flag('no_suggestions', 'warning', 'Add at least one specific suggestion the student can act on next.');
    }

    if (rating != null && rating <= 2 && !improvements) {
        flag(
            'rating_mismatch',
            'warning',
            'A low rating without any improvements gives the student nothing to act on. Explain what fell short.'
        );
    } else if (rating === 5 && !strengths && improvements) {
        flag(
            'rating_mismatch',
            'warning',
            'A top rating with only improvements listed reads as contradictory. Add what went well.'
        );
    }

    if (!strengths) {
        flag(
            'unbalanced',
            'info',
            'Mention at least one strength. Balanced feedback is easier to accept and act on.'
        );
    } else if (!improvements && rating != null && rating <= 4) {
        flag(
            'unbalanced',
            'info',
            'The rating is below 5 but no improvements are listed. Say what would have earned a higher rating.'
        );
    }

    if (improvements && !isActionable(improvements)) {
        flag(
            'not_actionable',
            'info',
            'The improvements describe problems but not what to do. Start with an action, e.g. "Plan…", "Ask…", "Test…".'
        );
    }

    const penalty = issues.reduce((sum, i) => sum + SEVERITY_PENALTY[i.severity], 0);
    return { quality_score: Math.max(0, 100 - penalty), issues };
};

// Same response shape as POST /feedback-assist.
const fallbackFeedbackAssist = (dto = {}) => {
    const review = reviewDraft(dto.draft || {}, dto.overall_rating ?? null);

    if (dto.context === 'interview') {
        return {
            suggested_overall_rating: null,
            suggested_strengths: [...INTERVIEW_STRENGTHS],
            suggested_improvements: [...INTERVIEW_IMPROVEMENTS],
            suggested_suggestions: [...INTERVIEW_SUGGESTIONS],
            review
        };
    }

    const { strengths, improvements } = draftInternship(dto.criteria, dto.indicators);
    let suggestions = improvements.map((m) => SUGGESTION_TEXT[m]);
    if (suggestions.length === 0) suggestions = [GENERIC_GROWTH_SUGGESTION];

    return {
        suggested_overall_rating: suggestRating(dto.criteria),
        suggested_strengths: strengths.map((m) => STRENGTH_TEXT[m]),
        suggested_improvements: improvements.map((m) => IMPROVEMENT_TEXT[m]),
        suggested_suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
        review
    };
};

// An AI answer is only used when it has the full shape; anything else is
// treated like an outage rather than half-applied.
const isUsableAssist = (result) =>
    !!result &&
    ['suggested_strengths', 'suggested_improvements', 'suggested_suggestions'].every((k) =>
        Array.isArray(result[k])
    ) &&
    !!result.review &&
    Number.isFinite(Number(result.review.quality_score)) &&
    Array.isArray(result.review.issues);

// ---------------------------------------------------------------------------
// Tone guard (create / update / student response)
// ---------------------------------------------------------------------------

// Returns the first critical issue in the text, or null. Deterministic and
// local: it never calls the AI service.
const toneGuard = ({ strengths, improvements, suggestions, response } = {}) => {
    const text = [clean(strengths), clean(improvements), ...cleanList(suggestions), clean(response)]
        .join(' ')
        .trim();
    return reviewDraft({ strengths: text }).issues.find((i) => i.severity === 'critical') || null;
};

// ---------------------------------------------------------------------------
// Summary (pure)
// ---------------------------------------------------------------------------

const RECENT_EXCERPT = 200;
const round = (v, places) => Math.round(v * 10 ** places) / 10 ** places;
const plain = (r) => (r && typeof r.toJSON === 'function' ? r.toJSON() : r);

// The student's performance record at a glance: counts, averages, how often
// authors would recommend them, and the three newest records.
const summarizeFeedback = (records = [], { recentLimit = 3 } = {}) => {
    const rows = records.map(plain).filter(Boolean);
    const overall = rows.map((r) => Number(r.overallRating)).filter((v) => !Number.isNaN(v));

    const averageByDimension = Feedback.DIMENSIONS.reduce((acc, d) => {
        const values = rows
            .map((r) => (r.ratings ? r.ratings[d] : null))
            .filter((v) => v != null && !Number.isNaN(Number(v)))
            .map(Number);
        acc[d] = values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, 2) : null;
        return acc;
    }, {});

    const answered = rows.filter((r) => r.wouldRecommend != null);
    const recommendRate = answered.length
        ? round(answered.filter((r) => r.wouldRecommend === true || r.wouldRecommend === 1).length / answered.length, 3)
        : null;

    const byContext = Feedback.CONTEXTS.reduce((acc, c) => {
        acc[c] = rows.filter((r) => r.context === c).length;
        return acc;
    }, {});

    const newestFirst = [...rows].sort(
        (a, b) =>
            (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ||
            (Number(b.id) - Number(a.id))
    );

    return {
        count: rows.length,
        averageOverall: overall.length ? round(overall.reduce((a, b) => a + b, 0) / overall.length, 2) : null,
        averageByDimension,
        recommendRate,
        byContext,
        recent: newestFirst.slice(0, recentLimit).map((r) => ({
            id: String(r.id),
            context: r.context,
            authorName: r.authorName || null,
            authorRole: r.authorRole,
            overallRating: Number(r.overallRating),
            taskTitle: r.task ? r.task.title : undefined,
            createdAt: r.createdAt,
            strengthsExcerpt: clean(r.strengths).slice(0, RECENT_EXCERPT)
        }))
    };
};

// ---------------------------------------------------------------------------
// Assist evidence + call
// ---------------------------------------------------------------------------

// Criterion scores for the assistant: the Module 9 evaluation when one exists
// (draft or finalized — the assist is author-only), otherwise the same rules
// run on the fly over the task rubric, without storing anything. An abandoned
// internship never gets an evaluation, but its evidence is still worth using.
const internshipAssistEvidence = async (progress) => {
    const evidence = await loadEvidence(progress);
    const indicators = {
        weighted_completion: evidence.weighted_completion,
        on_time_submission_rate: evidence.on_time_submission_rate,
        rework_rate: evidence.rework_rate,
        average_review_score: evidence.average_review_score,
        checkin_count: evidence.checkin_count,
        hours_logged: evidence.hours_logged
    };

    const evaluation = await InternshipEvaluation.findOne({
        where: { progressId: progress.id },
        include: [{ model: EvaluationCriterionScore, as: 'criteria' }]
    });
    if (evaluation && Array.isArray(evaluation.criteria) && evaluation.criteria.length > 0) {
        return {
            source: 'evaluation',
            indicators,
            criteria: evaluation.criteria.map((c) => ({
                name: c.name,
                metric: c.metric,
                score: c.finalScore != null ? Number(c.finalScore) : Number(c.autoScore),
                weight: c.weight
            }))
        };
    }

    const { criteria } = await criteriaForTask(progress.taskId);
    const lines = criteria.map((c, i) => ({ key: `c-${i}`, name: c.name, metric: c.metric, weight: c.weight }));
    const scored = fallbackEvaluation(aiService.mapEvaluationToDto(`assist-${progress.id}`, '', lines, evidence));
    const byId = new Map(scored.criteria.map((c) => [String(c.id), c]));
    return {
        source: 'rules',
        indicators,
        criteria: lines
            // A neutral score for "no evidence" says nothing about the student.
            .filter((l) => byId.get(l.key) && byId.get(l.key).has_evidence)
            .map((l) => ({ name: l.name, metric: l.metric, score: byId.get(l.key).score, weight: l.weight }))
    };
};

// AI first, deterministic fallback on outage — the Module 8/9 pattern.
const runAssist = async (dto) => {
    try {
        const result = await aiService.assistFeedback(dto);
        if (!isUsableAssist(result)) {
            throw new aiService.AIServiceUnavailableError('response did not have the assist shape');
        }
        return { result, aiGenerated: true };
    } catch (err) {
        if (!(err instanceof aiService.AIServiceUnavailableError)) throw err;
        console.warn('[feedback] AI unavailable, using fallback rules:', err.message);
        return { result: fallbackFeedbackAssist(dto), aiGenerated: false };
    }
};

module.exports = {
    STRENGTH_TEXT,
    IMPROVEMENT_TEXT,
    SUGGESTION_TEXT,
    GENERIC_GROWTH_SUGGESTION,
    TEMPLATE_PREFIX,
    INTERVIEW_SUGGESTIONS,
    HARSH_WORDS,
    SEVERITY_PENALTY,
    suggestRating,
    reviewDraft,
    fallbackFeedbackAssist,
    isUsableAssist,
    toneGuard,
    findHarshWords,
    isShouting,
    summarizeFeedback,
    internshipAssistEvidence,
    runAssist
};
