const { query } = require('./src/config/database');
const certificateGenerator = require('./src/utils/pdfGenerator');
require('dotenv').config();

async function backfillCertificates() {
    try {
        console.log('Starting certificate backfill...');

        // Get latest score for each company that doesn't have an active certificate
        const scoresToBackfill = await query(`
      SELECT DISTINCT ON (cs.company_id) 
        cs.id as score_id, cs.score, cs.score_category, cs.scored_at,
        c.id as company_id, c.company_name, c.registration_number
      FROM carbon_scores cs
      JOIN companies c ON cs.company_id = c.id
      LEFT JOIN certificates cert ON cs.id = cert.score_id
      WHERE cert.id IS NULL
      ORDER BY cs.company_id, cs.scored_at DESC
    `);

        console.log(`Found ${scoresToBackfill.rows.length} scores needing certificates.`);

        for (const record of scoresToBackfill.rows) {
            console.log(`Generating certificate for ${record.company_name}...`);

            const issueDate = new Date();
            const validUntil = new Date();
            validUntil.setFullYear(validUntil.getFullYear() + 1);

            const certId = certificateGenerator.generateCertificateId();

            const certData = {
                certificateId: certId,
                companyName: record.company_name,
                registrationNumber: record.registration_number,
                score: parseFloat(record.score),
                category: record.score_category,
                issueDate: issueDate,
                validUntil: validUntil
            };

            // Generate PDF
            const { fileName, signature, verificationUrl } = await certificateGenerator.generateCertificate(certData);

            // Insert record
            await query(
                `INSERT INTO certificates 
        (certificate_id, company_id, score_id, issue_date, valid_until, status, signature_hash, pdf_path, verification_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [certId, record.company_id, record.score_id, issueDate, validUntil, 'active', signature, fileName, verificationUrl]
            );

            console.log(`✓ Created certificate ${certId}`);
        }

        console.log('Backfill complete!');
        process.exit(0);

    } catch (err) {
        console.error('Backfill failed:', err);
        process.exit(1);
    }
}

backfillCertificates();
