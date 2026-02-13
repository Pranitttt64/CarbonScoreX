/**
 * Company Routes
 */
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticateToken, requireCompany } = require('../middleware/auth');

// Get all companies (public or authenticated)
router.get('/', companyController.getAllCompanies);

// Protected routes
router.post('/:id/data', authenticateToken, requireCompany, companyController.submitData);
router.get('/:id/score', authenticateToken, companyController.getScore);
router.get('/:id/score-history', authenticateToken, companyController.getScoreHistory);
router.get('/:id/recommendations', authenticateToken, companyController.getRecommendations);

module.exports = router;