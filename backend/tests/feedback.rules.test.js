/**
 * Module 10 — rule-level tests.
 *
 * The parts of the feedback system that are pure logic: the Feedback model's
 * access predicates and eligibility statics, the fallback assist (drafting and
 * every review rule), the server-side tone guard and the summary aggregation.
 * No database is required:
 *
 *     npm test
 *
 * HTTP flows (create/duplicate/acknowledge/edit lock/delete, the summary
 * access matrix, the assist endpoint) are exercised by the integration run
 * recorded in docs/qa/module-10-feedback-system.md.
 */
require('dotenv').config();

const Feedback = require('../src/models/Feedback');
const {
    STRENGTH_TEXT,
    IMPROVEMENT_TEXT,
    SUGGESTION_TEXT,
    GENERIC_GROWTH_SUGGESTION,
    TEMPLATE_PREFIX,
    INTERVIEW_SUGGESTIONS,
    SEVERITY_PENALTY,
    suggestRating,
    reviewDraft,
    fallbackFeedbackAssist,
    isUsableAssist,
    toneGuard,
    findHarshWords,
    isShouting,
    summarizeFeedback
} = require('../src/services/feedbackService');

const buildFeedback = (attrs = {}) =>
    Feedback.build({
        context: 'internship',
        progressId: 1,
        applicationId: 2,
        studentId: 10,
        taskId: 20,
        companyId: 30,
        authorUserId: 100,
        authorRole: 'company',
        authorName: 'Acme',
        overallRating: 4,
        strengths: 'Clean, well-tested code throughout.',
        improvements: 'Plan the UI earlier.',
        ...attrs
    });

const actors = {
    admin: { role: 'admin', userId: 1 },
    author: { role: 'company', userId: 100, companyId: 30 },
    ownerColleague: { role: 'company', userId: 101, companyId: 30 },
    strangerCompany: { role: 'company', userId: 102, companyId: 31 },
    student: { role: 'student', userId: 200, studentId: 10 },
    otherStudent: { role: 'student', userId: 201, studentId: 11 },
    activeMentor: { role: 'mentor', userId: 300, mentorId: 5, isAssignedMentor: true, isActiveMentor: true },
    pastMentor: { role: 'mentor', userId: 301, mentorId: 6, isAssignedMentor: true, isActiveMentor: false },
    strangerMentor: { role: 'mentor', userId: 302, mentorId: 7, isAssignedMentor: false, isActiveMentor: false }
};

const GOOD_DRAFT = {
    strengths: 'Delivered a clean data layer with thorough tests and clear commit messages.',
    improvements: 'Plan the UI work earlier so the final milestone is not rushed.',
    suggestions: ['Set an internal deadline two days before each due date.'],
    overall_rating: 4
};
const codes = (review) => review.issues.map((i) => i.code);
const crit = (metric, score, name, weight = 1) => ({
    name: name || metric[0].toUpperCase() + metric.slice(1),
    metric,
    score,
    weight
});

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

describe('Feedback.canAuthorInternshipFeedback', () => {
    const progress = (status) => ({ status, companyId: 30 });

    it.each(['not_started', 'in_progress', 'paused'])('refuses everyone while the internship is %s', (status) => {
        expect(Feedback.canAuthorInternshipFeedback(progress(status), actors.author)).toBe(false);
        expect(Feedback.canAuthorInternshipFeedback(progress(status), actors.activeMentor)).toBe(false);
    });

    it.each(['completed', 'abandoned'])('opens to the owning company and assigned mentors once %s', (status) => {
        expect(Feedback.canAuthorInternshipFeedback(progress(status), actors.author)).toBe(true);
        expect(Feedback.canAuthorInternshipFeedback(progress(status), actors.activeMentor)).toBe(true);
        expect(Feedback.canAuthorInternshipFeedback(progress(status), actors.pastMentor)).toBe(true);
    });

    it('never lets a stranger, the student or the admin author', () => {
        const p = progress('completed');
        expect(Feedback.canAuthorInternshipFeedback(p, actors.strangerCompany)).toBe(false);
        expect(Feedback.canAuthorInternshipFeedback(p, actors.strangerMentor)).toBe(false);
        expect(Feedback.canAuthorInternshipFeedback(p, actors.student)).toBe(false);
        expect(Feedback.canAuthorInternshipFeedback(p, actors.admin)).toBe(false);
    });

    it('isInternshipSupervisor tells "not yet" apart from "not you"', () => {
        const open = progress('in_progress');
        expect(Feedback.isInternshipSupervisor(open, actors.author)).toBe(true);
        expect(Feedback.isInternshipSupervisor(open, actors.strangerCompany)).toBe(false);
    });
});

describe('Feedback.canAuthorInterviewFeedback', () => {
    const interview = (status) => ({ status, companyId: 30 });

    it('only after the interview is completed, and only by the owning company', () => {
        expect(Feedback.canAuthorInterviewFeedback(interview('completed'), actors.author)).toBe(true);
        ['scheduled', 'rescheduled', 'cancelled', 'no_show'].forEach((s) => {
            expect(Feedback.canAuthorInterviewFeedback(interview(s), actors.author)).toBe(false);
        });
        expect(Feedback.canAuthorInterviewFeedback(interview('completed'), actors.strangerCompany)).toBe(false);
        expect(Feedback.canAuthorInterviewFeedback(interview('completed'), actors.activeMentor)).toBe(false);
        expect(Feedback.canAuthorInterviewFeedback(interview('completed'), actors.admin)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Access predicates
// ---------------------------------------------------------------------------

describe('Feedback access predicates', () => {
    it('is visible to the student it is about, the author, the owning company, admin and assigned mentors', () => {
        const fb = buildFeedback();
        ['admin', 'author', 'ownerColleague', 'student', 'activeMentor', 'pastMentor'].forEach((a) => {
            expect([a, fb.canBeViewedBy(actors[a])]).toEqual([a, true]);
        });
    });

    it('is hidden from other students, stranger companies and unassigned mentors', () => {
        const fb = buildFeedback();
        ['otherStudent', 'strangerCompany', 'strangerMentor'].forEach((a) => {
            expect([a, fb.canBeViewedBy(actors[a])]).toEqual([a, false]);
        });
        expect(fb.canBeViewedBy(null)).toBe(false);
    });

    it('shows a mentor-authored record to the owning company', () => {
        const fb = buildFeedback({ authorUserId: 300, authorRole: 'mentor' });
        expect(fb.canBeViewedBy(actors.ownerColleague)).toBe(true);
        expect(fb.canBeViewedBy(actors.activeMentor)).toBe(true);
    });

    it('never shows interview feedback to a mentor', () => {
        const fb = buildFeedback({ context: 'interview', progressId: null, interviewId: 9 });
        expect(fb.canBeViewedBy(actors.activeMentor)).toBe(false);
        expect(fb.canBeViewedBy(actors.student)).toBe(true);
    });

    it('lets only the author edit, and only until the student acknowledges', () => {
        const fb = buildFeedback();
        expect(fb.canBeEditedBy(actors.author)).toBe(true);
        expect(fb.canBeEditedBy(actors.ownerColleague)).toBe(false);
        expect(fb.canBeEditedBy(actors.admin)).toBe(false);
        expect(fb.canBeEditedBy(actors.student)).toBe(false);

        const acknowledged = buildFeedback({ studentAcknowledgedAt: new Date() });
        expect(acknowledged.canBeEditedBy(actors.author)).toBe(false);
    });

    it('lets the author delete before acknowledgement and the admin at any time', () => {
        expect(buildFeedback().canBeDeletedBy(actors.author)).toBe(true);
        const acknowledged = buildFeedback({ studentAcknowledgedAt: new Date() });
        expect(acknowledged.canBeDeletedBy(actors.author)).toBe(false);
        expect(acknowledged.canBeDeletedBy(actors.admin)).toBe(true);
        expect(buildFeedback().canBeDeletedBy(actors.student)).toBe(false);
        expect(buildFeedback().canBeDeletedBy(actors.strangerCompany)).toBe(false);
    });

    it('lets only the student it is about acknowledge, once', () => {
        const fb = buildFeedback();
        expect(fb.canBeAcknowledgedBy(actors.student)).toBe(true);
        expect(fb.canBeAcknowledgedBy(actors.otherStudent)).toBe(false);
        expect(fb.canBeAcknowledgedBy(actors.author)).toBe(false);
        expect(buildFeedback({ studentAcknowledgedAt: new Date() }).canBeAcknowledgedBy(actors.student)).toBe(false);
    });

    it('matches the author by user id, not by role', () => {
        // Another user of the same company is not the author.
        const fb = buildFeedback();
        expect(fb.isAuthor(actors.ownerColleague)).toBe(false);
        expect(buildFeedback({ authorUserId: null }).isAuthor({ role: 'company', userId: null })).toBe(false);
    });
});

describe('Feedback.toJSON', () => {
    it('adds _id, whitelists dimension ratings and averages them', () => {
        const json = buildFeedback({
            ratings: { technical: 5, communication: 3, bogus: 1 },
            suggestions: ['Write tests first.']
        }).toJSON();
        expect(json._id).toBe(json.id);
        expect(json.ratings).toEqual({ technical: 5, communication: 3 });
        expect(json.averageDimensionRating).toBe(4);
        expect(json.suggestions).toEqual(['Write tests first.']);
    });

    it('parses JSON columns returned as strings and defaults empty ones', () => {
        const json = buildFeedback({ ratings: '{"teamwork":2}', suggestions: '["a b c d e"]' }).toJSON();
        expect(json.ratings).toEqual({ teamwork: 2 });
        expect(json.suggestions).toEqual(['a b c d e']);
        const empty = buildFeedback({ ratings: null, suggestions: null }).toJSON();
        expect(empty.ratings).toEqual({});
        expect(empty.suggestions).toEqual([]);
        expect(empty.averageDimensionRating).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Fallback drafting (mirror of feedback_assistant.py)
// ---------------------------------------------------------------------------

const internship = (overrides = {}) => ({
    context: 'internship',
    task_title: 'Build a dashboard',
    student_name: null,
    overall_rating: null,
    criteria: [],
    indicators: {},
    draft: {},
    ...overrides
});

describe('fallbackFeedbackAssist — drafting', () => {
    it('drafts strengths from criteria >= 80 and improvements from criteria < 60', () => {
        const r = fallbackFeedbackAssist(internship({
            criteria: [crit('quality', 92), crit('timeliness', 40), crit('effort', 70)]
        }));
        expect(r.suggested_strengths).toEqual([STRENGTH_TEXT.quality]);
        expect(r.suggested_improvements).toEqual([IMPROVEMENT_TEXT.timeliness]);
        expect(r.suggested_suggestions).toEqual([SUGGESTION_TEXT.timeliness]);
    });

    it('covers every Module 9 metric in the suggestion library', () => {
        const TaskEvaluationCriterion = require('../src/models/TaskEvaluationCriterion');
        [STRENGTH_TEXT, IMPROVEMENT_TEXT, SUGGESTION_TEXT].forEach((lib) => {
            expect(Object.keys(lib).sort()).toEqual([...TaskEvaluationCriterion.METRICS].sort());
        });
    });

    it('treats the band edges like the Python engine (80 strength, 60 not an improvement)', () => {
        const r = fallbackFeedbackAssist(internship({
            criteria: [crit('quality', 80), crit('timeliness', 60), crit('effort', 59.99)]
        }));
        expect(r.suggested_strengths).toEqual([STRENGTH_TEXT.quality]);
        expect(r.suggested_improvements).toEqual([IMPROVEMENT_TEXT.effort]);
    });

    it('caps at three, worst first', () => {
        const r = fallbackFeedbackAssist(internship({
            criteria: [crit('quality', 50), crit('timeliness', 10), crit('completion', 30), crit('effort', 20)]
        }));
        expect(r.suggested_improvements).toEqual([
            IMPROVEMENT_TEXT.timeliness,
            IMPROVEMENT_TEXT.effort,
            IMPROVEMENT_TEXT.completion
        ]);
    });

    it('uses indicators only where no criterion spoke, never contradicting one', () => {
        const strong = fallbackFeedbackAssist(internship({
            indicators: { on_time_submission_rate: 0.95, rework_rate: 0.05 }
        }));
        expect(strong.suggested_strengths).toEqual([STRENGTH_TEXT.timeliness, STRENGTH_TEXT.reliability]);

        const mixed = fallbackFeedbackAssist(internship({
            criteria: [crit('timeliness', 45)],
            indicators: { on_time_submission_rate: 0.95 }
        }));
        expect(mixed.suggested_strengths).not.toContain(STRENGTH_TEXT.timeliness);

        const weak = fallbackFeedbackAssist(internship({
            indicators: { on_time_submission_rate: 0.5, rework_rate: 0.5 }
        }));
        expect(weak.suggested_improvements).toEqual([IMPROVEMENT_TEXT.timeliness, IMPROVEMENT_TEXT.reliability]);
    });

    it('offers a generic next step when nothing needs work', () => {
        const r = fallbackFeedbackAssist(internship({ criteria: [crit('quality', 90)] }));
        expect(r.suggested_suggestions).toEqual([GENERIC_GROWTH_SUGGESTION]);
    });

    it.each([
        [[100], 5], [[90], 5], [[89], 4], [[70], 4], [[69], 3], [[10], 1], [[0], 1], [[80, 60], 4]
    ])('suggests rating from scores %p → %p', (scores, expected) => {
        expect(suggestRating(scores.map((s) => crit('quality', s)))).toBe(expected);
    });

    it('weights the rating and rounds half up like the Python engine', () => {
        expect(suggestRating([crit('quality', 80, 'a', 3), crit('effort', 20)])).toBe(3);
        expect(suggestRating([crit('quality', 80), crit('effort', 60)])).toBe(4);
        expect(suggestRating([])).toBeNull();
    });

    it('returns clearly-labelled templates for interviews, with no rating', () => {
        const r = fallbackFeedbackAssist(internship({ context: 'interview', criteria: [crit('quality', 95)] }));
        expect(r.suggested_overall_rating).toBeNull();
        r.suggested_strengths.concat(r.suggested_improvements).forEach((s) => {
            expect(s.startsWith(TEMPLATE_PREFIX)).toBe(true);
        });
        expect(r.suggested_suggestions).toEqual(INTERVIEW_SUGGESTIONS);
    });

    it('is deterministic', () => {
        const dto = internship({
            criteria: [crit('quality', 88), crit('communication', 35)],
            indicators: { on_time_submission_rate: 0.92, rework_rate: 0.2 },
            draft: GOOD_DRAFT
        });
        expect(fallbackFeedbackAssist(dto)).toEqual(fallbackFeedbackAssist(dto));
    });

    it('matches the Python endpoint fixture exactly', () => {
        // Same input as test_endpoint_round_trip in ai-service/tests/test_feedback_assistant.py.
        const r = fallbackFeedbackAssist(internship({
            criteria: [crit('quality', 91, 'Quality of work', 3), crit('communication', 42, 'Communication')],
            indicators: { on_time_submission_rate: 1, rework_rate: 0, checkin_count: 2 },
            draft: { strengths: '', improvements: '', suggestions: [] }
        }));
        expect(r.suggested_overall_rating).toBe(4);
        expect(r.suggested_strengths[0]).toBe(STRENGTH_TEXT.quality);
        expect(r.suggested_suggestions).toEqual([SUGGESTION_TEXT.communication]);
        expect(Object.keys(r).sort()).toEqual([
            'review', 'suggested_improvements', 'suggested_overall_rating', 'suggested_strengths', 'suggested_suggestions'
        ]);
    });
});

// ---------------------------------------------------------------------------
// Review rules
// ---------------------------------------------------------------------------

describe('reviewDraft', () => {
    it('scores a good draft 100 with no issues', () => {
        expect(reviewDraft(GOOD_DRAFT)).toEqual({ quality_score: 100, issues: [] });
    });

    it('flags personal insults as critical, quoting them', () => {
        const r = reviewDraft({ ...GOOD_DRAFT, improvements: 'Honestly the code was stupid and you seem clueless.' });
        const issue = r.issues.find((i) => i.code === 'harsh_language');
        expect(issue.severity).toBe('critical');
        expect(issue.message).toContain('"stupid"');
        expect(issue.message).toContain('"clueless"');
    });

    it('matches whole words only and leaves technical terms alone', () => {
        const r = reviewDraft({
            ...GOOD_DRAFT,
            strengths: 'Handled lazy loading and garbage collection tuning well; avoided stupidity checks.'
        });
        expect(codes(r)).not.toContain('harsh_language');
        expect(findHarshWords('SHUT UP about it')).toEqual(['shut up']);
    });

    it('warns when too short or without suggestions', () => {
        const r = reviewDraft({ strengths: 'Good.', improvements: 'Test more.' });
        const bySeverity = Object.fromEntries(r.issues.map((i) => [i.code, i.severity]));
        expect(bySeverity.too_short).toBe('warning');
        expect(bySeverity.no_suggestions).toBe('warning');
    });

    it('flags unbalanced feedback', () => {
        expect(codes(reviewDraft({ ...GOOD_DRAFT, strengths: '' }))).toContain('unbalanced');
        expect(codes(reviewDraft({ ...GOOD_DRAFT, improvements: '', overall_rating: 4 }))).toContain('unbalanced');
        expect(codes(reviewDraft({ ...GOOD_DRAFT, improvements: '', overall_rating: 5 }))).not.toContain('unbalanced');
    });

    it('flags improvements without an action verb', () => {
        const r = reviewDraft({ ...GOOD_DRAFT, improvements: 'The final milestone was rushed and messy.' });
        expect(r.issues.find((i) => i.code === 'not_actionable').severity).toBe('info');
    });

    it('detects shouting per field, needing 20+ letters mostly capitals', () => {
        expect(isShouting('THIS WAS VERY POOR WORK OVERALL')).toBe(true);
        expect(isShouting('OK FINE')).toBe(false);
        expect(isShouting('Used the REST API and SQL well throughout the project')).toBe(false);
        expect(codes(reviewDraft({ ...GOOD_DRAFT, strengths: 'GREAT WORK ON THE DATA LAYER AND TESTS' })))
            .toContain('shouting');
    });

    it('flags a rating that contradicts the text, both ways', () => {
        expect(codes(reviewDraft({ ...GOOD_DRAFT, improvements: '', overall_rating: 2 }))).toContain('rating_mismatch');
        expect(codes(reviewDraft({ ...GOOD_DRAFT, strengths: '', overall_rating: 5 }))).toContain('rating_mismatch');
    });

    it('falls back to the snapshot rating when the draft has none', () => {
        const draft = { ...GOOD_DRAFT, improvements: '', overall_rating: null };
        expect(codes(reviewDraft(draft, 1))).toContain('rating_mismatch');
        expect(codes(reviewDraft(draft, null))).not.toContain('rating_mismatch');
    });

    it('subtracts severity penalties and floors at zero', () => {
        expect(reviewDraft({}).quality_score).toBe(65);
        const r = reviewDraft({ strengths: 'STUPID IDIOT', improvements: 'USELESS LOSER MORON', overall_rating: 5 });
        const expected = Math.max(0, 100 - r.issues.reduce((s, i) => s + SEVERITY_PENALTY[i.severity], 0));
        expect(r.quality_score).toBe(expected);
        expect(r.quality_score).toBeGreaterThanOrEqual(0);
    });

    it('reports issues in the same stable order as the Python engine', () => {
        const r = reviewDraft({ strengths: '', improvements: 'bad, stupid', overall_rating: 5 });
        expect(codes(r)).toEqual([
            'harsh_language', 'too_short', 'no_suggestions', 'rating_mismatch', 'unbalanced', 'not_actionable'
        ]);
    });
});

describe('isUsableAssist', () => {
    it('accepts the full shape and rejects partial answers', () => {
        expect(isUsableAssist(fallbackFeedbackAssist(internship()))).toBe(true);
        expect(isUsableAssist(null)).toBe(false);
        expect(isUsableAssist({ suggested_strengths: [] })).toBe(false);
        expect(isUsableAssist({
            suggested_strengths: [], suggested_improvements: [], suggested_suggestions: [],
            review: { quality_score: 'x', issues: [] }
        })).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Tone guard
// ---------------------------------------------------------------------------

describe('toneGuard', () => {
    it('returns the critical issue for abusive text in any field', () => {
        expect(toneGuard({ strengths: 'You are an idiot.' }).code).toBe('harsh_language');
        expect(toneGuard({ suggestions: ['Stop being so pathetic.'] }).code).toBe('harsh_language');
        expect(toneGuard({ response: 'Shut up, this is unfair.' }).code).toBe('harsh_language');
    });

    it('never blocks on warnings: short, unbalanced or shouted text still passes', () => {
        expect(toneGuard({ strengths: 'OK' })).toBeNull();
        expect(toneGuard({ improvements: 'PLEASE TEST YOUR CODE BEFORE SUBMITTING IT' })).toBeNull();
        expect(toneGuard({})).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Summary aggregation
// ---------------------------------------------------------------------------

describe('summarizeFeedback', () => {
    const rows = [
        buildFeedback({
            id: 1, overallRating: 5, ratings: { technical: 5, teamwork: 4 }, wouldRecommend: true,
            createdAt: new Date('2026-01-01'), strengths: 'x'.repeat(250)
        }),
        buildFeedback({
            id: 2, overallRating: 3, ratings: { technical: 3 }, wouldRecommend: false,
            createdAt: new Date('2026-02-01'), context: 'interview', authorName: 'Beta'
        }),
        buildFeedback({ id: 3, overallRating: 4, wouldRecommend: null, createdAt: new Date('2026-03-01') }),
        buildFeedback({ id: 4, overallRating: 2, wouldRecommend: true, createdAt: new Date('2026-03-01') })
    ];

    it('aggregates counts, averages and the recommend rate', () => {
        const s = summarizeFeedback(rows);
        expect(s.count).toBe(4);
        expect(s.averageOverall).toBe(3.5);
        expect(s.averageByDimension).toEqual({
            technical: 4, communication: null, professionalism: null, problemSolving: null, teamwork: 4
        });
        // 2 of the 3 authors who answered would recommend.
        expect(s.recommendRate).toBe(0.667);
        expect(s.byContext).toEqual({ internship: 3, interview: 1 });
    });

    it('lists the three newest (ties broken by id) with a 200-character excerpt', () => {
        const s = summarizeFeedback(rows);
        expect(s.recent.map((r) => r.id)).toEqual(['4', '3', '2']);
        expect(s.recent[2].authorName).toBe('Beta');
        const oldest = summarizeFeedback(rows, { recentLimit: 4 }).recent[3];
        expect(oldest.strengthsExcerpt).toHaveLength(200);
    });

    it('returns nulls, not zeros, when there is nothing to average', () => {
        const s = summarizeFeedback([]);
        expect(s).toMatchObject({ count: 0, averageOverall: null, recommendRate: null, recent: [] });
        expect(s.averageByDimension.technical).toBeNull();
    });
});
