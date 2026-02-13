const axios = require('axios');

async function run() {
    const baseURL = 'http://localhost:5000/api';

    // 1. Register a new company
    const email = `test_corp_${Date.now()}@example.com`;
    const password = 'password123';
    console.log(`Registering company ${email}...`);

    let token;
    let companyId;

    try {
        const regRes = await axios.post(`${baseURL}/auth/register`, {
            email,
            password,
            fullName: 'Test Corp Admin',
            userType: 'company',
            companyName: 'Test Corporation',
            industry: 'Technology',
            registrationNumber: `TC-${Date.now()}`
        });
        token = regRes.data.token;
        console.log('Registered. Token received.');

        // 2. Get Profile to get Company ID
        const profileRes = await axios.get(`${baseURL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        companyId = profileRes.data.company.id;
        console.log(`Company ID: ${companyId}`);

        // 3. Submit Data
        console.log('Submitting data...');
        const submitRes = await axios.post(`${baseURL}/companies/${companyId}/data`, {
            renewable_energy_pct: 50,
            waste_recycled_pct: 30,
            energy_consumption: 1000,
            emissions_co2: 50,
            water_usage: 500,
            employee_count: 100,
            production_volume: 5000
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Success! Data submitted.', submitRes.data);

    } catch (error) {
        console.error('❌ Failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

run();
