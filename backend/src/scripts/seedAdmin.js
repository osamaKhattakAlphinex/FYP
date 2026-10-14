/**
 * Creates the platform administrator account.
 *
 * The admin role exists across the system (mentor verification queue, platform
 * analytics, payment oversight) but no seed creates such a user, so a fresh
 * database has nobody who can open those pages. Run this once:
 *
 *     cd backend
 *     ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<a strong password>' npm run seed:admin
 *
 * On a host with no shell (Render's free plan), set ADMIN_EMAIL and
 * ADMIN_PASSWORD in the service environment instead: `npm run start:render`
 * runs this with --if-configured before the server starts. Clear ADMIN_PASSWORD
 * again once the account exists.
 *
 * Safe to run repeatedly: an existing account is never silently overwritten and
 * its password is only changed when ADMIN_RESET_PASSWORD=true is set explicitly.
 * The password is read from the environment and never written to the logs.
 */
require('dotenv').config();

const { sequelize, User, Admin } = require('../models');

const MIN_PASSWORD_LENGTH = 10;

const seedAdmin = async ({ email, password, firstName, lastName, resetPassword = false }) => {
    const address = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
        throw new Error('ADMIN_EMAIL is not a valid email address');
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const existing = await User.scope('withPassword').findOne({ where: { email: address } });

    if (existing && existing.role !== 'admin') {
        throw new Error(
            `${address} already exists with the role '${existing.role}'. ` +
            'Use a different address for the administrator.'
        );
    }

    if (existing) {
        // Top up anything missing rather than recreating the account.
        const [profile, created] = await Admin.findOrCreate({
            where: { userId: existing.id },
            defaults: {
                userId: existing.id,
                firstName: firstName || 'Platform',
                lastName: lastName || 'Admin',
                isSuperAdmin: true,
                permSystemSettings: true
            }
        });
        if (!existing.isEmailVerified || !existing.isActive) {
            existing.isEmailVerified = true;
            existing.isActive = true;
            await existing.save();
        }
        if (resetPassword) {
            existing.password = password;          // hashed by the model's save hook
            await existing.save();
        }
        return {
            action: resetPassword ? 'password-reset' : 'already-exists',
            email: address,
            profileCreated: created,
            adminId: profile.id
        };
    }

    const user = await User.create({
        email: address,
        password,                                   // hashed by the model's save hook
        role: 'admin',
        isEmailVerified: true,                      // no OTP round-trip for the owner account
        isActive: true
    });
    const profile = await Admin.create({
        userId: user.id,
        firstName: firstName || 'Platform',
        lastName: lastName || 'Admin',
        isSuperAdmin: true,
        permSystemSettings: true
    });

    return { action: 'created', email: address, profileCreated: true, adminId: profile.id };
};

const main = async () => {
    const ifConfigured = process.argv.includes('--if-configured');
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        if (ifConfigured) return 0;                 // nothing to do on an ordinary deploy
        console.error(
            'Set ADMIN_EMAIL and ADMIN_PASSWORD, e.g.\n' +
            "  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<a strong password>' npm run seed:admin"
        );
        return 1;
    }

    await sequelize.authenticate();
    await sequelize.sync();                          // creates the tables on a brand-new database

    const result = await seedAdmin({
        email,
        password,
        firstName: process.env.ADMIN_FIRST_NAME,
        lastName: process.env.ADMIN_LAST_NAME,
        resetPassword: process.env.ADMIN_RESET_PASSWORD === 'true'
    });

    const messages = {
        created: `Administrator created: ${result.email}`,
        'already-exists': `Administrator already exists: ${result.email} (password unchanged; ` +
            'set ADMIN_RESET_PASSWORD=true to change it)',
        'password-reset': `Administrator password reset: ${result.email}`
    };
    console.log(`[seedAdmin] ${messages[result.action]}`);
    console.log('[seedAdmin] Sign in at the usual login page; admins land on the mentor queue.');
    return 0;
};

if (require.main === module) {
    main()
        .then(async (code) => {
            try { await sequelize.close(); } catch (e) { /* already closed */ }
            process.exit(code);
        })
        .catch(async (err) => {
            console.error('[seedAdmin] failed:', err.message);
            try { await sequelize.close(); } catch (e) { /* already closed */ }
            process.exit(1);
        });
}

module.exports = { seedAdmin, MIN_PASSWORD_LENGTH };
