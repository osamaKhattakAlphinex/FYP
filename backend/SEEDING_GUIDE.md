# Database Seeding Guide

## Seeding Tasks

This guide explains how to populate your database with sample tasks for testing and development.

### Prerequisites

Before seeding tasks, ensure you have:

1. MongoDB running and connected
2. At least one company profile created in the database
3. Environment variables properly configured in `.env`

### Running the Seed Script

To seed the database with 75 sample tasks:

```bash
cd backend
npm run seed:tasks
```

### What Gets Seeded

The seed script will:

- Clear all existing tasks from the database
- Generate 75 diverse tasks across 13 categories
- Randomly assign tasks to existing companies
- Create realistic task data including:
  - Various categories (Web Development, Mobile Development, UI/UX Design, etc.)
  - Different work types (remote, onsite, hybrid)
  - Multiple experience levels (entry, intermediate, expert)
  - Diverse budget ranges (unpaid, fixed, hourly)
  - Realistic deadlines and durations
  - Required skills and requirements
  - Benefits and deliverables

### Task Categories

The script generates tasks in the following categories:

- Web Development (Full Stack, Frontend, Backend, CMS)
- Mobile Development (iOS, Android, Cross-platform)
- UI/UX Design (UI Design, UX Research, Design Systems)
- Data Science (Data Analysis, Machine Learning)
- Machine Learning (Computer Vision, NLP)
- Digital Marketing (SEO, Social Media)
- Content Writing (Blog Writing, Technical Writing)
- Graphic Design (Branding, Print Design)
- Video Editing (Video Production)
- Business Analysis (Process Analysis)
- Quality Assurance (Test Automation, Manual Testing)
- DevOps (CI/CD)
- Cybersecurity (Security Testing)

### Sample Output

After running the script, you'll see:

```
Connected to MongoDB
Found 5 companies
Cleared existing tasks
✅ Successfully seeded 75 tasks

📊 Tasks by Category:
  Web Development: 12
  Mobile Development: 9
  UI/UX Design: 9
  Data Science: 6
  ...

💼 Tasks by Work Type:
  remote: 28
  onsite: 24
  hybrid: 23
```

### Viewing Seeded Tasks

After seeding, you can:

1. View tasks in the frontend at `/tasks`
2. Query tasks via API: `GET http://localhost:5000/api/tasks`
3. Check MongoDB directly using MongoDB Compass or CLI

### Troubleshooting

**Error: "No companies found"**

- Create at least one company profile before seeding tasks
- Register a company user and complete their profile

**Error: "Connection failed"**

- Check if MongoDB is running
- Verify `MONGODB_URI` in your `.env` file
- Ensure network connectivity to MongoDB

**Tasks not appearing in frontend**

- Verify backend server is running
- Check browser console for API errors
- Ensure tasks have `status: 'active'` and `isPublic: true`

### Re-seeding

To re-seed the database:

1. The script automatically clears existing tasks
2. Simply run `npm run seed:tasks` again
3. New tasks will be generated with different random values

### Customization

To modify the seed data:

1. Edit `backend/src/scripts/seedTasks.js`
2. Adjust `targetTaskCount` to change the number of tasks
3. Modify `taskTemplates` to add/remove task types
4. Update `categories`, `workTypes`, etc. to change options

### Production Warning

⚠️ **Do not run this script in production!**

- This script deletes all existing tasks
- It's intended for development and testing only
- Use proper data migration tools for production
