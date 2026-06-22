const axios = require('axios');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const AI_TIMEOUT_MS = parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '8000', 10);

class AIServiceUnavailableError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'AIServiceUnavailableError';
        this.cause = cause;
    }
}

const http = axios.create({
    baseURL: AI_SERVICE_URL,
    timeout: AI_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' }
});

const wrap = (label, err) => {
    const detail = err && err.response
        ? `HTTP ${err.response.status} ${JSON.stringify(err.response.data).slice(0, 200)}`
        : (err && err.code) || (err && err.message) || 'unknown error';
    console.warn(`[aiService] ${label} failed: ${detail}`);
    return new AIServiceUnavailableError(`AI service ${label} failed: ${detail}`, err);
};

// ---------------------------------------------------------------------------
// Lightweight observability — ring buffer of recent calls
// ---------------------------------------------------------------------------

const RING_CAPACITY = 256;
const ring = { items: new Array(RING_CAPACITY), idx: 0, size: 0 };

const recordSample = (sample) => {
    ring.items[ring.idx] = sample;
    ring.idx = (ring.idx + 1) % RING_CAPACITY;
    if (ring.size < RING_CAPACITY) ring.size += 1;
};

const recentSamples = (sinceTs = 0) => {
    const out = [];
    for (let i = 0; i < ring.size; i++) {
        const s = ring.items[i];
        if (s && s.ts >= sinceTs) out.push(s);
    }
    return out;
};

const percentile = (sortedAsc, p) => {
    if (sortedAsc.length === 0) return 0;
    const rank = (p / 100) * (sortedAsc.length - 1);
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    if (lo === hi) return sortedAsc[lo];
    const frac = rank - lo;
    return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
};

const getAIHealth = () => {
    const now = Date.now();
    const oneMinAgo = now - 60_000;
    const lastMin = recentSamples(oneMinAgo);
    const all = recentSamples(0);

    const lastSuccess = all
        .filter((s) => s.ok)
        .sort((a, b) => b.ts - a.ts)[0];

    const latencies = lastMin
        .filter((s) => typeof s.durationMs === 'number')
        .map((s) => s.durationMs)
        .sort((a, b) => a - b);

    const errors = lastMin.filter((s) => !s.ok).length;

    return {
        reachable: !!lastSuccess && (now - lastSuccess.ts) < 5 * 60_000,
        p95LatencyMs: Math.round(percentile(latencies, 95)),
        errorRatePerMin: errors,
        sampleSize: lastMin.length,
        totalSamples: ring.size,
        lastSuccessAt: lastSuccess ? new Date(lastSuccess.ts).toISOString() : null
    };
};

// Wraps an async call to the AI service, logging duration and pushing a
// sample into the ring buffer regardless of success / failure.
const instrument = async (label, fn) => {
    const startedAt = Date.now();
    let ok = false;
    let status = null;
    try {
        const result = await fn();
        ok = true;
        return result;
    } catch (err) {
        status = err && err.response ? err.response.status : (err && err.code) || null;
        throw err;
    } finally {
        const durationMs = Date.now() - startedAt;
        recordSample({ ts: Date.now(), label, durationMs, ok, status });
        console.log(`[aiService] ${label} ${ok ? 'ok' : 'fail'} ${durationMs}ms`);
    }
};

// ---------------------------------------------------------------------------
// Level / education normalization
// ---------------------------------------------------------------------------

const normalizeSkillLevel = (level) => {
    const v = String(level || '').toLowerCase();
    if (v === 'expert' || v === 'advanced') return 'advanced';
    if (v === 'beginner' || v === 'novice') return 'beginner';
    return 'intermediate';
};

const EDU_LEVELS = { other: 0, high_school: 1, bachelors: 2, masters: 3, phd: 4 };

const classifyDegree = (degree) => {
    const d = String(degree || '').toLowerCase();
    if (!d) return 'other';
    if (/\b(phd|ph\.d|doctorate|doctoral)\b/.test(d)) return 'phd';
    if (/\b(master|masters|m\.?sc|m\.?s|m\.?a|mba|m\.?phil)\b/.test(d)) return 'masters';
    if (/\b(bachelor|bachelors|b\.?sc|b\.?s|b\.?a|b\.?e|b\.?tech|undergrad)\b/.test(d)) return 'bachelors';
    if (/\b(high school|secondary|diploma|hssc|matric|a-level|o-level)\b/.test(d)) return 'high_school';
    return 'other';
};

const highestEducationLevel = (education = []) => {
    let best = 'other';
    for (const e of education) {
        const lvl = classifyDegree(e && (e.degree || e.fieldOfStudy));
        if (EDU_LEVELS[lvl] > EDU_LEVELS[best]) best = lvl;
    }
    return best;
};

// ---------------------------------------------------------------------------
// Experience years
// ---------------------------------------------------------------------------

const parseFlexibleDate = (str) => {
    if (!str) return null;
    if (str instanceof Date) return str;
    const direct = new Date(str);
    if (!Number.isNaN(direct.getTime())) return direct;
    const yearMatch = String(str).match(/(\d{4})/);
    if (yearMatch) {
        const monthMatch = String(str).match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
        const monthIdx = monthMatch
            ? ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
                .indexOf(monthMatch[1].toLowerCase())
            : 0;
        return new Date(parseInt(yearMatch[1], 10), Math.max(0, monthIdx), 1);
    }
    return null;
};

const computeExperienceYears = (experience = []) => {
    if (!Array.isArray(experience) || experience.length === 0) return 0;
    const now = Date.now();
    let totalMs = 0;
    for (const e of experience) {
        const start = parseFlexibleDate(e.startDate);
        const end = e.isCurrentlyWorking
            ? new Date(now)
            : parseFlexibleDate(e.endDate) || new Date(now);
        if (!start) continue;
        const span = end.getTime() - start.getTime();
        if (span > 0) totalMs += span;
    }
    const years = totalMs / (1000 * 60 * 60 * 24 * 365.25);
    return Math.max(0, Math.min(50, Math.round(years * 10) / 10));
};

// ---------------------------------------------------------------------------
// DTO mappers
// ---------------------------------------------------------------------------

const plainify = (v) => {
    if (v == null) return v;
    if (typeof v.toJSON === 'function') return v.toJSON();
    if (typeof v.get === 'function') return v.get({ plain: true });
    return v;
};

const mapStudentToDto = (student) => {
    if (!student) throw new Error('mapStudentToDto: student is required');
    const s = plainify(student);

    const skills = Array.isArray(s.skills)
        ? s.skills.map(plainify).map((sk) => ({
            name: sk.name,
            level: normalizeSkillLevel(sk.level)
        })).filter((sk) => sk.name)
        : [];

    const experience = Array.isArray(s.experience) ? s.experience.map(plainify) : [];
    const education = Array.isArray(s.education) ? s.education.map(plainify) : [];

    const interests = skills.map((sk) => sk.name);

    return {
        id: String(s.id),
        skills,
        experience_years: computeExperienceYears(experience),
        education_level: highestEducationLevel(education),
        bio: s.bio || null,
        interests
    };
};

const mapTaskToDto = (task) => {
    if (!task) throw new Error('mapTaskToDto: task is required');
    const t = plainify(task);

    const skillsRequired = Array.isArray(t.skillsRequired) ? t.skillsRequired.map(plainify) : [];
    const required_skills = skillsRequired
        .filter((sk) => sk && sk.name)
        .map((sk) => ({
            name: sk.name,
            level: normalizeSkillLevel(sk.level)
        }));

    let tags = t.tags;
    if (typeof tags === 'string') {
        try { tags = JSON.parse(tags); } catch (e) { tags = []; }
    }
    if (!Array.isArray(tags)) tags = [];

    return {
        id: String(t.id),
        title: t.title || '',
        description: t.description || '',
        category: t.category || 'Other',
        experience_level: t.experienceLevel || 'intermediate',
        required_skills,
        tags
    };
};

// ---------------------------------------------------------------------------
// HTTP calls
// ---------------------------------------------------------------------------

const matchTasksForStudent = async (studentDto, taskDtos) => {
    if (!Array.isArray(taskDtos) || taskDtos.length === 0) return [];
    try {
        const data = await instrument('POST /match', async () => {
            const res = await http.post('/match', { student: studentDto, tasks: taskDtos });
            return res.data;
        });
        return Array.isArray(data && data.results) ? data.results : [];
    } catch (err) {
        throw wrap('POST /match', err);
    }
};

const rankCandidates = async (taskDto, studentDtos) => {
    if (!Array.isArray(studentDtos) || studentDtos.length === 0) return [];
    try {
        const data = await instrument('POST /rank-candidates', async () => {
            const res = await http.post('/rank-candidates', {
                task: taskDto,
                candidates: studentDtos
            });
            return res.data;
        });
        return Array.isArray(data && data.ranking) ? data.ranking : [];
    } catch (err) {
        throw wrap('POST /rank-candidates', err);
    }
};

module.exports = {
    AIServiceUnavailableError,
    matchTasksForStudent,
    rankCandidates,
    mapStudentToDto,
    mapTaskToDto,
    getAIHealth,
    // Exposed for tests / diagnostics
    _internal: {
        normalizeSkillLevel,
        classifyDegree,
        highestEducationLevel,
        computeExperienceYears,
        recordSample,
        ring
    }
};
