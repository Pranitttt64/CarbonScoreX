/**
 * Government Controller
 * Handles government dashboard and analytics
 */
const { query } = require('../config/database');

class GovController {
  /**
   * Get dashboard statistics
   */
  async getDashboard(req, res) {
    try {
      // Aggregate statistics
      const stats = await this.getStatistics();
      const leaderboard = await this.getLeaderboard();
      const recentActivity = await this.getRecentActivity();

      res.json({
        statistics: stats,
        leaderboard,
        recentActivity
      });

    } catch (error) {
      console.error('Get dashboard error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard data',
        details: error.message
      });
    }
  }

  /**
   * Get aggregate statistics
   */
  async getStatistics() {
    const result = await query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_companies,
        COUNT(DISTINCT CASE WHEN cs.score >= 80 THEN c.id END) as excellent_companies,
        COUNT(DISTINCT CASE WHEN cs.score < 50 THEN c.id END) as poor_companies,
        AVG(cs.score) as average_score,
        SUM(t.amount) FILTER (WHERE t.transaction_type = 'subsidy') as total_subsidies,
        SUM(t.amount) FILTER (WHERE t.transaction_type = 'tariff') as total_tariffs,
        COUNT(DISTINCT cert.id) FILTER (WHERE cert.status = 'active') as active_certificates
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT score FROM carbon_scores
        WHERE company_id = c.id
        ORDER BY scored_at DESC
        LIMIT 1
      ) cs ON true
      LEFT JOIN transactions t ON t.from_user_id = (SELECT user_id FROM companies WHERE id = c.id)
        OR t.to_user_id = (SELECT user_id FROM companies WHERE id = c.id)
      LEFT JOIN certificates cert ON cert.company_id = c.id
    `);

    return result.rows[0];
  }

  /**
   * Get company leaderboard
   */
  async getLeaderboard() {
    const result = await query(`
      SELECT c.id, c.company_name, c.industry,
             cs.score, cs.score_category, cs.scored_at,
             cert.certificate_id
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT * FROM carbon_scores
        WHERE company_id = c.id
        ORDER BY scored_at DESC
        LIMIT 1
      ) cs ON true
      LEFT JOIN certificates cert ON cs.id = cert.score_id AND cert.status = 'active'
      WHERE cs.score IS NOT NULL
      ORDER BY cs.score DESC
      LIMIT 20
    `);

    return result.rows;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity() {
    const result = await query(`
      SELECT 
        'score' as activity_type,
        c.company_name,
        cs.score,
        cs.score_category,
        cs.scored_at as timestamp
      FROM carbon_scores cs
      JOIN companies c ON cs.company_id = c.id
      ORDER BY cs.scored_at DESC
      LIMIT 10
    `);

    return result.rows;
  }

  /**
   * Get industry analysis
   */
  async getIndustryAnalysis(req, res) {
    try {
      const result = await query(`
        SELECT 
          c.industry,
          COUNT(c.id) as company_count,
          AVG(cs.score) as avg_score,
          MAX(cs.score) as max_score,
          MIN(cs.score) as min_score
        FROM companies c
        LEFT JOIN LATERAL (
          SELECT score FROM carbon_scores
          WHERE company_id = c.id
          ORDER BY scored_at DESC
          LIMIT 1
        ) cs ON true
        WHERE c.industry IS NOT NULL AND cs.score IS NOT NULL
        GROUP BY c.industry
        ORDER BY avg_score DESC
      `);

      res.json({ industries: result.rows });

    } catch (error) {
      console.error('Get industry analysis error:', error);
      res.status(500).json({
        error: 'Failed to fetch industry analysis',
        details: error.message
      });
    }
  }

  /**
   * Get score distribution
   */
  async getScoreDistribution(req, res) {
    try {
      const result = await query(`
        SELECT 
          CASE 
            WHEN cs.score >= 80 THEN 'Excellent'
            WHEN cs.score >= 65 THEN 'Good'
            WHEN cs.score >= 50 THEN 'Fair'
            ELSE 'Poor'
          END as category,
          COUNT(*) as count
        FROM companies c
        JOIN LATERAL (
          SELECT score FROM carbon_scores
          WHERE company_id = c.id
          ORDER BY scored_at DESC
          LIMIT 1
        ) cs ON true
        GROUP BY category
        ORDER BY 
          CASE category
            WHEN 'Excellent' THEN 1
            WHEN 'Good' THEN 2
            WHEN 'Fair' THEN 3
            WHEN 'Poor' THEN 4
          END
      `);

      res.json({ distribution: result.rows });

    } catch (error) {
      console.error('Get score distribution error:', error);
      res.status(500).json({
        error: 'Failed to fetch score distribution',
        details: error.message
      });
    }
  }

  /**
   * Get all companies with scores (for company list view)
   * Supports search, sorting, and pagination
   */
  async getAllCompaniesWithScores(req, res) {
    try {
      const { search = '', sortOrder = 'desc', page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Build search condition
      const searchCondition = search
        ? `AND LOWER(c.company_name) LIKE LOWER($1)`
        : '';
      const searchParam = search ? [`%${search}%`] : [];

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM companies c
        LEFT JOIN LATERAL (
          SELECT score FROM carbon_scores
          WHERE company_id = c.id
          ORDER BY scored_at DESC
          LIMIT 1
        ) cs ON true
        WHERE cs.score IS NOT NULL ${searchCondition}
      `;
      const countResult = await query(countQuery, searchParam);
      const total = parseInt(countResult.rows[0].total);

      // Get companies with scores
      const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
      const companiesQuery = `
        SELECT 
          c.id,
          c.company_name,
          c.industry,
          cs.score,
          CASE 
            WHEN cs.score >= 80 THEN 'Excellent'
            WHEN cs.score >= 65 THEN 'Good'
            WHEN cs.score >= 50 THEN 'Fair'
            ELSE 'Poor'
          END as score_category,
          cs.scored_at,
          cert.certificate_id,
          cert.status as certificate_status
        FROM companies c
        LEFT JOIN LATERAL (
          SELECT id, score, scored_at FROM carbon_scores
          WHERE company_id = c.id
          ORDER BY scored_at DESC
          LIMIT 1
        ) cs ON true
        LEFT JOIN certificates cert ON cs.id = cert.score_id AND cert.status = 'active'
        WHERE cs.score IS NOT NULL ${searchCondition}
        ORDER BY cs.score ${sortDirection}
        LIMIT $${searchParam.length + 1} OFFSET $${searchParam.length + 2}
      `;

      const companiesResult = await query(
        companiesQuery,
        [...searchParam, parseInt(limit), offset]
      );

      res.json({
        companies: companiesResult.rows,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      });

    } catch (error) {
      console.error('Get all companies error:', error);
      res.status(500).json({
        error: 'Failed to fetch companies',
        details: error.message
      });
    }
  }

  /**
   * Get all individuals with their credit balances
   * Supports search and sorting
   */
  async getAllIndividualsWithCredits(req, res) {
    try {
      const { search = '', sortOrder = 'desc' } = req.query;

      // Build search condition
      const searchCondition = search
        ? `AND LOWER(u.full_name) LIKE LOWER($1)`
        : '';
      const searchParam = search ? [`%${search}%`] : [];

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        LEFT JOIN credits cr ON u.id = cr.owner_id
        WHERE u.user_type = 'individual' ${searchCondition}
      `;
      const countResult = await query(countQuery, searchParam);
      const total = parseInt(countResult.rows[0].total);

      // Get individuals with credits
      const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
      const individualsQuery = `
        SELECT 
          u.id,
          u.full_name,
          u.email,
          u.created_at as member_since,
          COALESCE(cr.amount, 0) as credit_balance
        FROM users u
        LEFT JOIN credits cr ON u.id = cr.owner_id
        WHERE u.user_type = 'individual' ${searchCondition}
        ORDER BY COALESCE(cr.amount, 0) ${sortDirection}
      `;

      const individualsResult = await query(individualsQuery, searchParam);

      res.json({
        individuals: individualsResult.rows,
        total
      });

    } catch (error) {
      console.error('Get all individuals error:', error);
      res.status(500).json({
        error: 'Failed to fetch individuals',
        details: error.message
      });
    }
  }
}

module.exports = new GovController();