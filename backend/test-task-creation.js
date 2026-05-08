// Test script to debug task creation
// Run with: node test-task-creation.js

const axios = require('axios');

const API_URL = 'http://localhost:5000/api/tasks';

// Sample task data that should pass validation
const validTaskData = {
    title: 'Full Stack Developer Internship',
    description: 'We are looking for a talented full stack developer to join our team. This is a great opportunity to work on real-world projects and gain valuable experience. You will be working with modern technologies including React, Node.js, and MongoDB. The ideal candidate should have strong problem-solving skills and be eager to learn.',
    category: 'Web Development',
    type: 'internship',
    duration: {
        value: 12,
        unit: 'weeks'
    },
    workType: 'remote',
    experienceLevel: 'entry',
    skillsRequired: [{
            name: 'JavaScript',
            level: 'intermediate',
            required: true
        },
        {
            name: 'React',
            level: 'beginner',
            required: true
        },
        {
            name: 'Node.js',
            level: 'beginner',
            required: false
        }
    ],
    budget: {
        type: 'unpaid'
    },
    applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    maxApplications: 50,
    requirements: [
        'Strong understanding of JavaScript',
        'Experience with React',
        'Good communication skills'
    ],
    deliverables: [
        'Complete assigned tasks',
        'Participate in code reviews',
        'Document your work'
    ],
    benefits: [
        'Mentorship from senior developers',
        'Certificate of completion',
        'Flexible working hours'
    ],
    tags: ['javascript', 'react', 'nodejs', 'internship'],
    location: {
        city: 'Remote',
        country: 'Worldwide',
        timezone: 'UTC'
    }
};

async function testTaskCreation(token) {
    try {
        console.log('Testing task creation...\n');
        console.log('Request data:', JSON.stringify(validTaskData, null, 2));
        console.log('\n---\n');

        const response = await axios.post(API_URL, validTaskData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Success!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Error occurred:');

        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response data:', JSON.stringify(error.response.data, null, 2));

            // If validation errors exist, show them clearly
            if (error.response.data.errors) {
                console.log('\n📋 Validation Errors:');
                error.response.data.errors.forEach((err, index) => {
                    console.log(`  ${index + 1}. Field: ${err.field}`);
                    console.log(`     Message: ${err.message}`);
                });
            }
        } else if (error.request) {
            console.log('No response received from server');
            console.log('Is the server running on port 5000?');
        } else {
            console.log('Error:', error.message);
        }
    }
}

// Get token from command line argument
const token = process.argv[2];

if (!token) {
    console.log('❌ Please provide an authentication token');
    console.log('Usage: node test-task-creation.js YOUR_AUTH_TOKEN');
    console.log('\nTo get a token:');
    console.log('1. Login via POST /api/auth/login');
    console.log('2. Copy the token from the response');
    console.log('3. Run: node test-task-creation.js <token>');
    process.exit(1);
}

testTaskCreation(token);