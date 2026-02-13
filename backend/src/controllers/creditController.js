/**
 * Credit Controller
 * Handles carbon credit trading and transfers
 */
const { query, transaction } = require('../config/database');

class CreditController {
  /**
   * Get user's credit balance
   */
  async getBalance(req, res) {
    try {
      const userId = req.user.userId;

      const result = await query(
        'SELECT amount FROM credits WHERE owner_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.json({ balance: 0 });
      }

      res.json({ balance: parseFloat(result.rows[0].amount) });

    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({
        error: 'Failed to fetch balance',
        details: error.message
      });
    }
  }

  /**
   * Transfer credits between users
   */
  async transferCredits(req, res) {
    try {
      const fromUserId = req.user.userId;
      const { toUserId, amount, description } = req.body;

      // Validate input
      if (!toUserId || !amount || amount <= 0) {
        return res.status(400).json({
          error: 'Invalid transfer parameters'
        });
      }

      // Perform transfer in transaction
      const result = await transaction(async (client) => {
        // Check sender balance
        const balanceCheck = await client.query(
          'SELECT amount FROM credits WHERE owner_id = $1 FOR UPDATE',
          [fromUserId]
        );

        if (balanceCheck.rows.length === 0 ||
          parseFloat(balanceCheck.rows[0].amount) < amount) {
          throw new Error('Insufficient balance');
        }

        // Deduct from sender
        await client.query(
          'UPDATE credits SET amount = amount - $1 WHERE owner_id = $2',
          [amount, fromUserId]
        );

        // Add to receiver (or create if doesn't exist)
        const receiverCheck = await client.query(
          'SELECT owner_id FROM credits WHERE owner_id = $1',
          [toUserId]
        );

        if (receiverCheck.rows.length === 0) {
          await client.query(
            'INSERT INTO credits (owner_id, amount) VALUES ($1, $2)',
            [toUserId, amount]
          );
        } else {
          await client.query(
            'UPDATE credits SET amount = amount + $1 WHERE owner_id = $2',
            [amount, toUserId]
          );
        }

        // Record transaction
        const txn = await client.query(
          `INSERT INTO transactions 
           (from_user_id, to_user_id, amount, transaction_type, description)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, created_at`,
          [fromUserId, toUserId, amount, 'transfer', description || 'Credit transfer']
        );

        return txn.rows[0];
      });

      res.json({
        message: 'Transfer successful',
        transaction: result
      });

    } catch (error) {
      console.error('Transfer error:', error);
      res.status(500).json({
        error: error.message || 'Transfer failed'
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req, res) {
    try {
      const userId = req.user.userId;

      const result = await query(
        `SELECT t.*, 
                u_from.full_name as from_name,
                u_to.full_name as to_name
         FROM transactions t
         LEFT JOIN users u_from ON t.from_user_id = u_from.id
         LEFT JOIN users u_to ON t.to_user_id = u_to.id
         WHERE t.from_user_id = $1 OR t.to_user_id = $1
         ORDER BY t.created_at DESC
         LIMIT 100`,
        [userId]
      );

      res.json({ transactions: result.rows });

    } catch (error) {
      console.error('Get transaction history error:', error);
      res.status(500).json({
        error: 'Failed to fetch transactions',
        details: error.message
      });
    }
  }

  /**
   * Get available credits for sale (from individuals)
   */
  async getMarketplace(req, res) {
    try {
      const result = await query(
        `SELECT u.id as seller_id, u.full_name as seller_name,
                cr.amount, u.created_at as member_since
         FROM users u
         JOIN credits cr ON u.id = cr.owner_id
         WHERE u.user_type = 'individual' AND cr.amount > 0
         ORDER BY cr.amount DESC`
      );

      res.json({ listings: result.rows });

    } catch (error) {
      console.error('Get marketplace error:', error);
      res.status(500).json({
        error: 'Failed to fetch marketplace',
        details: error.message
      });
    }
  }

  /**
   * Create a sell listing (individual offers credits for sale)
   */
  async createSellListing(req, res) {
    try {
      const userId = req.user.userId;
      const { amount, pricePerCredit = 1.0 } = req.body;

      // Validate input
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Check user type and balance
      const userCheck = await query(
        `SELECT u.user_type, COALESCE(c.amount, 0) as balance
         FROM users u
         LEFT JOIN credits c ON u.id = c.owner_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userCheck.rows[0];
      if (user.user_type !== 'individual') {
        return res.status(403).json({ error: 'Only individuals can sell credits' });
      }

      // Check existing listings + requested amount don't exceed balance
      const existingListings = await query(
        `SELECT COALESCE(SUM(amount), 0) as listed_amount
         FROM credit_listings
         WHERE seller_id = $1 AND status = 'active'`,
        [userId]
      );

      const listedAmount = parseFloat(existingListings.rows[0].listed_amount || 0);
      const availableToList = parseFloat(user.balance) - listedAmount;

      if (amount > availableToList) {
        return res.status(400).json({
          error: 'Insufficient available balance',
          available: availableToList
        });
      }

      // Create listing
      const result = await query(
        `INSERT INTO credit_listings (seller_id, amount, price_per_credit)
         VALUES ($1, $2, $3)
         RETURNING id, amount, price_per_credit, created_at`,
        [userId, amount, pricePerCredit]
      );

      res.status(201).json({
        message: 'Listing created successfully',
        listing: result.rows[0]
      });

    } catch (error) {
      console.error('Create sell listing error:', error);
      res.status(500).json({
        error: 'Failed to create listing',
        details: error.message
      });
    }
  }

  /**
   * Get all active sell listings
   */
  async getSellListings(req, res) {
    try {
      const result = await query(
        `SELECT cl.id, cl.amount, cl.price_per_credit, cl.created_at,
                u.id as seller_id, u.full_name as seller_name
         FROM credit_listings cl
         JOIN users u ON cl.seller_id = u.id
         WHERE cl.status = 'active' AND cl.amount > 0
         ORDER BY cl.created_at DESC`
      );

      res.json({ listings: result.rows });

    } catch (error) {
      console.error('Get sell listings error:', error);
      res.status(500).json({
        error: 'Failed to fetch listings',
        details: error.message
      });
    }
  }

  /**
   * Get current user's listings
   */
  async getMyListings(req, res) {
    try {
      const userId = req.user.userId;

      const result = await query(
        `SELECT id, amount, price_per_credit, status, created_at
         FROM credit_listings
         WHERE seller_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({ listings: result.rows });

    } catch (error) {
      console.error('Get my listings error:', error);
      res.status(500).json({
        error: 'Failed to fetch your listings',
        details: error.message
      });
    }
  }

  /**
   * Cancel a sell listing
   */
  async cancelSellListing(req, res) {
    try {
      const userId = req.user.userId;
      const listingId = req.params.id;

      // Check listing exists and belongs to user
      const listingCheck = await query(
        `SELECT id, seller_id, status FROM credit_listings WHERE id = $1`,
        [listingId]
      );

      if (listingCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      const listing = listingCheck.rows[0];
      if (listing.seller_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to cancel this listing' });
      }

      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'Listing is not active' });
      }

      // Cancel the listing
      await query(
        `UPDATE credit_listings SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [listingId]
      );

      res.json({ message: 'Listing cancelled successfully' });

    } catch (error) {
      console.error('Cancel listing error:', error);
      res.status(500).json({
        error: 'Failed to cancel listing',
        details: error.message
      });
    }
  }

  /**
   * Purchase credits from a listing
   */
  async purchaseCredits(req, res) {
    try {
      const buyerId = req.user.userId;
      const { listingId, amount } = req.body;

      // Validate input
      if (!listingId || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid purchase parameters' });
      }

      // Check buyer is a company
      const buyerCheck = await query(
        'SELECT user_type FROM users WHERE id = $1',
        [buyerId]
      );

      if (buyerCheck.rows.length === 0 || buyerCheck.rows[0].user_type !== 'company') {
        return res.status(403).json({ error: 'Only companies can purchase credits' });
      }

      // Perform purchase in transaction
      const result = await transaction(async (client) => {
        // Get listing with lock
        const listingResult = await client.query(
          `SELECT cl.*, u.full_name as seller_name
           FROM credit_listings cl
           JOIN users u ON cl.seller_id = u.id
           WHERE cl.id = $1 AND cl.status = 'active'
           FOR UPDATE`,
          [listingId]
        );

        if (listingResult.rows.length === 0) {
          throw new Error('Listing not found or not active');
        }

        const listing = listingResult.rows[0];

        if (amount > parseFloat(listing.amount)) {
          throw new Error('Requested amount exceeds available credits in listing');
        }

        const sellerId = listing.seller_id;

        // Verify seller has enough credits
        const sellerBalance = await client.query(
          'SELECT amount FROM credits WHERE owner_id = $1 FOR UPDATE',
          [sellerId]
        );

        if (sellerBalance.rows.length === 0 ||
          parseFloat(sellerBalance.rows[0].amount) < amount) {
          throw new Error('Seller has insufficient credits');
        }

        // Deduct from seller
        await client.query(
          'UPDATE credits SET amount = amount - $1 WHERE owner_id = $2',
          [amount, sellerId]
        );

        // Add to buyer (or create if doesn't exist)
        const buyerBalance = await client.query(
          'SELECT owner_id FROM credits WHERE owner_id = $1',
          [buyerId]
        );

        if (buyerBalance.rows.length === 0) {
          await client.query(
            'INSERT INTO credits (owner_id, amount) VALUES ($1, $2)',
            [buyerId, amount]
          );
        } else {
          await client.query(
            'UPDATE credits SET amount = amount + $1 WHERE owner_id = $2',
            [amount, buyerId]
          );
        }

        // Update listing amount or mark as sold
        const remainingAmount = parseFloat(listing.amount) - amount;
        if (remainingAmount <= 0) {
          await client.query(
            `UPDATE credit_listings SET amount = 0, status = 'sold', updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [listingId]
          );
        } else {
          await client.query(
            `UPDATE credit_listings SET amount = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [remainingAmount, listingId]
          );
        }

        // Record transaction
        const txn = await client.query(
          `INSERT INTO transactions 
           (from_user_id, to_user_id, amount, transaction_type, description)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, created_at`,
          [sellerId, buyerId, amount, 'purchase', `Credit purchase from ${listing.seller_name}`]
        );

        return {
          transactionId: txn.rows[0].id,
          amount,
          sellerName: listing.seller_name
        };
      });

      res.json({
        message: 'Purchase successful',
        transaction: result
      });

    } catch (error) {
      console.error('Purchase credits error:', error);
      res.status(500).json({
        error: error.message || 'Purchase failed'
      });
    }
  }
}

module.exports = new CreditController();