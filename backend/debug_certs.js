const { query } = require('./src/config/database');
require('dotenv').config();

async function checkCertificates() {
    try {
        console.log('Checking certificates table...');
        const res = await query('SELECT * FROM certificates');
        console.log(`Found ${res.rows.length} certificates.`);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('Checking companies...');
        const companies = await query('SELECT * FROM companies');
        console.log(`Found ${companies.rows.length} companies.`);
        console.log(JSON.stringify(companies.rows, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkCertificates();
