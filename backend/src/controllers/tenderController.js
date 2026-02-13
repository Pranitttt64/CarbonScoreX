/**
 * Tender Controller
 * Handles government tenders and company applications
 */
const { query, transaction } = require('../config/database');

class TenderController {
  /**
   * Get all active tenders
   */
  async getTenders(req, res) {
    try {
      const result = await query(
        `SELECT t.*, u.full_name as created_by_name
         FROM tenders t
         JOIN users u ON t.created_by = u.id
         WHERE t.status = 'open' AND t.deadline > CURRENT_TIMESTAMP
         ORDER BY t.deadline ASC`
      );

      res.json({ tenders: result.rows });

    } catch (error) {
      console.error('Get tenders error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tenders',
        details: error.message
      });
    }
  }

  /**
   * Create tender (government only)
   */
  async createTender(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, minScore, budget, deadline } = req.body;

      // Validate input
      if (!title || !minScore || !deadline) {
        return res.status(400).json({ 
          error: 'Missing required fields' 
        });
      }

      const result = await query(
        `INSERT INTO tenders 
         (title, description, min_score, budget, deadline, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [title, description, minScore, budget, deadline, userId]
      );

      res.status(201).json({
        message: 'Tender created successfully',
        tender: result.rows[0]
      });

    } catch (error) {
      console.error('Create tender error:', error);
      res.status(500).json({ 
        error: 'Failed to create tender',
        details: error.message
      });
    }
  }

  /**
   * Apply for tender (company only)
   */
  async applyForTender(req, res) {
    try {
      const tenderId = req.params.id;
      const userId = req.user.userId;
      const { applicationData } = req.body;

      // Get company info
      const companyResult = await query(
        'SELECT id FROM companies WHERE user_id = $1',
        [userId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const companyId = companyResult.rows[0].id;

      // Check if tender exists and is open
      const tenderCheck = await query(
        'SELECT min_score, deadline, status FROM tenders WHERE id = $1',
        [tenderId]
      );

      if (tenderCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Tender not found' });
      }

      const tender = tenderCheck.rows[0];

      if (tender.status !== 'open') {
        return res.status(400).json({ error: 'Tender is not open' });
      }

      if (new Date(tender.deadline) < new Date()) {
        return res.status(400).json({ error: 'Tender deadline has passed' });
      }

      // Check company's carbon score
      const scoreCheck = await query(
        `SELECT score FROM carbon_scores 
         WHERE company_id = $1 
         ORDER BY scored_at DESC 
         LIMIT 1`,
        [companyId]
      );

      if (scoreCheck.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Company must have a carbon score to apply' 
        });
      }

      const companyScore = parseFloat(scoreCheck.rows[0].score);

      if (companyScore < tender.min_score) {
        return res.status(400).json({ 
          error: `Company score (${companyScore}) is below minimum requirement (${tender.min_score})` 
        });
      }

      // Check if already applied
      const existingApp = await query(
        'SELECT id FROM tender_applications WHERE tender_id = $1 AND company_id = $2',
        [tenderId, companyId]
      );

      if (existingApp.rows.length > 0) {
        return res.status(409).json({ error: 'Already applied to this tender' });
      }

      // Submit application
      const result = await query(
        `INSERT INTO tender_applications 
         (tender_id, company_id, application_data, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenderId, companyId, JSON.stringify(applicationData), 'pending']
      );

      res.status(201).json({
        message: 'Application submitted successfully',
        application: result.rows[0]
      });

    } catch (error) {
      console.error('Apply for tender error:', error);
      res.status(500).json({ 
        error: 'Failed to submit application',
        details: error.message
      });
    }
  }

  /**
   * Get company's tender applications
   */
  async getCompanyApplications(req, res) {
    try {
      const userId = req.user.userId;

      const result = await query(
        `SELECT ta.*, t.title as tender_title, t.budget, t.deadline
         FROM tender_applications ta
         JOIN tenders t ON ta.tender_id = t.id
         JOIN companies c ON ta.company_id = c.id
         WHERE c.user_id = $1
         ORDER BY ta.applied_at DESC`,
        [userId]
      );

      res.json({ applications: result.rows });

    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch applications',
        details: error.message
      });
    }
  }

  /**
   * Get tender applications (government only)
   */
  async getTenderApplications(req, res) {
    try {
      const tenderId = req.params.id;

      const result = await query(
        `SELECT ta.*, c.company_name, cs.score as company_score
         FROM tender_applications ta
         JOIN companies c ON ta.company_id = c.id
         LEFT JOIN LATERAL (
           SELECT score FROM carbon_scores
           WHERE company_id = c.id
           ORDER BY scored_at DESC
           LIMIT 1
         ) cs ON true
         WHERE ta.tender_id = $1
         ORDER BY cs.score DESC NULLS LAST`,
        [tenderId]
      );

      res.json({ applications: result.rows });

    } catch (error) {
      console.error('Get tender applications error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch applications',
        details: error.message
      });
    }
  }
}

module.exports = new TenderController();