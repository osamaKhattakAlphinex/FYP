const { sequelize } = require('../config/database');

const User = require('./User');
const Student = require('./Student');
const StudentEducation = require('./StudentEducation');
const StudentSkill = require('./StudentSkill');
const StudentExperience = require('./StudentExperience');
const StudentProject = require('./StudentProject');
const StudentCertificate = require('./StudentCertificate');
const Company = require('./Company');
const CompanyTeamMember = require('./CompanyTeamMember');
const CompanyVerificationDocument = require('./CompanyVerificationDocument');
const Admin = require('./Admin');
const Task = require('./Task');
const TaskSkill = require('./TaskSkill');
const TaskAttachment = require('./TaskAttachment');
const TaskUniqueViewer = require('./TaskUniqueViewer');
const Application = require('./Application');
const ApplicationAttachment = require('./ApplicationAttachment');
const ApplicationStatusHistory = require('./ApplicationStatusHistory');

// User <-> role profiles
User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile', onDelete: 'CASCADE' });
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Company, { foreignKey: 'userId', as: 'companyProfile', onDelete: 'CASCADE' });
Company.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Admin, { foreignKey: 'userId', as: 'adminProfile', onDelete: 'CASCADE' });
Admin.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Student child tables
Student.hasMany(StudentEducation, { foreignKey: 'studentId', as: 'education', onDelete: 'CASCADE' });
StudentEducation.belongsTo(Student, { foreignKey: 'studentId' });

Student.hasMany(StudentSkill, { foreignKey: 'studentId', as: 'skills', onDelete: 'CASCADE' });
StudentSkill.belongsTo(Student, { foreignKey: 'studentId' });

Student.hasMany(StudentExperience, { foreignKey: 'studentId', as: 'experience', onDelete: 'CASCADE' });
StudentExperience.belongsTo(Student, { foreignKey: 'studentId' });

Student.hasMany(StudentProject, { foreignKey: 'studentId', as: 'projects', onDelete: 'CASCADE' });
StudentProject.belongsTo(Student, { foreignKey: 'studentId' });

Student.hasMany(StudentCertificate, { foreignKey: 'studentId', as: 'certificates', onDelete: 'CASCADE' });
StudentCertificate.belongsTo(Student, { foreignKey: 'studentId' });

// Company child tables
Company.hasMany(CompanyTeamMember, { foreignKey: 'companyId', as: 'team', onDelete: 'CASCADE' });
CompanyTeamMember.belongsTo(Company, { foreignKey: 'companyId' });

Company.hasMany(CompanyVerificationDocument, {
    foreignKey: 'companyId',
    as: 'verificationDocuments',
    onDelete: 'CASCADE'
});
CompanyVerificationDocument.belongsTo(Company, { foreignKey: 'companyId' });

// Task associations
Task.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Task, { foreignKey: 'companyId', as: 'tasks' });

Task.hasMany(TaskSkill, { foreignKey: 'taskId', as: 'skillsRequired', onDelete: 'CASCADE' });
TaskSkill.belongsTo(Task, { foreignKey: 'taskId' });

Task.hasMany(TaskAttachment, { foreignKey: 'taskId', as: 'attachments', onDelete: 'CASCADE' });
TaskAttachment.belongsTo(Task, { foreignKey: 'taskId' });

Task.hasMany(TaskUniqueViewer, { foreignKey: 'taskId', as: 'uniqueViewers', onDelete: 'CASCADE' });
TaskUniqueViewer.belongsTo(Task, { foreignKey: 'taskId' });
TaskUniqueViewer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Application associations
Task.hasMany(Application, { foreignKey: 'taskId', as: 'applications', onDelete: 'CASCADE' });
Application.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

Student.hasMany(Application, { foreignKey: 'studentId', as: 'applications', onDelete: 'CASCADE' });
Application.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Application.hasMany(ApplicationAttachment, {
    foreignKey: 'applicationId',
    as: 'attachments',
    onDelete: 'CASCADE'
});
ApplicationAttachment.belongsTo(Application, { foreignKey: 'applicationId' });

Application.hasMany(ApplicationStatusHistory, {
    foreignKey: 'applicationId',
    as: 'statusHistory',
    onDelete: 'CASCADE'
});
ApplicationStatusHistory.belongsTo(Application, { foreignKey: 'applicationId' });

User.hasMany(ApplicationStatusHistory, {
    foreignKey: 'changedByUserId',
    as: 'applicationStatusChanges'
});

// Student profile completion hook (needs counts of associated rows)
const recalcStudentCompletion = async (student) => {
    if (!student) return;
    const [edu, skl, exp, prj] = await Promise.all([
        StudentEducation.count({ where: { studentId: student.id } }),
        StudentSkill.count({ where: { studentId: student.id } }),
        StudentExperience.count({ where: { studentId: student.id } }),
        StudentProject.count({ where: { studentId: student.id } })
    ]);

    let completion = 0;
    if (student.firstName && student.lastName && (student.locationCity || student.locationCountry)) completion += 20;
    if (edu > 0) completion += 15;
    if (skl >= 3) completion += 15;
    if (exp > 0) completion += 15;
    if (prj > 0) completion += 15;
    if (student.bio) completion += 10;
    if (student.resumeUrl) completion += 10;

    if (student.profileCompletion !== completion) {
        student.profileCompletion = completion;
        await student.save();
    }
};

const recalcCompanyCompletion = async (company) => {
    if (!company) return;
    const teamCount = await CompanyTeamMember.count({ where: { companyId: company.id } });
    let completion = 0;
    if (company.companyName && company.industry && company.companySize) completion += 25;
    if (company.description) completion += 15;
    if (company.locationCity && company.locationCountry) completion += 15;
    if (company.contactPhone && company.contactEmail) completion += 15;
    if (Array.isArray(company.cultureValues) && company.cultureValues.length > 0) completion += 10;
    if (teamCount > 0) completion += 10;
    if (company.logo) completion += 10;

    if (company.profileCompletion !== completion) {
        company.profileCompletion = completion;
        await company.save();
    }
};

module.exports = {
    sequelize,
    User,
    Student,
    StudentEducation,
    StudentSkill,
    StudentExperience,
    StudentProject,
    StudentCertificate,
    Company,
    CompanyTeamMember,
    CompanyVerificationDocument,
    Admin,
    Task,
    TaskSkill,
    TaskAttachment,
    TaskUniqueViewer,
    Application,
    ApplicationAttachment,
    ApplicationStatusHistory,
    recalcStudentCompletion,
    recalcCompanyCompletion
};
