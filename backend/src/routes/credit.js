/**
 * Credit Trading Routes
 */
const express = require('express');
const router = express.Router();
const creditController = require('../controllers/creditController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

router.get('/balance', creditController.getBalance);
router.post('/transfer', creditController.transferCredits);
router.get('/transactions', creditController.getTransactionHistory);
router.get('/marketplace', creditController.getMarketplace);

// Sell listings
router.post('/listings', creditController.createSellListing);
router.get('/listings', creditController.getSellListings);
router.get('/my-listings', creditController.getMyListings);
router.delete('/listings/:id', creditController.cancelSellListing);

// Purchase
router.post('/purchase', creditController.purchaseCredits);

module.exports = router;