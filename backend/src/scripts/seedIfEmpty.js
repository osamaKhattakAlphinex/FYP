/**
 * Loads the demo dataset into a brand-new database, and does nothing otherwise.
 *
 * Meant for hosts with no shell access (e.g. Render's free plan), run just
 * before the server starts:
 *
 *     SEED_IF_EMPTY=true node src/scripts/seedIfEmpty.js && node src/server.js
 *
 * seedDemo.js truncates every table, so this only runs it when the flag is set
 * AND the users table is empty — it can never wipe real data. It then runs the
 * mentor and progress seeds, the same order as the README.
 */
require('dotenv').config();

const path = require('path');
const { spawnSync } = require('child_process');

const SEEDS = ['seedDemo.js', 'seedMentors.js', 'seedProgress.js'];

async function main() {
    if (process.env.SEED_IF_EMPTY !== 'true') return 0;

    const { sequelize, User } = require('../models');
    await sequelize.authenticate();
    // A fresh database has no tables yet; create them (never alters existing ones).
    await sequelize.sync();

    const users = await User.count();
    await sequelize.close();
    if (users > 0) {
        console.log(`[seedIfEmpty] ${users} user(s) already exist — skipping the demo seed.`);
        return 0;
    }

    console.log('[seedIfEmpty] Empty database — loading the demo dataset.');
    for (const script of SEEDS) {
        const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
            stdio: 'inherit',
            env: process.env
        });
        if (result.status !== 0) {
            console.error(`[seedIfEmpty] ${script} failed (exit ${result.status}); continuing to start the server.`);
            return 0;
        }
    }
    console.log('[seedIfEmpty] Demo dataset loaded.');
    return 0;
}

// Never block the server from starting because seeding had a problem.
main()
    .then((code) => process.exit(code))
    .catch((err) => {
        console.error('[seedIfEmpty] skipped:', err.message);
        process.exit(0);
    });
