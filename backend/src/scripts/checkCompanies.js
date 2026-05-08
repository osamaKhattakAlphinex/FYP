const mongoose = require('mongoose');
const Company = require('../models/Company');
require('dotenv').config();

async function checkCompanies() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all companies
        const companies = await Company.find().populate('userId', 'email role');

        if (companies.length === 0) {
            console.log('❌ No companies found in the database.');
            console.log('\n📝 To create a company:');
            console.log('   1. Register a new user with role "company"');
            console.log('   2. Complete the company profile');
            console.log('   3. Run this script again\n');
            process.exit(1);
        }

        console.log(`✅ Found ${companies.length} company/companies:\n`);

        companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.companyName || 'Unnamed Company'}`);
            console.log(`   ID: ${company._id}`);
            console.log(`   Email: ${company.userId?.email || 'N/A'}`);
            console.log(`   Industry: ${company.industry || 'N/A'}`);
            console.log(`   Size: ${company.companySize || 'N/A'}`);
            console.log(`   Verified: ${company.verification?.isVerified ? '✓' : '✗'}`);
            console.log(`   Profile Completion: ${company.profileCompletion}%`);
            console.log('');
        });

        console.log('✅ You can now run the seed script:');
        console.log('   npm run seed:tasks\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the check
checkCompanies();