const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'smart_ai_internship',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 3306,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`MySQL Connected: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'smart_ai_internship'}`);

        const syncOptions = process.env.DB_SYNC === 'force'
            ? { force: true }
            : process.env.DB_SYNC === 'alter'
                ? { alter: true }
                : {};
        await sequelize.sync(syncOptions);
        console.log('Database synchronized');
    } catch (error) {
        console.error('Database error:', error.message || '(no message)');
        if (error.original) console.error('  → original:', error.original.sqlMessage || error.original.message);
        if (error.sql) console.error('  → sql:', error.sql);
        if (error.parent && error.parent !== error.original) {
            console.error('  → parent:', error.parent.sqlMessage || error.parent.message);
        }
        if (!error.message && !error.original) console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;
module.exports.sequelize = sequelize;
