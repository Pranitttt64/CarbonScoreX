const { Pool } = require('pg');
require('dotenv').config();

async function testConnection(user, password, db) {
    const connectionString = `postgresql://${user}:${password}@localhost:5432/${db}`;
    console.log(`Testing connection for user: ${user}...`);

    const pool = new Pool({ connectionString });
    try {
        await pool.query('SELECT NOW()');
        console.log(`✅ SUCCESS! User '${user}' connected successfully.`);
        return true;
    } catch (err) {
        console.log(`❌ FAILED for user '${user}': ${err.message}`);
        return false;
    } finally {
        await pool.end();
    }
}

async function run() {
    const password = process.env.DB_PASSWORD || '9860';
    const dbName = 'carbonscorex';

    // Test 1: Try configured user
    const success1 = await testConnection('carbonscorex', password, dbName);
    if (success1) process.exit(0);

    // Test 2: Try default 'postgres' user with same password (common scenario)
    console.log('\nTrying fallback to "postgres" user...');
    const success2 = await testConnection('postgres', password, dbName);

    // Test 3: Try 'postgres' user with 'postgres' db (just to check connectivity)
    if (!success2) {
        console.log('\nTrying minimal connectivity check (postgres/postgres)...');
        await testConnection('postgres', password, 'postgres');
    }
}

run();
