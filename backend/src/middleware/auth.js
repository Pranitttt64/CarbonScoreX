/**
 * Authentication Middleware
 * Validates JWT tokens and protects routes
 */
const jwt = require('jsonwebtoken');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

/**
 * Check if user is a company
 */
const requireCompany = (req, res, next) => {
  if (req.user.userType !== 'company') {
    return res.status(403).json({ 
      error: 'Access denied - company account required' 
    });
  }
  next();
};

/**
 * Check if user is government
 */
const requireGovernment = (req, res, next) => {
  if (req.user.userType !== 'government') {
    return res.status(403).json({ 
      error: 'Access denied - government account required' 
    });
  }
  next();
};

/**
 * Check if user is an individual
 */
const requireIndividual = (req, res, next) => {
  if (req.user.userType !== 'individual') {
    return res.status(403).json({ 
      error: 'Access denied - individual account required' 
    });
  }
  next();
};

/**
 * Optional authentication - attach user if token present
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.user = user;
    } catch (error) {
      // Token invalid but don't block request
      console.log('Invalid optional token');
    }
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireCompany,
  requireGovernment,
  requireIndividual,
  optionalAuth
};