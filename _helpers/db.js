const config = require('config.json');
const { Client } = require('pg');
const { Sequelize } = require('sequelize');

module.exports = db = {};

initialize();

async function initialize() {
    const { host, port, user, password, database } = config.database;

    // Step 1: Connect to the default 'postgres' database to check/create target DB
    const adminClient = new Client({
        host,
        port,
        user,
        password,
        database: 'postgres', // default DB
    });

    try {
        await adminClient.connect();

        // Check if DB exists
        const res = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [database]);

        if (res.rowCount === 0) {
            // Database doesn't exist; create it
            await adminClient.query(`CREATE DATABASE "${database}"`);
            console.log(`Database "${database}" created.`);
        } else {
            console.log(`Database "${database}" already exists.`);
        }
    } catch (err) {
        console.error('Error creating database:', err);
        throw err;
    } finally {
        await adminClient.end();
    }

    // Step 2: Connect to the actual application DB
    const sequelize = new Sequelize(database, user, password, { host, port, dialect: 'postgres' });

    // init models and add them to the exported db object
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);

    // define relationships
    db.Account.hasMany(db.RefreshToken, { onDelete: 'CASCADE' });
    db.RefreshToken.belongsTo(db.Account);
    
    // sync all models with database
    await sequelize.sync();
}