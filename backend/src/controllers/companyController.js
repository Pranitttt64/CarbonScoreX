/**
 * Company Controller
 * Handles company data submission and carbon score operations
 */
const { query } = require('../config/database');
const axios = require('axios');
const certificateGenerator = require('../utils/pdfGenerator');
const geminiService = require('../services/geminiService');

class CompanyController {
    constructor() {
        this.getAllCompanies = this.getAllCompanies.bind(this);
        this.submitData = this.submitData.bind(this);
        this.getScore = this.getScore.bind(this);
        this.getScoreHistory = this.getScoreHistory.bind(this);
        this.getRecommendations = this.getRecommendations.bind(this);
    }

    /**
     * Get all companies (public listing)
     */
    async getAllCompanies(req, res) {
        try {
            const result = await query(
                `SELECT c.id, c.company_name, c.industry, c.registration_number,
                cs.score, cs.score_category, cs.scored_at
         FROM companies c
         LEFT JOIN LATERAL (
           SELECT score, score_category, scored_at
           FROM carbon_scores
           WHERE company_id = c.id
           ORDER BY scored_at DESC
           LIMIT 1
         ) cs ON true
         ORDER BY cs.score DESC NULLS LAST`
            );

            res.json({ companies: result.rows });

        } catch (error) {
            console.error('Get companies error:', error);
            res.status(500).json({
                error: 'Failed to fetch companies',
                details: error.message
            });
        }
    }

    /**
     * Submit company data for carbon scoring
     */
    async submitData(req, res) {
        try {
            const companyId = parseInt(req.params.id);
            if (isNaN(companyId)) {
                return res.status(400).json({ error: 'Invalid company ID' });
            }
            const data = req.body;

            // Validate that user owns this company
            if (req.user.companyId !== companyId) {
                return res.status(403).json({
                    error: 'Not authorized to submit data for this company'
                });
            }

            // Store the data record
            const dataResult = await query(
                `INSERT INTO company_data_records (company_id, data)
         VALUES ($1, $2)
         RETURNING id, submitted_at`,
                [companyId, JSON.stringify(data)]
            );

            const dataRecord = dataResult.rows[0];

            // Call ML service for scoring
            let mlScore = null;
            try {
                const mlResponse = await axios.post(
                    `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/predict`,
                    data,
                    { timeout: 10000 }
                );
                mlScore = mlResponse.data;

                // Validate ML response structure
                if (!mlScore || typeof mlScore.score !== 'number') {
                    throw new Error('Invalid ML service response format');
                }
            } catch (mlError) {
                console.warn('ML service unavailable, using fallback scoring:', mlError.message);
                // Fallback scoring based on simple rules
                mlScore = this.fallbackScoring(data);
            }

            // Validate mlScore before using
            if (!mlScore || typeof mlScore.score !== 'number') {
                return res.status(500).json({
                    error: 'Failed to calculate carbon score',
                    details: 'Invalid score response from ML service'
                });
            }

            // Determine score category
            const scoreCategory = this.getScoreCategory(mlScore.score);

            // Store the carbon score
            const scoreResult = await query(
                `INSERT INTO carbon_scores (company_id, score, score_category, explanation, data_record_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, score, score_category, scored_at`,
                [companyId, mlScore.score, scoreCategory, JSON.stringify(mlScore.explanation || {}), dataRecord.id]
            );

            const carbonScore = scoreResult.rows[0];

            // --- Generate Certificate ---
            try {
                // Get company details for the certificate
                const companyResult = await query(
                    'SELECT company_name, registration_number FROM companies WHERE id = $1',
                    [companyId]
                );
                const company = companyResult.rows[0];

                if (company) {
                    const issueDate = new Date();
                    const validUntil = new Date();
                    validUntil.setFullYear(validUntil.getFullYear() + 1); // Valid for 1 year

                    const certId = certificateGenerator.generateCertificateId();

                    const certData = {
                        certificateId: certId,
                        companyName: company.company_name,
                        registrationNumber: company.registration_number,
                        score: parseFloat(carbonScore.score),
                        category: carbonScore.score_category,
                        issueDate: issueDate,
                        validUntil: validUntil
                    };

                    // Generate PDF file
                    const { fileName, signature, verificationUrl } = await certificateGenerator.generateCertificate(certData);

                    // Deactivate old certificates
                    await query(
                        "UPDATE certificates SET status = 'expired' WHERE company_id = $1 AND status = 'active'",
                        [companyId]
                    );

                    // Insert new certificate record
                    await query(
                        `INSERT INTO certificates 
                        (certificate_id, company_id, score_id, issue_date, valid_until, status, signature_hash, pdf_path, verification_url)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                        [certId, companyId, carbonScore.id, issueDate, validUntil, 'active', signature, fileName, verificationUrl]
                    );

                    console.log(`Certificate generated for company ${companyId}: ${certId}`);
                }
            } catch (certError) {
                console.error('Failed to generate certificate:', certError);
                // Don't fail the whole request if certificate generation fails, just log it
            }
            // ---------------------------

            // Broadcast real-time update if available
            if (global.broadcastUpdate) {
                global.broadcastUpdate(companyId, 'score_updated', {
                    score: parseFloat(carbonScore.score),
                    category: carbonScore.score_category,
                    scoredAt: carbonScore.scored_at
                });
            }

            res.json({
                message: 'Data submitted and scored successfully',
                dataRecord: {
                    id: dataRecord.id,
                    submittedAt: dataRecord.submitted_at
                },
                carbonScore: {
                    id: carbonScore.id,
                    score: parseFloat(carbonScore.score),
                    category: carbonScore.score_category,
                    scoredAt: carbonScore.scored_at
                }
            });

        } catch (error) {
            console.error('Submit data error:', error);
            res.status(500).json({
                error: 'Failed to submit data',
                details: error.message
            });
        }
    }

    /**
     * Get company's latest carbon score
     */
    async getScore(req, res) {
        try {
            const companyId = parseInt(req.params.id);
            if (isNaN(companyId)) {
                return res.status(400).json({ error: 'Invalid company ID' });
            }

            const result = await query(
                `SELECT cs.id, cs.score, cs.score_category, cs.explanation, cs.scored_at,
                c.company_name, c.industry
         FROM carbon_scores cs
         JOIN companies c ON cs.company_id = c.id
         WHERE cs.company_id = $1
         ORDER BY cs.scored_at DESC
         LIMIT 1`,
                [companyId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    error: 'No carbon score found for this company'
                });
            }

            const score = result.rows[0];

            res.json({
                score: {
                    id: score.id,
                    value: parseFloat(score.score),
                    category: score.score_category,
                    explanation: score.explanation,
                    scoredAt: score.scored_at
                },
                company: {
                    name: score.company_name,
                    industry: score.industry
                }
            });

        } catch (error) {
            console.error('Get score error:', error);
            res.status(500).json({
                error: 'Failed to fetch score',
                details: error.message
            });
        }
    }

    /**
     * Get company's score history
     */
    async getScoreHistory(req, res) {
        try {
            const companyId = parseInt(req.params.id);
            if (isNaN(companyId)) {
                return res.status(400).json({ error: 'Invalid company ID' });
            }
            const limit = parseInt(req.query.limit) || 12;

            const result = await query(
                `SELECT id, score, score_category, scored_at
         FROM carbon_scores
         WHERE company_id = $1
         ORDER BY scored_at DESC
         LIMIT $2`,
                [companyId, limit]
            );

            res.json({
                history: result.rows.map(row => ({
                    id: row.id,
                    score: parseFloat(row.score),
                    category: row.score_category,
                    scoredAt: row.scored_at
                }))
            });

        } catch (error) {
            console.error('Get score history error:', error);
            res.status(500).json({
                error: 'Failed to fetch score history',
                details: error.message
            });
        }
    }

    /**
     * Get AI-powered recommendations for improving carbon score
     */
    async getRecommendations(req, res) {
        try {
            const companyId = parseInt(req.params.id);
            if (isNaN(companyId)) {
                return res.status(400).json({ error: 'Invalid company ID' });
            }

            // Get company's latest score and data
            const scoreResult = await query(
                `SELECT cs.score, cs.score_category, cdr.data
                 FROM carbon_scores cs
                 JOIN company_data_records cdr ON cs.data_record_id = cdr.id
                 WHERE cs.company_id = $1
                 ORDER BY cs.scored_at DESC
                 LIMIT 1`,
                [companyId]
            );

            if (scoreResult.rows.length === 0) {
                return res.status(404).json({
                    error: 'No data found. Please submit environmental data first.'
                });
            }

            const { score, score_category, data } = scoreResult.rows[0];
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            // Get AI recommendations
            const recommendations = await geminiService.getRecommendations({
                score: parseFloat(score),
                score_category,
                ...parsedData
            });

            res.json({
                success: true,
                recommendations,
                basedOn: {
                    score: parseFloat(score),
                    category: score_category
                }
            });

        } catch (error) {
            console.error('Get recommendations error:', error);
            res.status(500).json({
                error: 'Failed to get recommendations',
                details: error.message
            });
        }
    }

    /**
     * Fallback scoring when ML service is unavailable
     * Uses same field names as ML service for consistency
     */
    fallbackScoring(data) {
        // Simple rule-based scoring (consistent with ML service field names)
        let score = 50; // Base score

        // Renewable energy contribution (0-25 points)
        const renewablePct = data.renewable_energy_pct || 0;
        score += (renewablePct / 100) * 25;

        // Waste recycling contribution (0-20 points)
        const recyclingPct = data.waste_recycled_pct || 0;
        score += (recyclingPct / 100) * 20;

        // Emissions penalty (0 to -30 points)
        const emissions = data.emissions_co2 || 0;
        if (emissions > 0) {
            const normalizedEmissions = Math.min(emissions / 10000, 1.0);
            score -= normalizedEmissions * 30;
        }

        // Energy efficiency bonus (0-15 points)
        const energy = data.energy_consumption || 0;
        if (energy > 0 && renewablePct > 50) {
            score += 15;
        }

        // Water conservation bonus (0-10 points)
        const water = data.water_usage || 0;
        if (water > 0 && water < 5000) {
            score += 10;
        }

        // Cap score at 0-100
        score = Math.min(100, Math.max(0, score));

        // Determine category
        let category;
        if (score >= 80) category = 'Excellent';
        else if (score >= 65) category = 'Good';
        else if (score >= 50) category = 'Fair';
        else category = 'Poor';

        return {
            score: Math.round(score * 100) / 100,
            category: category,
            explanation: {
                method: 'rule_based_fallback',
                note: 'Score calculated using rule-based fallback (ML service unavailable)',
                top_features: {
                    renewable_energy_pct: { value: renewablePct, impact: 'positive' },
                    waste_recycled_pct: { value: recyclingPct, impact: 'positive' },
                    emissions_co2: { value: emissions, impact: 'negative' }
                }
            },
            confidence: 0.70,
            model_version: 'fallback_v1'
        };
    }

    /**
     * Get score category from numeric score
     */
    getScoreCategory(score) {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    }
}

module.exports = new CompanyController();
