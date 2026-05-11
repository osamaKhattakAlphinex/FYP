require('dotenv').config();
const { sequelize, Task, TaskSkill, Company } = require('../models');

// Sample data for generating tasks
const categories = [
    'Web Development',
    'Mobile Development',
    'UI/UX Design',
    'Data Science',
    'Machine Learning',
    'Digital Marketing',
    'Content Writing',
    'Graphic Design',
    'Video Editing',
    'Business Analysis',
    'Quality Assurance',
    'DevOps',
    'Cybersecurity'
];

const taskTemplates = {
    'Web Development': [
        { title: 'Build E-commerce Website', description: 'Develop a full-featured e-commerce platform with shopping cart, payment integration, and admin dashboard. Must be responsive and SEO-friendly.', skills: ['React', 'Node.js', 'MySQL', 'Express', 'Stripe'], subcategory: 'Full Stack' },
        { title: 'Create Landing Page', description: 'Design and develop a modern, conversion-optimized landing page for our new product launch. Focus on performance and mobile responsiveness.', skills: ['HTML', 'CSS', 'JavaScript', 'Tailwind CSS'], subcategory: 'Frontend' },
        { title: 'REST API Development', description: 'Build a scalable RESTful API with authentication, authorization, and comprehensive documentation. Must follow best practices.', skills: ['Node.js', 'Express', 'PostgreSQL', 'JWT'], subcategory: 'Backend' },
        { title: 'WordPress Theme Customization', description: 'Customize existing WordPress theme to match brand guidelines. Add custom post types and integrate third-party plugins.', skills: ['WordPress', 'PHP', 'CSS', 'JavaScript'], subcategory: 'CMS' }
    ],
    'Mobile Development': [
        { title: 'iOS App Development', description: 'Develop a native iOS application with clean UI/UX, offline support, and push notifications. Must follow Apple HIG.', skills: ['Swift', 'SwiftUI', 'Core Data', 'Firebase'], subcategory: 'iOS' },
        { title: 'Android App Development', description: 'Create an Android app with Material Design, local database, and API integration. Support Android 8.0+.', skills: ['Kotlin', 'Android SDK', 'Room', 'Retrofit'], subcategory: 'Android' },
        { title: 'React Native App', description: 'Build cross-platform mobile app using React Native. Include authentication, real-time updates, and offline mode.', skills: ['React Native', 'JavaScript', 'Redux', 'Firebase'], subcategory: 'Cross-platform' }
    ],
    'UI/UX Design': [
        { title: 'Mobile App UI Design', description: 'Design intuitive and visually appealing UI for mobile application. Create high-fidelity mockups and interactive prototypes.', skills: ['Figma', 'Adobe XD', 'Sketch', 'Prototyping'], subcategory: 'UI Design' },
        { title: 'User Research & Testing', description: 'Conduct user research, create personas, and perform usability testing. Deliver actionable insights and recommendations.', skills: ['User Research', 'Usability Testing', 'Wireframing', 'Analytics'], subcategory: 'UX Research' },
        { title: 'Design System Creation', description: 'Build comprehensive design system with components, patterns, and guidelines. Ensure consistency across products.', skills: ['Figma', 'Design Systems', 'Component Libraries', 'Documentation'], subcategory: 'Design Systems' }
    ],
    'Data Science': [
        { title: 'Data Analysis Project', description: 'Analyze large datasets to extract insights and create visualizations. Deliver comprehensive reports with recommendations.', skills: ['Python', 'Pandas', 'NumPy', 'Matplotlib', 'SQL'], subcategory: 'Data Analysis' },
        { title: 'Predictive Modeling', description: 'Build predictive models using machine learning algorithms. Optimize for accuracy and deploy to production.', skills: ['Python', 'Scikit-learn', 'TensorFlow', 'Statistics'], subcategory: 'Machine Learning' }
    ],
    'Machine Learning': [
        { title: 'Image Classification Model', description: 'Develop deep learning model for image classification. Train on custom dataset and optimize for inference speed.', skills: ['Python', 'TensorFlow', 'Keras', 'Computer Vision', 'CNN'], subcategory: 'Computer Vision' },
        { title: 'NLP Chatbot Development', description: 'Create intelligent chatbot using NLP techniques. Implement intent recognition and context management.', skills: ['Python', 'NLP', 'NLTK', 'spaCy', 'Transformers'], subcategory: 'Natural Language Processing' }
    ],
    'Digital Marketing': [
        { title: 'SEO Optimization', description: 'Improve website SEO rankings through on-page and off-page optimization. Conduct keyword research and competitor analysis.', skills: ['SEO', 'Google Analytics', 'Keyword Research', 'Content Strategy'], subcategory: 'SEO' },
        { title: 'Social Media Campaign', description: 'Plan and execute social media marketing campaign across multiple platforms. Create engaging content and track metrics.', skills: ['Social Media Marketing', 'Content Creation', 'Analytics', 'Copywriting'], subcategory: 'Social Media' }
    ],
    'Content Writing': [
        { title: 'Blog Content Creation', description: 'Write SEO-optimized blog posts on technical topics. Research thoroughly and maintain consistent brand voice.', skills: ['Content Writing', 'SEO Writing', 'Research', 'Editing'], subcategory: 'Blog Writing' },
        { title: 'Technical Documentation', description: 'Create comprehensive technical documentation for software products. Include API docs, user guides, and tutorials.', skills: ['Technical Writing', 'Documentation', 'Markdown', 'API Documentation'], subcategory: 'Technical Writing' }
    ],
    'Graphic Design': [
        { title: 'Brand Identity Design', description: 'Design complete brand identity including logo, color palette, typography, and brand guidelines.', skills: ['Adobe Illustrator', 'Adobe Photoshop', 'Branding', 'Logo Design'], subcategory: 'Branding' },
        { title: 'Marketing Materials', description: 'Create eye-catching marketing materials including brochures, flyers, and social media graphics.', skills: ['Adobe Photoshop', 'Adobe InDesign', 'Graphic Design', 'Print Design'], subcategory: 'Print Design' }
    ],
    'Video Editing': [
        { title: 'YouTube Video Editing', description: 'Edit engaging YouTube videos with transitions, effects, and color grading. Add subtitles and optimize for platform.', skills: ['Adobe Premiere Pro', 'After Effects', 'Color Grading', 'Motion Graphics'], subcategory: 'Video Production' }
    ],
    'Business Analysis': [
        { title: 'Business Process Analysis', description: 'Analyze current business processes and identify improvement opportunities. Create detailed documentation and recommendations.', skills: ['Business Analysis', 'Process Mapping', 'Requirements Gathering', 'Documentation'], subcategory: 'Process Analysis' }
    ],
    'Quality Assurance': [
        { title: 'Test Automation', description: 'Develop automated test suites for web application. Implement CI/CD integration and generate test reports.', skills: ['Selenium', 'Jest', 'Cypress', 'Test Automation', 'CI/CD'], subcategory: 'Test Automation' },
        { title: 'Manual Testing', description: 'Perform comprehensive manual testing including functional, regression, and UAT. Document bugs and create test cases.', skills: ['Manual Testing', 'Test Cases', 'Bug Tracking', 'QA Methodologies'], subcategory: 'Manual Testing' }
    ],
    'DevOps': [
        { title: 'CI/CD Pipeline Setup', description: 'Set up automated CI/CD pipeline using modern DevOps tools. Implement testing, building, and deployment stages.', skills: ['Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'AWS'], subcategory: 'CI/CD' }
    ],
    'Cybersecurity': [
        { title: 'Security Audit', description: 'Conduct comprehensive security audit of web application. Identify vulnerabilities and provide remediation recommendations.', skills: ['Penetration Testing', 'Security Auditing', 'OWASP', 'Network Security'], subcategory: 'Security Testing' }
    ]
};

const workTypes = ['remote', 'onsite', 'hybrid'];
const experienceLevels = ['entry', 'intermediate', 'expert'];
const taskTypes = ['internship', 'project', 'freelance'];
const budgetTypes = ['fixed', 'hourly', 'unpaid'];

const locations = [
    { city: 'San Francisco', state: 'CA', country: 'USA', timezone: 'PST' },
    { city: 'New York', state: 'NY', country: 'USA', timezone: 'EST' },
    { city: 'London', state: '', country: 'UK', timezone: 'GMT' },
    { city: 'Berlin', state: '', country: 'Germany', timezone: 'CET' },
    { city: 'Toronto', state: 'ON', country: 'Canada', timezone: 'EST' },
    { city: 'Singapore', state: '', country: 'Singapore', timezone: 'SGT' },
    { city: 'Sydney', state: 'NSW', country: 'Australia', timezone: 'AEST' },
    { city: 'Mumbai', state: 'MH', country: 'India', timezone: 'IST' },
    { city: 'Tokyo', state: '', country: 'Japan', timezone: 'JST' },
    { city: 'Dubai', state: '', country: 'UAE', timezone: 'GST' }
];

const benefits = [
    'Flexible working hours',
    'Remote work opportunity',
    'Mentorship from industry experts',
    'Certificate of completion',
    'Letter of recommendation',
    'Potential for full-time employment',
    'Networking opportunities',
    'Real-world project experience',
    'Portfolio building opportunity',
    'Learning and development budget'
];

const requirements = [
    'Strong communication skills',
    'Ability to work independently',
    'Problem-solving mindset',
    'Attention to detail',
    'Team collaboration',
    'Time management skills',
    'Willingness to learn',
    'Portfolio of previous work',
    'Available for full-time commitment',
    'Proficiency in English'
];

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}
function getRandomElements(array, count) {
    return [...array].sort(() => 0.5 - Math.random()).slice(0, count);
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomDate(daysFromNow, maxDays) {
    const date = new Date();
    date.setDate(date.getDate() + getRandomInt(daysFromNow, maxDays));
    return date;
}

function generateBudget() {
    const type = getRandomElement(budgetTypes);
    if (type === 'unpaid') return { type: 'unpaid' };

    const ranges = {
        fixed: [
            { min: 500, max: 500 }, { min: 1000, max: 1000 },
            { min: 1500, max: 2000 }, { min: 2500, max: 3000 }, { min: 3000, max: 5000 }
        ],
        hourly: [
            { min: 15, max: 20 }, { min: 20, max: 30 }, { min: 30, max: 50 },
            { min: 50, max: 75 }, { min: 75, max: 100 }
        ]
    };

    const range = getRandomElement(ranges[type]);
    return { type, amount: range, currency: 'USD' };
}

function generateDuration() {
    return getRandomElement([
        { value: 2, unit: 'weeks' },
        { value: 1, unit: 'months' },
        { value: 2, unit: 'months' },
        { value: 3, unit: 'months' },
        { value: 6, unit: 'months' }
    ]);
}

function generateTaskRow(category, template, companyId) {
    const workType = getRandomElement(workTypes);
    const applicationDeadline = getRandomDate(7, 60);
    const startDate = new Date(applicationDeadline);
    startDate.setDate(startDate.getDate() + getRandomInt(7, 30));

    const duration = generateDuration();
    const endDate = new Date(startDate);
    if (duration.unit === 'weeks') endDate.setDate(endDate.getDate() + duration.value * 7);
    else if (duration.unit === 'months') endDate.setMonth(endDate.getMonth() + duration.value);

    const budget = generateBudget();
    const location = workType !== 'remote' ? getRandomElement(locations) : null;

    return {
        row: {
            title: template.title,
            description: template.description,
            category,
            subcategory: template.subcategory,
            companyId,
            type: getRandomElement(taskTypes),
            durationValue: duration.value,
            durationUnit: duration.unit,
            workType,
            experienceLevel: getRandomElement(experienceLevels),
            requirements: getRandomElements(requirements, getRandomInt(3, 6)),
            budgetType: budget.type,
            budgetAmountMin: budget.amount ? budget.amount.min : null,
            budgetAmountMax: budget.amount ? budget.amount.max : null,
            budgetCurrency: budget.currency || 'USD',
            applicationDeadline,
            startDate,
            endDate,
            status: 'active',
            isPublic: true,
            isFeatured: Math.random() > 0.8,
            maxApplications: getRandomInt(20, 100),
            applicationCount: getRandomInt(0, 15),
            deliverables: [
                'Source code with documentation',
                'Deployment guide',
                'Final presentation',
                'Progress reports'
            ].slice(0, getRandomInt(2, 4)),
            benefits: getRandomElements(benefits, getRandomInt(3, 6)),
            locationCity: location ? location.city : null,
            locationState: location ? location.state : null,
            locationCountry: location ? location.country : null,
            locationTimezone: location ? location.timezone : null,
            tags: getRandomElements(template.skills, getRandomInt(2, 4)),
            views: getRandomInt(0, 500),
            saves: getRandomInt(0, 50),
            publishedAt: new Date()
        },
        skills: template.skills.map((s) => ({
            name: s,
            level: getRandomElement(['beginner', 'intermediate', 'advanced']),
            required: Math.random() > 0.3
        }))
    };
}

async function seedTasks() {
    try {
        await sequelize.authenticate();
        console.log('Connected to MySQL');

        const companies = await Company.findAll();
        if (companies.length === 0) {
            console.log('No companies found. Please create companies first.');
            process.exit(1);
        }
        console.log(`Found ${companies.length} companies`);

        // Clear existing tasks (cascade deletes child rows)
        await Task.destroy({ where: {}, truncate: false });
        console.log('Cleared existing tasks');

        const targetTaskCount = 75;
        let taskCount = 0;
        const pending = [];

        while (taskCount < targetTaskCount) {
            for (const category of categories) {
                if (taskCount >= targetTaskCount) break;
                const templates = taskTemplates[category];
                if (!templates) continue;

                for (const template of templates) {
                    if (taskCount >= targetTaskCount) break;
                    const company = getRandomElement(companies);
                    pending.push(generateTaskRow(category, template, company.id));
                    taskCount++;
                }
            }
        }

        const insertedTasks = await Task.bulkCreate(pending.map((p) => p.row), { individualHooks: true });

        const allSkills = [];
        insertedTasks.forEach((task, idx) => {
            pending[idx].skills.forEach((s) => {
                allSkills.push({ taskId: task.id, ...s });
            });
        });

        if (allSkills.length > 0) {
            await TaskSkill.bulkCreate(allSkills);
        }

        console.log(`✅ Successfully seeded ${insertedTasks.length} tasks`);

        const stats = await Task.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['category'],
            order: [[sequelize.literal('count'), 'DESC']],
            raw: true
        });

        console.log('\n📊 Tasks by Category:');
        stats.forEach((stat) => {
            console.log(`  ${stat.category}: ${stat.count}`);
        });

        const workTypeStats = await Task.findAll({
            attributes: ['workType', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['workType'],
            raw: true
        });

        console.log('\n💼 Tasks by Work Type:');
        workTypeStats.forEach((stat) => {
            console.log(`  ${stat.workType}: ${stat.count}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error seeding tasks:', error);
        process.exit(1);
    }
}

seedTasks();
