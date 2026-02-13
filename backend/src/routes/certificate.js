/**
 * Certificate Routes
 */
const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');
const { authenticateToken, requireGovernment } = require('../middleware/auth');

// Public verification endpoint
router.get('/:certificateId', certificateController.verifyCertificate);

// Protected routes
router.get('/download/:id', authenticateToken, certificateController.downloadCertificate);
router.get('/company/:companyId', authenticateToken, certificateController.getCompanyCertificates);
router.get('/audit/log', authenticateToken, requireGovernment, certificateController.getAuditLog);

module.exports = router;