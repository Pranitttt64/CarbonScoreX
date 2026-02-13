/**
 * Government Routes
 */
const express = require('express');
const router = express.Router();
const govController = require('../controllers/govController');
const { authenticateToken, requireGovernment } = require('../middleware/auth');

// All routes require government authentication
router.use(authenticateToken);
router.use(requireGovernment);

router.get('/dashboard', govController.getDashboard);
router.get('/companies', govController.getAllCompaniesWithScores);
router.get('/individuals', govController.getAllIndividualsWithCredits);
router.get('/industry-analysis', govController.getIndustryAnalysis);
router.get('/score-distribution', govController.getScoreDistribution);

module.exports = router;