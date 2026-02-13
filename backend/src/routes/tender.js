/**
 * Tender Routes
 */
const express = require('express');
const router = express.Router();
const tenderController = require('../controllers/tenderController');
const { authenticateToken, requireGovernment, requireCompany } = require('../middleware/auth');

// Public/authenticated routes
router.get('/', authenticateToken, tenderController.getTenders);

// Company routes
router.post('/:id/apply', authenticateToken, requireCompany, tenderController.applyForTender);
router.get('/my-applications', authenticateToken, requireCompany, tenderController.getCompanyApplications);

// Government routes
router.post('/', authenticateToken, requireGovernment, tenderController.createTender);
router.get('/:id/applications', authenticateToken, requireGovernment, tenderController.getTenderApplications);

module.exports = router;