/**
 * seedDemo.js — wipe the dev database and seed a small, deterministic demo set
 * for exercising the Module 6 AI matching feature end-to-end.
 *
 *   - 3 companies (complete profiles + 1 team member each)
 *   - 3 students with distinct skill domains (frontend / data-science / design)
 *   - 9 tasks (3 per company), skills aligned so each student has clear strong
 *     and weak matches
 *   - cross-domain applications on one "flagship" task per company, so the
 *     company-side "Best match" ranking is also testable
 *
 * Run from the backend directory:
 *     node src/scripts/seedDemo.js
 *
 * ⚠ DESTRUCTIVE — truncates every table. Development use only.
 */
require('dotenv').config();

const {
    sequelize,
    User,
    Student,
    StudentSkill,
    StudentExperience,
    StudentEducation,
    StudentProject,
    Company,
    CompanyTeamMember,
    Task,
    TaskSkill,
    Application,
    ApplicationStatusHistory,
    recalcStudentCompletion,
    recalcCompanyCompletion
} = require('../models');
const aiService = require('../services/aiService');

const PASSWORD = 'Demo@1234';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const COMPANIES = [
    {
        email: 'hr@technova.com',
        companyName: 'TechNova Solutions',
        industry: 'Software Development',
        companySize: '51-200',
        foundedYear: 2016,
        website: 'https://technova.example.com',
        description:
            'TechNova builds modern web platforms and developer tools for fast-growing startups. We ship React/Node products and mentor junior engineers along the way.',
        location: { city: 'San Francisco', state: 'CA', country: 'USA', zip: '94105' },
        contact: { phone: '+1-415-555-0101', email: 'hr@technova.com' },
        contactPerson: { name: 'Dana Whitfield', designation: 'Head of Talent', email: 'dana@technova.com', phone: '+1-415-555-0110' },
        cultureValues: ['Ownership', 'Craftsmanship', 'Continuous learning'],
        cultureBenefits: ['Remote-first', 'Mentorship', 'Learning budget'],
        workEnvironment: 'Remote-first with quarterly on-site weeks.',
        team: { name: 'Dana Whitfield', designation: 'Head of Talent', bio: 'Leads hiring and early-career programs at TechNova.' }
    },
    {
        email: 'hr@datawiz.com',
        companyName: 'DataWiz Analytics',
        industry: 'Data & Analytics',
        companySize: '11-50',
        foundedYear: 2019,
        website: 'https://datawiz.example.com',
        description:
            'DataWiz helps businesses turn raw data into decisions. We build predictive models, analytics dashboards, and NLP tooling for mid-market clients.',
        location: { city: 'New York', state: 'NY', country: 'USA', zip: '10001' },
        contact: { phone: '+1-212-555-0102', email: 'hr@datawiz.com' },
        contactPerson: { name: 'Marcus Reed', designation: 'Lead Data Scientist', email: 'marcus@datawiz.com', phone: '+1-212-555-0120' },
        cultureValues: ['Curiosity', 'Rigor', 'Impact'],
        cultureBenefits: ['Conference budget', 'Flexible hours', 'Compute credits'],
        workEnvironment: 'Hybrid, two days in-office.',
        team: { name: 'Marcus Reed', designation: 'Lead Data Scientist', bio: 'Mentors interns on ML projects at DataWiz.' }
    },
    {
        email: 'hr@pixelcraft.com',
        companyName: 'PixelCraft Studio',
        industry: 'Design & Creative',
        companySize: '11-50',
        foundedYear: 2014,
        website: 'https://pixelcraft.example.com',
        description:
            'PixelCraft is a product design studio crafting delightful mobile and web experiences, design systems, and brand identities for clients worldwide.',
        location: { city: 'London', state: '', country: 'UK', zip: 'EC1A 1BB' },
        contact: { phone: '+44-20-5555-0103', email: 'hr@pixelcraft.com' },
        contactPerson: { name: 'Priya Anand', designation: 'Design Director', email: 'priya@pixelcraft.com', phone: '+44-20-5555-0130' },
        cultureValues: ['Empathy', 'Detail', 'Collaboration'],
        cultureBenefits: ['Creative freedom', 'Latest tools', 'Portfolio support'],
        workEnvironment: 'Studio-based with flexible remote days.',
        team: { name: 'Priya Anand', designation: 'Design Director', bio: 'Leads the design mentorship program at PixelCraft.' }
    }
];

const STUDENTS = [
    {
        email: 'alice@student.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        headline: 'Frontend Developer | React & TypeScript',
        bio: 'Frontend engineer who loves building React and TypeScript dashboards with clean, accessible UI. Comfortable across the modern JS stack.',
        location: { city: 'San Francisco', state: 'CA', country: 'USA' },
        phone: '+1-415-555-0201',
        social: { github: 'https://github.com/alicejohnson', linkedin: 'https://linkedin.com/in/alicejohnson', portfolio: 'https://alice.dev' },
        skills: [
            ['React', 'Advanced'], ['TypeScript', 'Advanced'], ['JavaScript', 'Advanced'],
            ['HTML', 'Advanced'], ['CSS', 'Advanced'], ['Tailwind CSS', 'Intermediate'], ['Node.js', 'Intermediate']
        ],
        education: { institution: 'UC Berkeley', degree: 'BSc Computer Science', field: 'Computer Science', startYear: 2019, endYear: 2023, grade: '3.8 GPA' },
        experience: [
            { title: 'Frontend Developer Intern', company: 'Brightline Apps', type: 'Internship', start: '2022-06-01', end: '2023-06-01', desc: 'Built React components and dashboards.', skills: ['React', 'JavaScript'] },
            { title: 'Junior Frontend Developer', company: 'Webloom', type: 'Full-time', start: '2023-09-01', end: '2024-09-01', desc: 'Shipped TypeScript features for a SaaS app.', skills: ['React', 'TypeScript', 'Tailwind CSS'] }
        ],
        project: { title: 'Analytics Dashboard', desc: 'A React + TypeScript analytics dashboard with charts and real-time updates.', tech: ['React', 'TypeScript', 'Tailwind CSS'], url: 'https://alice.dev/dashboard', github: 'https://github.com/alicejohnson/dashboard' }
    },
    {
        email: 'bob@student.com',
        firstName: 'Bob',
        lastName: 'Smith',
        headline: 'Data Science & Machine Learning Enthusiast',
        bio: 'Aspiring data scientist focused on Python, pandas, and machine learning models for real-world prediction and analytics problems.',
        location: { city: 'New York', state: 'NY', country: 'USA' },
        phone: '+1-212-555-0202',
        social: { github: 'https://github.com/bobsmith', linkedin: 'https://linkedin.com/in/bobsmith', portfolio: '' },
        skills: [
            ['Python', 'Advanced'], ['Pandas', 'Advanced'], ['NumPy', 'Advanced'],
            ['Scikit-learn', 'Intermediate'], ['SQL', 'Intermediate'], ['TensorFlow', 'Beginner'], ['Statistics', 'Intermediate']
        ],
        education: { institution: 'NYU', degree: 'BSc Data Science', field: 'Data Science', startYear: 2020, endYear: 2024, grade: '3.7 GPA' },
        experience: [
            { title: 'Data Analyst Intern', company: 'InsightWorks', type: 'Internship', start: '2023-01-01', end: '2024-07-01', desc: 'Built data pipelines and analysis notebooks in Python.', skills: ['Python', 'Pandas', 'SQL'] }
        ],
        project: { title: 'Churn Predictor', desc: 'A scikit-learn model predicting customer churn with a pandas feature pipeline.', tech: ['Python', 'Scikit-learn', 'Pandas'], url: '', github: 'https://github.com/bobsmith/churn' }
    },
    {
        email: 'carol@student.com',
        firstName: 'Carol',
        lastName: 'Lee',
        headline: 'UI/UX Designer | Figma & Prototyping',
        bio: 'Product designer crafting intuitive mobile and web interfaces with Figma, strong prototyping skills, and a UX-research-first mindset.',
        location: { city: 'London', state: '', country: 'UK' },
        phone: '+44-20-5555-0203',
        social: { github: '', linkedin: 'https://linkedin.com/in/carollee', portfolio: 'https://carol.design' },
        skills: [
            ['Figma', 'Advanced'], ['Adobe XD', 'Advanced'], ['Prototyping', 'Advanced'],
            ['Wireframing', 'Advanced'], ['User Research', 'Intermediate'], ['Sketch', 'Intermediate'],
            ['Design Systems', 'Advanced'], ['Component Libraries', 'Intermediate'],
            ['Adobe Illustrator', 'Intermediate'], ['Branding', 'Intermediate']
        ],
        education: { institution: 'University of the Arts London', degree: 'BA Interaction Design', field: 'Design', startYear: 2020, endYear: 2024, grade: 'First Class' },
        experience: [
            { title: 'UI/UX Design Intern', company: 'Studio Mint', type: 'Internship', start: '2023-06-01', end: '2024-06-01', desc: 'Designed mobile app screens and prototypes in Figma.', skills: ['Figma', 'Prototyping'] }
        ],
        project: { title: 'Fitness App Redesign', desc: 'End-to-end redesign of a fitness app, from user research to high-fidelity Figma prototypes.', tech: ['Figma', 'Prototyping', 'User Research'], url: 'https://carol.design/fitness', github: '' }
    }
];

// Tasks grouped by company index (0=TechNova, 1=DataWiz, 2=PixelCraft).
// The first task in each group is the "flagship" that receives applications.
const TASKS_BY_COMPANY = [
    [
        {
            flagship: true,
            title: 'React Dashboard Development',
            description: 'Build a responsive analytics dashboard in React and TypeScript with reusable components, charts, and real-time updates. Tailwind for styling.',
            category: 'Web Development', subcategory: 'Frontend', type: 'project', experienceLevel: 'intermediate', workType: 'remote',
            budget: { type: 'fixed', min: 1500, max: 2500 }, duration: { value: 2, unit: 'months' },
            tags: ['react', 'frontend', 'typescript', 'dashboard'],
            skills: [['React', 'advanced', true], ['TypeScript', 'advanced', true], ['JavaScript', 'advanced', true], ['Tailwind CSS', 'intermediate', false]]
        },
        {
            title: 'Node.js REST API',
            description: 'Develop a scalable REST API with Express, MySQL, and JWT authentication. Include validation, error handling, and API documentation.',
            category: 'Web Development', subcategory: 'Backend', type: 'project', experienceLevel: 'intermediate', workType: 'remote',
            budget: { type: 'hourly', min: 30, max: 50 }, duration: { value: 6, unit: 'weeks' },
            tags: ['node', 'backend', 'api', 'express'],
            skills: [['Node.js', 'advanced', true], ['Express', 'intermediate', true], ['MySQL', 'intermediate', true], ['JWT', 'intermediate', false]]
        },
        {
            title: 'Marketing Landing Page',
            description: 'Design and build a fast, conversion-focused marketing landing page. Semantic HTML, responsive CSS, and a little JavaScript interactivity.',
            category: 'Web Development', subcategory: 'Frontend', type: 'freelance', experienceLevel: 'entry', workType: 'remote',
            budget: { type: 'fixed', min: 500, max: 800 }, duration: { value: 2, unit: 'weeks' },
            tags: ['frontend', 'html', 'css', 'landing'],
            skills: [['HTML', 'advanced', true], ['CSS', 'advanced', true], ['JavaScript', 'intermediate', true], ['Tailwind CSS', 'intermediate', false]]
        }
    ],
    [
        {
            flagship: true,
            title: 'Customer Churn Prediction Model',
            description: 'Build a machine-learning model to predict customer churn. Engineer features with pandas, train with scikit-learn, and evaluate against business metrics.',
            category: 'Machine Learning', subcategory: 'Machine Learning', type: 'project', experienceLevel: 'intermediate', workType: 'remote',
            budget: { type: 'fixed', min: 2000, max: 3000 }, duration: { value: 2, unit: 'months' },
            tags: ['python', 'machine-learning', 'data', 'sklearn'],
            skills: [['Python', 'advanced', true], ['Scikit-learn', 'advanced', true], ['Pandas', 'intermediate', true], ['Statistics', 'intermediate', false]]
        },
        {
            title: 'Sales Data Analysis Dashboard',
            description: 'Analyze sales datasets and build a reporting dashboard. Use Python and pandas for processing, SQL for querying, and Matplotlib for visualization.',
            category: 'Data Science', subcategory: 'Data Analysis', type: 'project', experienceLevel: 'intermediate', workType: 'remote',
            budget: { type: 'hourly', min: 25, max: 40 }, duration: { value: 1, unit: 'months' },
            tags: ['python', 'data', 'analytics', 'sql'],
            skills: [['Python', 'intermediate', true], ['Pandas', 'advanced', true], ['SQL', 'intermediate', true], ['Matplotlib', 'intermediate', false]]
        },
        {
            title: 'NLP Support Chatbot',
            description: 'Create an NLP-powered support chatbot with intent recognition and context handling using Python, transformers, and spaCy.',
            category: 'Machine Learning', subcategory: 'NLP', type: 'project', experienceLevel: 'expert', workType: 'remote',
            budget: { type: 'fixed', min: 3000, max: 5000 }, duration: { value: 3, unit: 'months' },
            tags: ['python', 'nlp', 'machine-learning', 'transformers'],
            skills: [['Python', 'advanced', true], ['NLP', 'advanced', true], ['Transformers', 'intermediate', true], ['spaCy', 'intermediate', false]]
        }
    ],
    [
        {
            flagship: true,
            title: 'Mobile App UI Design',
            description: 'Design a polished mobile app UI in Figma — user flows, wireframes, high-fidelity screens, and an interactive prototype.',
            category: 'UI/UX Design', subcategory: 'UI Design', type: 'project', experienceLevel: 'intermediate', workType: 'remote',
            budget: { type: 'fixed', min: 1200, max: 2000 }, duration: { value: 6, unit: 'weeks' },
            tags: ['figma', 'ui', 'mobile', 'prototyping'],
            skills: [['Figma', 'advanced', true], ['Prototyping', 'advanced', true], ['Wireframing', 'intermediate', true], ['Adobe XD', 'intermediate', false]]
        },
        {
            title: 'Design System Creation',
            description: 'Build a comprehensive design system in Figma — components, tokens, patterns, and documentation for cross-product consistency.',
            category: 'UI/UX Design', subcategory: 'Design Systems', type: 'project', experienceLevel: 'expert', workType: 'remote',
            budget: { type: 'fixed', min: 2500, max: 3500 }, duration: { value: 2, unit: 'months' },
            tags: ['figma', 'design-systems', 'ui'],
            skills: [['Figma', 'advanced', true], ['Design Systems', 'advanced', true], ['Component Libraries', 'intermediate', true]]
        },
        {
            title: 'Brand Identity Package',
            description: 'Create a complete brand identity — logo, color palette, typography, and brand guidelines — using Adobe Illustrator.',
            category: 'Graphic Design', subcategory: 'Branding', type: 'freelance', experienceLevel: 'intermediate', workType: 'remote',
            budget: { type: 'fixed', min: 1000, max: 1800 }, duration: { value: 1, unit: 'months' },
            tags: ['branding', 'illustrator', 'logo', 'design'],
            skills: [['Adobe Illustrator', 'advanced', true], ['Branding', 'advanced', true], ['Logo Design', 'intermediate', true]]
        }
    ]
];

const COMMON_REQUIREMENTS = ['Strong communication skills', 'Ability to work independently', 'Attention to detail'];
const COMMON_DELIVERABLES = ['Source files with documentation', 'Progress updates', 'Final handover'];
const COMMON_BENEFITS = ['Mentorship from industry experts', 'Certificate of completion', 'Portfolio building opportunity', 'Potential for full-time employment'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const daysFromNow = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};

async function wipeDatabase() {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const model of Object.values(sequelize.models)) {
        await model.destroy({ where: {}, truncate: true, force: true });
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function createCompany(data) {
    const user = await User.create({
        email: data.email,
        password: PASSWORD,
        role: 'company',
        isEmailVerified: true,
        isActive: true
    });

    const company = await Company.create({
        userId: user.id,
        companyName: data.companyName,
        industry: data.industry,
        companySize: data.companySize,
        foundedYear: data.foundedYear,
        website: data.website,
        description: data.description,
        locationAddress: `${data.location.city} HQ`,
        locationCity: data.location.city,
        locationState: data.location.state,
        locationCountry: data.location.country,
        locationZipCode: data.location.zip,
        contactPhone: data.contact.phone,
        contactEmail: data.contact.email,
        contactPersonName: data.contactPerson.name,
        contactPersonDesignation: data.contactPerson.designation,
        contactPersonEmail: data.contactPerson.email,
        contactPersonPhone: data.contactPerson.phone,
        cultureValues: data.cultureValues,
        cultureBenefits: data.cultureBenefits,
        cultureWorkEnvironment: data.workEnvironment,
        verificationIsVerified: true,
        verificationVerifiedAt: new Date(),
        isProfilePublic: true
    });

    await CompanyTeamMember.create({
        companyId: company.id,
        name: data.team.name,
        designation: data.team.designation,
        bio: data.team.bio
    });

    await recalcCompanyCompletion(company);
    return company;
}

async function createStudent(data) {
    const user = await User.create({
        email: data.email,
        password: PASSWORD,
        role: 'student',
        isEmailVerified: true,
        isActive: true
    });

    const student = await Student.create({
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        bio: data.bio,
        phone: data.phone,
        locationCity: data.location.city,
        locationState: data.location.state,
        locationCountry: data.location.country,
        socialGithub: data.social.github || null,
        socialLinkedin: data.social.linkedin || null,
        socialPortfolio: data.social.portfolio || null,
        resumeUrl: `/uploads/resumes/${data.firstName.toLowerCase()}-resume.pdf`,
        resumeUploadedAt: new Date(),
        isProfilePublic: true
    });

    await StudentSkill.bulkCreate(
        data.skills.map(([name, level]) => ({ studentId: student.id, name, level }))
    );

    await StudentExperience.bulkCreate(
        data.experience.map((e) => ({
            studentId: student.id,
            title: e.title,
            company: e.company,
            employmentType: e.type,
            startDate: e.start,
            endDate: e.end,
            isCurrentlyWorking: false,
            description: e.desc,
            skills: e.skills
        }))
    );

    await StudentEducation.create({
        studentId: student.id,
        institution: data.education.institution,
        degree: data.education.degree,
        fieldOfStudy: data.education.field,
        startYear: data.education.startYear,
        endYear: data.education.endYear,
        grade: data.education.grade
    });

    await StudentProject.create({
        studentId: student.id,
        title: data.project.title,
        description: data.project.desc,
        techStack: data.project.tech,
        projectUrl: data.project.url || null,
        githubUrl: data.project.github || null
    });

    await recalcStudentCompletion(student);
    return student;
}

async function createTask(companyId, t) {
    const applicationDeadline = daysFromNow(30);
    const startDate = daysFromNow(40);
    const endDate = new Date(startDate);
    if (t.duration.unit === 'weeks') endDate.setDate(endDate.getDate() + t.duration.value * 7);
    else if (t.duration.unit === 'months') endDate.setMonth(endDate.getMonth() + t.duration.value);
    else endDate.setDate(endDate.getDate() + t.duration.value);

    const task = await Task.create({
        title: t.title,
        description: t.description,
        category: t.category,
        subcategory: t.subcategory,
        companyId,
        type: t.type,
        durationValue: t.duration.value,
        durationUnit: t.duration.unit,
        workType: t.workType,
        experienceLevel: t.experienceLevel,
        requirements: COMMON_REQUIREMENTS,
        budgetType: t.budget.type,
        budgetAmountMin: t.budget.type === 'unpaid' ? null : t.budget.min,
        budgetAmountMax: t.budget.type === 'unpaid' ? null : t.budget.max,
        budgetCurrency: 'USD',
        applicationDeadline,
        startDate,
        endDate,
        status: 'active',
        isPublic: true,
        maxApplications: 50,
        applicationCount: 0,
        deliverables: COMMON_DELIVERABLES,
        benefits: COMMON_BENEFITS,
        tags: t.tags,
        publishedAt: new Date()
    });

    await TaskSkill.bulkCreate(
        t.skills.map(([name, level, required]) => ({ taskId: task.id, name, level, required }))
    );

    return task;
}

async function applyStudentToTask(student, task) {
    const app = await Application.create({
        taskId: task.id,
        studentId: student.id,
        coverLetter: `I'm excited to apply for "${task.title}". My background and recent projects line up closely with what you're looking for, and I'd love to contribute.`,
        proposedRate: task.budgetType === 'unpaid' ? null : 30,
        proposedCurrency: 'USD',
        expectedStartDate: task.startDate,
        availabilityHoursPerWeek: 25,
        resumeUrl: student.resumeUrl || null,
        status: 'submitted',
        submittedAt: new Date()
    });

    await ApplicationStatusHistory.create({
        applicationId: app.id,
        fromStatus: null,
        toStatus: 'submitted',
        changedByUserId: null,
        reason: null
    });

    return app;
}

async function scoreFlagship(task, students) {
    try {
        const taskFull = await Task.findByPk(task.id, { include: [{ model: TaskSkill, as: 'skillsRequired' }] });
        const fullStudents = await Student.findAll({
            where: { id: students.map((s) => s.id) },
            include: [
                { model: StudentSkill, as: 'skills' },
                { model: StudentExperience, as: 'experience' },
                { model: StudentEducation, as: 'education' }
            ]
        });
        const ranking = await aiService.rankCandidates(
            aiService.mapTaskToDto(taskFull),
            fullStudents.map(aiService.mapStudentToDto)
        );
        const byStudent = new Map(ranking.map((r) => [String(r.student_id), r.score]));
        await Promise.all(
            students.map(async (s) => {
                const score = byStudent.get(String(s.id));
                if (typeof score === 'number') {
                    await Application.update({ matchScore: score }, { where: { taskId: task.id, studentId: s.id } });
                }
            })
        );
        return true;
    } catch (err) {
        if (err instanceof aiService.AIServiceUnavailableError) return false;
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL:', process.env.DB_NAME);

    console.log('🧹 Wiping all tables…');
    await wipeDatabase();

    console.log('🏢 Creating companies…');
    const companies = [];
    for (const c of COMPANIES) companies.push(await createCompany(c));

    console.log('🎓 Creating students…');
    const students = [];
    for (const s of STUDENTS) students.push(await createStudent(s));

    console.log('📋 Creating tasks…');
    const flagshipTasks = [];
    let taskTotal = 0;
    for (let i = 0; i < companies.length; i++) {
        for (const t of TASKS_BY_COMPANY[i]) {
            const task = await createTask(companies[i].id, t);
            taskTotal += 1;
            if (t.flagship) flagshipTasks.push(task);
        }
    }

    console.log('📨 Creating applications on flagship tasks (all students apply to each)…');
    for (const task of flagshipTasks) {
        for (const s of students) await applyStudentToTask(s, task);
        await task.update({ applicationCount: students.length });
    }

    console.log('🤖 Scoring flagship applications via AI service…');
    let aiUp = true;
    for (const task of flagshipTasks) {
        const ok = await scoreFlagship(task, students);
        if (!ok) aiUp = false;
    }
    if (!aiUp) {
        console.log('   ⚠ AI service not reachable — application matchScores left null (they backfill when a company views applicants, or via /recompute-matches).');
    }

    // ---- Summary ----
    console.log('\n════════════════════ SEED COMPLETE ════════════════════');
    console.log(`Companies: ${companies.length} | Students: ${students.length} | Tasks: ${taskTotal} | Flagship tasks with applicants: ${flagshipTasks.length}`);
    console.log(`\nAll accounts use password:  ${PASSWORD}\n`);

    console.log('COMPANY LOGINS');
    for (let i = 0; i < companies.length; i++) {
        console.log(`  • ${COMPANIES[i].email.padEnd(22)} → ${companies[i].companyName} (${TASKS_BY_COMPANY[i].length} tasks, completion ${companies[i].profileCompletion}%)`);
    }
    console.log('\nSTUDENT LOGINS');
    for (let i = 0; i < students.length; i++) {
        const domain = STUDENTS[i].skills.slice(0, 3).map((s) => s[0]).join(', ');
        console.log(`  • ${STUDENTS[i].email.padEnd(22)} → ${students[i].firstName} ${students[i].lastName} [${domain}…] (completion ${students[i].profileCompletion}%)`);
    }

    console.log('\nWHAT TO TEST');
    console.log('  Student side : log in as each student → dashboard "Recommended for you" + /tasks (sorted by match).');
    console.log('                 Alice→web tasks, Bob→data/ML tasks, Carol→design tasks should rank highest.');
    console.log('  Company side : log in as each company → Candidates → flagship task shows all 3 applicants,');
    console.log('                 ranked by "Best match" (domain-matching student first).');
    console.log('  NOTE: start the AI service (uvicorn app.main:app --port 8000) for scores to appear.');
    console.log('════════════════════════════════════════════════════════\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
