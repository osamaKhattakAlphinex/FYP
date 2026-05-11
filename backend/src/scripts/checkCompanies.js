require('dotenv').config();
const { sequelize, Company, User } = require('../models');

async function checkCompanies() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to MySQL\n');

        const companies = await Company.findAll({
            include: [{ model: User, as: 'user', attributes: ['email', 'role'] }]
        });

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
            console.log(`   ID: ${company.id}`);
            console.log(`   Email: ${company.user ? company.user.email : 'N/A'}`);
            console.log(`   Industry: ${company.industry || 'N/A'}`);
            console.log(`   Size: ${company.companySize || 'N/A'}`);
            console.log(`   Verified: ${company.verificationIsVerified ? '✓' : '✗'}`);
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

checkCompanies();
