const { Op } = require('sequelize');
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
const Interview = require('./Interview');
const Mentor = require('./Mentor');
const MentorExpertise = require('./MentorExpertise');
const MentorAssignment = require('./MentorAssignment');
const MentorAssignmentHistory = require('./MentorAssignmentHistory');
const MentorNote = require('./MentorNote');
const InternshipProgress = require('./InternshipProgress');
const ProgressMilestone = require('./ProgressMilestone');
const MilestoneSubmission = require('./MilestoneSubmission');
const ProgressTimeLog = require('./ProgressTimeLog');
const ProgressUpdate = require('./ProgressUpdate');
const ProgressStatusHistory = require('./ProgressStatusHistory');

// User <-> role profiles
User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile', onDelete: 'CASCADE' });
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Company, { foreignKey: 'userId', as: 'companyProfile', onDelete: 'CASCADE' });
Company.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Admin, { foreignKey: 'userId', as: 'adminProfile', onDelete: 'CASCADE' });
Admin.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Mentor, { foreignKey: 'userId', as: 'mentorProfile', onDelete: 'CASCADE' });
Mentor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

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

// Interview associations
Application.hasOne(Interview, { foreignKey: 'applicationId', as: 'interview', onDelete: 'CASCADE' });
Interview.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Task.hasMany(Interview, { foreignKey: 'taskId', as: 'interviews', onDelete: 'CASCADE' });
Interview.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

Company.hasMany(Interview, { foreignKey: 'companyId', as: 'interviews', onDelete: 'CASCADE' });
Interview.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Student.hasMany(Interview, { foreignKey: 'studentId', as: 'interviews', onDelete: 'CASCADE' });
Interview.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

User.hasMany(Interview, { foreignKey: 'createdByUserId', as: 'createdInterviews' });

// Mentor associations
Mentor.hasMany(MentorExpertise, { foreignKey: 'mentorId', as: 'expertise', onDelete: 'CASCADE' });
MentorExpertise.belongsTo(Mentor, { foreignKey: 'mentorId' });

User.hasMany(Mentor, { foreignKey: 'verifiedByUserId', as: 'verifiedMentors' });

// Mentor assignment associations
Mentor.hasMany(MentorAssignment, { foreignKey: 'mentorId', as: 'assignments', onDelete: 'CASCADE' });
MentorAssignment.belongsTo(Mentor, { foreignKey: 'mentorId', as: 'mentor' });

Application.hasMany(MentorAssignment, {
    foreignKey: 'applicationId',
    as: 'mentorAssignments',
    onDelete: 'CASCADE'
});
MentorAssignment.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Student.hasMany(MentorAssignment, {
    foreignKey: 'studentId',
    as: 'mentorAssignments',
    onDelete: 'CASCADE'
});
MentorAssignment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Task.hasMany(MentorAssignment, { foreignKey: 'taskId', as: 'mentorAssignments', onDelete: 'CASCADE' });
MentorAssignment.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

Company.hasMany(MentorAssignment, {
    foreignKey: 'companyId',
    as: 'mentorAssignments',
    onDelete: 'CASCADE'
});
MentorAssignment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

User.hasMany(MentorAssignment, { foreignKey: 'assignedByUserId', as: 'mentorAssignmentsMade' });

MentorAssignment.hasMany(MentorAssignmentHistory, {
    foreignKey: 'assignmentId',
    as: 'statusHistory',
    onDelete: 'CASCADE'
});
MentorAssignmentHistory.belongsTo(MentorAssignment, { foreignKey: 'assignmentId' });

User.hasMany(MentorAssignmentHistory, {
    foreignKey: 'changedByUserId',
    as: 'mentorAssignmentStatusChanges'
});

MentorAssignment.hasMany(MentorNote, {
    foreignKey: 'assignmentId',
    as: 'notes',
    onDelete: 'CASCADE'
});
MentorNote.belongsTo(MentorAssignment, { foreignKey: 'assignmentId' });

User.hasMany(MentorNote, { foreignKey: 'authorUserId', as: 'mentorNotes' });
MentorNote.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' });

// ---------------------------------------------------------------------------
// Progress tracking (Module 8)
// ---------------------------------------------------------------------------

// One progress record per accepted application — the internship itself.
Application.hasOne(InternshipProgress, {
    foreignKey: 'applicationId',
    as: 'progress',
    onDelete: 'CASCADE'
});
InternshipProgress.belongsTo(Application, { foreignKey: 'applicationId', as: 'application' });

Student.hasMany(InternshipProgress, {
    foreignKey: 'studentId',
    as: 'internshipProgress',
    onDelete: 'CASCADE'
});
InternshipProgress.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Task.hasMany(InternshipProgress, {
    foreignKey: 'taskId',
    as: 'internshipProgress',
    onDelete: 'CASCADE'
});
InternshipProgress.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });

Company.hasMany(InternshipProgress, {
    foreignKey: 'companyId',
    as: 'internshipProgress',
    onDelete: 'CASCADE'
});
InternshipProgress.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

Mentor.hasMany(InternshipProgress, { foreignKey: 'mentorId', as: 'internshipProgress' });
InternshipProgress.belongsTo(Mentor, { foreignKey: 'mentorId', as: 'mentor' });

InternshipProgress.hasMany(ProgressMilestone, {
    foreignKey: 'progressId',
    as: 'milestones',
    onDelete: 'CASCADE'
});
ProgressMilestone.belongsTo(InternshipProgress, { foreignKey: 'progressId', as: 'progress' });

User.hasMany(ProgressMilestone, { foreignKey: 'createdByUserId', as: 'authoredMilestones' });
User.hasMany(ProgressMilestone, { foreignKey: 'reviewedByUserId', as: 'reviewedMilestones' });

ProgressMilestone.hasMany(MilestoneSubmission, {
    foreignKey: 'milestoneId',
    as: 'submissions',
    onDelete: 'CASCADE'
});
MilestoneSubmission.belongsTo(ProgressMilestone, { foreignKey: 'milestoneId', as: 'milestone' });

InternshipProgress.hasMany(MilestoneSubmission, {
    foreignKey: 'progressId',
    as: 'submissions',
    onDelete: 'CASCADE'
});
MilestoneSubmission.belongsTo(InternshipProgress, { foreignKey: 'progressId', as: 'progress' });

Student.hasMany(MilestoneSubmission, { foreignKey: 'studentId', as: 'milestoneSubmissions' });
MilestoneSubmission.belongsTo(User, { foreignKey: 'reviewedByUserId', as: 'reviewer' });

InternshipProgress.hasMany(ProgressTimeLog, {
    foreignKey: 'progressId',
    as: 'timeLogs',
    onDelete: 'CASCADE'
});
ProgressTimeLog.belongsTo(InternshipProgress, { foreignKey: 'progressId', as: 'progress' });

ProgressMilestone.hasMany(ProgressTimeLog, { foreignKey: 'milestoneId', as: 'timeLogs' });
ProgressTimeLog.belongsTo(ProgressMilestone, { foreignKey: 'milestoneId', as: 'milestone' });

Student.hasMany(ProgressTimeLog, { foreignKey: 'studentId', as: 'timeLogs', onDelete: 'CASCADE' });

InternshipProgress.hasMany(ProgressUpdate, {
    foreignKey: 'progressId',
    as: 'updates',
    onDelete: 'CASCADE'
});
ProgressUpdate.belongsTo(InternshipProgress, { foreignKey: 'progressId', as: 'progress' });

ProgressMilestone.hasMany(ProgressUpdate, { foreignKey: 'milestoneId', as: 'updates' });
ProgressUpdate.belongsTo(ProgressMilestone, { foreignKey: 'milestoneId', as: 'milestone' });

User.hasMany(ProgressUpdate, { foreignKey: 'authorUserId', as: 'progressUpdates' });
ProgressUpdate.belongsTo(User, { foreignKey: 'authorUserId', as: 'author' });

InternshipProgress.hasMany(ProgressStatusHistory, {
    foreignKey: 'progressId',
    as: 'statusHistory',
    onDelete: 'CASCADE'
});
ProgressStatusHistory.belongsTo(InternshipProgress, { foreignKey: 'progressId' });

ProgressMilestone.hasMany(ProgressStatusHistory, {
    foreignKey: 'milestoneId',
    as: 'statusHistory',
    onDelete: 'CASCADE'
});

User.hasMany(ProgressStatusHistory, {
    foreignKey: 'changedByUserId',
    as: 'progressStatusChanges'
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

const recalcMentorCompletion = async (mentor) => {
    if (!mentor) return;
    const expertiseCount = await MentorExpertise.count({ where: { mentorId: mentor.id } });

    let completion = 0;
    if (mentor.firstName && mentor.lastName && mentor.headline) completion += 20;
    if (mentor.bio) completion += 15;
    if (mentor.currentPosition && mentor.currentCompany) completion += 15;
    if (mentor.yearsOfExperience > 0) completion += 10;
    if (expertiseCount >= 3) completion += 20;
    else if (expertiseCount > 0) completion += 10;
    if (mentor.locationCity || mentor.locationCountry) completion += 10;
    if (mentor.socialLinkedin) completion += 10;

    if (mentor.profileCompletion !== completion) {
        mentor.profileCompletion = completion;
        await mentor.save();
    }
};

// Keeps Mentor.activeMenteeCount in step with reality. The count is authoritative;
// the column is a display cache, so capacity checks must COUNT rather than read it.
const recalcMentorActiveCount = async (mentorId, options = {}) => {
    if (mentorId == null) return 0;
    const activeCount = await MentorAssignment.count({
        where: { mentorId, status: 'active' },
        transaction: options.transaction
    });
    await Mentor.update(
        { activeMenteeCount: activeCount },
        { where: { id: mentorId }, transaction: options.transaction }
    );
    return activeCount;
};

// Recomputes the mentor's rating aggregate from the ratings students actually left.
const recalcMentorRating = async (mentorId, options = {}) => {
    if (mentorId == null) return;
    const [completed, rated] = await Promise.all([
        MentorAssignment.count({
            where: { mentorId, status: 'completed' },
            transaction: options.transaction
        }),
        MentorAssignment.findAll({
            where: { mentorId, status: 'completed' },
            attributes: ['studentRating'],
            transaction: options.transaction
        })
    ]);

    const ratings = rated
        .map((r) => r.studentRating)
        .filter((r) => r != null);
    const average = ratings.length
        ? ratings.reduce((sum, r) => sum + Number(r), 0) / ratings.length
        : 0;

    const totalMentees = await MentorAssignment.count({
        where: { mentorId },
        distinct: true,
        col: 'studentId',
        transaction: options.transaction
    });

    await Mentor.update(
        {
            statCompletedMentorships: completed,
            statTotalRatings: ratings.length,
            statAverageRating: Number(average.toFixed(2)),
            statTotalMentees: totalMentees
        },
        { where: { id: mentorId }, transaction: options.transaction }
    );
};

// ---------------------------------------------------------------------------
// Progress recomputation (Module 8)
//
// Every cached number on internship_progress / progress_milestones is derived,
// exactly like Mentor.activeMenteeCount above: the rows are authoritative, the
// columns are a display cache. Nothing is ever incremented in place, so a
// crashed request or a manual DB edit can never leave the totals drifting.
// ---------------------------------------------------------------------------

const toDateOnly = (d) => new Date(d).toISOString().slice(0, 10);

const recalcMilestoneHours = async (milestoneId, options = {}) => {
    if (milestoneId == null) return 0;
    const total = await ProgressTimeLog.sum('hours', {
        where: { milestoneId },
        transaction: options.transaction
    });
    const hours = Number(total) || 0;
    await ProgressMilestone.update(
        { actualHours: hours },
        { where: { id: milestoneId }, transaction: options.transaction }
    );
    return hours;
};

// Recomputes percentage, counts, hours and health for one internship, and
// auto-advances 'not_started' the first time any real work is recorded.
// Returns the saved instance (or null when the row is gone).
const recalcProgressMetrics = async (progressId, options = {}) => {
    if (progressId == null) return null;
    const { transaction, touchActivity = false } = options;
    const now = options.now || new Date();

    const progress = await InternshipProgress.findByPk(progressId, { transaction });
    if (!progress) return null;

    const [milestones, hoursSum, openUpdateBlockers] = await Promise.all([
        ProgressMilestone.findAll({ where: { progressId }, transaction }),
        ProgressTimeLog.sum('hours', { where: { progressId }, transaction }),
        ProgressUpdate.count({
            where: {
                progressId,
                type: { [Op.in]: ProgressUpdate.RESOLVABLE_TYPES },
                resolvedAt: null
            },
            transaction
        })
    ]);

    // Cancelled milestones drop out of the denominator entirely — cancelling
    // work must not make a student look further behind than they are.
    const counted = milestones.filter((m) => m.countsTowardsTotal());
    const totalWeight = counted.reduce((sum, m) => sum + (Number(m.weight) || 1), 0);
    const earnedWeight = counted
        .filter((m) => m.earnsWeight())
        .reduce((sum, m) => sum + (Number(m.weight) || 1), 0);

    const progressPercent = totalWeight
        ? Math.round((earnedWeight / totalWeight) * 100)
        : 0;

    const completedMilestoneCount = counted.filter((m) => m.earnsWeight()).length;
    const overdueMilestoneCount = counted.filter((m) => m.isOverdue(now)).length;
    const blockedMilestoneCount = counted.filter((m) => m.status === 'blocked').length;
    const openBlockerCount = blockedMilestoneCount + Number(openUpdateBlockers || 0);
    const totalHoursLogged = Number(hoursSum) || 0;

    progress.progressPercent = progressPercent;
    progress.milestoneCount = counted.length;
    progress.completedMilestoneCount = completedMilestoneCount;
    progress.overdueMilestoneCount = overdueMilestoneCount;
    progress.openBlockerCount = openBlockerCount;
    progress.totalHoursLogged = totalHoursLogged;

    // The first time anything actually happens, the internship is under way.
    // Closed and paused records are left exactly as the supervisor set them.
    const hasRealActivity =
        totalHoursLogged > 0 || counted.some((m) => m.status !== 'pending');
    if (progress.status === 'not_started' && hasRealActivity) {
        progress.status = 'in_progress';
        progress.startedAt = progress.startedAt || now;
        if (!progress.startDate) progress.startDate = toDateOnly(now);
    }

    if (touchActivity) progress.lastActivityAt = now;

    progress.healthStatus = InternshipProgress.deriveHealth({
        status: progress.status,
        startDate: progress.startDate,
        targetEndDate: progress.targetEndDate,
        progressPercent,
        overdueMilestoneCount,
        openBlockerCount,
        lastActivityAt: progress.lastActivityAt,
        now
    });

    await progress.save({ transaction });
    return progress;
};

// Keeps InternshipProgress.mentorId pointing at whoever is currently guiding
// the internship. Called on every load so Module 7 needs no changes: an
// assignment accepted, declined or cancelled after the fact is picked up here.
const syncProgressMentor = async (progress, options = {}) => {
    if (!progress) return null;
    const { transaction } = options;

    const live = await MentorAssignment.findOne({
        where: {
            applicationId: progress.applicationId,
            status: { [Op.in]: ['active', 'completed'] }
        },
        order: [
            // Prefer a live mentorship over a finished one.
            [sequelize.literal("CASE WHEN `MentorAssignment`.`status` = 'active' THEN 0 ELSE 1 END"), 'ASC'],
            ['createdAt', 'DESC']
        ],
        attributes: ['id', 'mentorId', 'status'],
        transaction
    });

    const mentorId = live ? live.mentorId : null;
    if (String(progress.mentorId || '') !== String(mentorId || '')) {
        progress.mentorId = mentorId;
        await progress.save({ transaction });
    }
    return live;
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
    Interview,
    Mentor,
    MentorExpertise,
    MentorAssignment,
    MentorAssignmentHistory,
    MentorNote,
    InternshipProgress,
    ProgressMilestone,
    MilestoneSubmission,
    ProgressTimeLog,
    ProgressUpdate,
    ProgressStatusHistory,
    recalcStudentCompletion,
    recalcCompanyCompletion,
    recalcMentorCompletion,
    recalcMentorActiveCount,
    recalcMentorRating,
    recalcMilestoneHours,
    recalcProgressMetrics,
    syncProgressMentor
};
