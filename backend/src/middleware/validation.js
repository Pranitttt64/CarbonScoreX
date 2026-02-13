/**
 * Validation Middleware
 * Input validation for API requests
 */
const { body, param, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

/**
 * Registration validation
 */
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('userType').isIn(['company', 'individual', 'government']),
  body('fullName').trim().isLength({ min: 2 }),
  handleValidationErrors
];

/**
 * Login validation
 */
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors
];

/**
 * Company data validation
 */
const validateCompanyData = [
  body('energy_consumption').optional().isFloat({ min: 0 }),
  body('renewable_energy_pct').optional().isFloat({ min: 0, max: 100 }),
  body('waste_recycled_pct').optional().isFloat({ min: 0, max: 100 }),
  body('emissions_co2').optional().isFloat({ min: 0 }),
  body('water_usage').optional().isFloat({ min: 0 }),
  handleValidationErrors
];

/**
 * Credit transfer validation
 */
const validateCreditTransfer = [
  body('toUserId').isInt({ min: 1 }),
  body('amount').isFloat({ min: 0.01 }),
  body('description').optional().trim(),
  handleValidationErrors
];

/**
 * Tender creation validation
 */
const validateTenderCreation = [
  body('title').trim().isLength({ min: 5, max: 255 }),
  body('description').optional().trim(),
  body('minScore').isFloat({ min: 0, max: 100 }),
  body('budget').optional().isFloat({ min: 0 }),
  body('deadline').isISO8601(),
  handleValidationErrors
];

/**
 * Certificate ID validation
 */
const validateCertificateId = [
  param('certificateId').matches(/^CERT-CSX-\d{4}-[A-Z0-9]+$/),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateCompanyData,
  validateCreditTransfer,
  validateTenderCreation,
  validateCertificateId,
  handleValidationErrors
};