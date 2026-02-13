/**
 * Certificate Controller
 * Handles certificate download and verification
 */
const path = require('path');
const { query } = require('../config/database');
const certificateGenerator = require('../utils/pdfGenerator');

class CertificateController {
  /**
   * Download certificate PDF
   */
  async downloadCertificate(req, res) {
    try {
      const certificateId = req.params.id;

      // Get certificate record
      const result = await query(
        `SELECT cert.*, c.company_name, cs.score, cs.score_category
         FROM certificates cert
         JOIN companies c ON cert.company_id = c.id
         JOIN carbon_scores cs ON cert.score_id = cs.id
         WHERE cert.certificate_id = $1`,
        [certificateId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      const cert = result.rows[0];

      // Check if certificate is valid
      if (cert.status !== 'active') {
        return res.status(410).json({ 
          error: 'Certificate is no longer valid',
          status: cert.status
        });
      }

      // Check expiration
      if (new Date(cert.valid_until) < new Date()) {
        return res.status(410).json({ 
          error: 'Certificate has expired'
        });
      }

      // Send PDF file
      const filePath = path.join(
        certificateGenerator.certificatesDir,
        cert.pdf_path
      );

      res.download(filePath, `${certificateId}.pdf`, (err) => {
        if (err) {
          console.error('Certificate download error:', err);
          res.status(500).json({ 
            error: 'Failed to download certificate' 
          });
        }
      });

    } catch (error) {
      console.error('Download certificate error:', error);
      res.status(500).json({ 
        error: 'Failed to process request',
        details: error.message
      });
    }
  }

  /**
   * Verify certificate authenticity (public endpoint)
   */
  async verifyCertificate(req, res) {
    try {
      const certificateId = req.params.certificateId;

      // Get certificate with company data
      const result = await query(
        `SELECT cert.certificate_id, cert.issue_date, cert.valid_until, 
                cert.status, cert.signature_hash,
                c.company_name, c.registration_number,
                cs.score, cs.score_category, cs.scored_at
         FROM certificates cert
         JOIN companies c ON cert.company_id = c.id
         JOIN carbon_scores cs ON cert.score_id = cs.id
         WHERE cert.certificate_id = $1`,
        [certificateId]
      );

      if (result.rows.length === 0) {
        return res.json({
          valid: false,
          message: 'Certificate not found',
          certificateId
        });
      }

      const cert = result.rows[0];

      // Verify signature
      const certData = {
        certificateId: cert.certificate_id,
        companyName: cert.company_name,
        score: parseFloat(cert.score),
        issueDate: cert.issue_date
      };

      const isSignatureValid = certificateGenerator.verifySignature(
        certData,
        cert.signature_hash
      );

      if (!isSignatureValid) {
        return res.json({
          valid: false,
          message: 'Certificate signature invalid - possible tampering detected',
          certificateId
        });
      }

      // Check status
      if (cert.status !== 'active') {
        return res.json({
          valid: false,
          message: `Certificate is ${cert.status}`,
          certificateId,
          details: {
            issueDate: cert.issue_date,
            validUntil: cert.valid_until,
            status: cert.status
          }
        });
      }

      // Check expiration
      const now = new Date();
      const validUntil = new Date(cert.valid_until);

      if (validUntil < now) {
        return res.json({
          valid: false,
          message: 'Certificate has expired',
          certificateId,
          details: {
            expiredOn: cert.valid_until
          }
        });
      }

      // Certificate is valid
      res.json({
        valid: true,
        message: 'Certificate is authentic and valid',
        certificateId: cert.certificate_id,
        details: {
          companyName: cert.company_name,
          registrationNumber: cert.registration_number,
          score: parseFloat(cert.score),
          category: cert.score_category,
          issueDate: cert.issue_date,
          validUntil: cert.valid_until,
          scoredAt: cert.scored_at,
          status: cert.status
        }
      });

    } catch (error) {
      console.error('Verify certificate error:', error);
      res.status(500).json({ 
        error: 'Verification failed',
        details: error.message
      });
    }
  }

  /**
   * Get company's certificates
   */
  async getCompanyCertificates(req, res) {
    try {
      const companyId = req.params.companyId;

      const result = await query(
        `SELECT cert.certificate_id, cert.issue_date, cert.valid_until,
                cert.status, cert.verification_url,
                cs.score, cs.score_category
         FROM certificates cert
         JOIN carbon_scores cs ON cert.score_id = cs.id
         WHERE cert.company_id = $1
         ORDER BY cert.issue_date DESC`,
        [companyId]
      );

      res.json({ certificates: result.rows });

    } catch (error) {
      console.error('Get certificates error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch certificates',
        details: error.message
      });
    }
  }

  /**
   * Get certificate audit log (government only)
   */
  async getAuditLog(req, res) {
    try {
      // Check if user is government
      if (req.user.userType !== 'government') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await query(
        `SELECT cert.certificate_id, cert.issue_date, cert.status,
                cert.valid_until, c.company_name, cs.score, cs.score_category
         FROM certificates cert
         JOIN companies c ON cert.company_id = c.id
         JOIN carbon_scores cs ON cert.score_id = cs.id
         ORDER BY cert.created_at DESC
         LIMIT 100`
      );

      res.json({ auditLog: result.rows });

    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch audit log',
        details: error.message
      });
    }
  }
}

module.exports = new CertificateController();