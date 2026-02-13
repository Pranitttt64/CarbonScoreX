/**
 * PDF Certificate Generator for CarbonScoreX
 * Generates verifiable digital certificates with QR codes
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');

class CertificateGenerator {
  constructor() {
    this.certificatesDir = process.env.CERTIFICATES_DIR || './certificates';
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    this.signatureSecret = process.env.CERT_SIGNATURE_SECRET || 'default-secret-change-in-production';
    
    // Ensure certificates directory exists
    if (!fs.existsSync(this.certificatesDir)) {
      fs.mkdirSync(this.certificatesDir, { recursive: true });
    }
    
    // Warn if using default secret
    if (!process.env.CERT_SIGNATURE_SECRET) {
      console.warn('⚠️  WARNING: Using default certificate signature secret. Set CERT_SIGNATURE_SECRET in production!');
    }
  }

  /**
   * Generate unique certificate ID
   */
  generateCertificateId() {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `CERT-CSX-${new Date().getFullYear()}-${random}`;
  }

  /**
   * Create cryptographic signature for certificate
   */
  createSignature(certificateData) {
    const dataString = JSON.stringify({
      certificateId: certificateData.certificateId,
      companyName: certificateData.companyName,
      score: certificateData.score,
      issueDate: certificateData.issueDate
    });
    
    return crypto
      .createHmac('sha256', this.signatureSecret)
      .update(dataString)
      .digest('hex');
  }

  /**
   * Verify certificate signature
   */
  verifySignature(certificateData, signature) {
    const expectedSignature = this.createSignature(certificateData);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Generate QR code for certificate verification
   */
  async generateQRCode(verificationUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('QR code generation error:', error);
      throw error;
    }
  }

  /**
   * Get score color based on category
   */
  getScoreColor(category) {
    const colors = {
      'Excellent': '#10b981', // Green
      'Good': '#3b82f6',      // Blue
      'Fair': '#f59e0b',      // Orange
      'Poor': '#ef4444'       // Red
    };
    return colors[category] || '#6b7280';
  }

  /**
   * Generate PDF certificate
   */
  async generateCertificate(certificateData) {
    const {
      certificateId,
      companyName,
      score,
      category,
      issueDate,
      validUntil,
      registrationNumber
    } = certificateData;

    // Create verification URL
    const verificationUrl = `${this.baseUrl}/verify/${certificateId}`;
    
    // Generate QR code
    const qrCodeDataUrl = await this.generateQRCode(verificationUrl);
    
    // Create signature
    const signature = this.createSignature(certificateData);
    
    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const fileName = `${certificateId}.pdf`;
    const filePath = path.join(this.certificatesDir, fileName);
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header - Logo and Title
    doc.fontSize(28)
       .fillColor('#1f2937')
       .text('CarbonScoreX', { align: 'center' });
    
    doc.fontSize(14)
       .fillColor('#6b7280')
       .text('Digital Carbon Certificate', { align: 'center' });
    
    doc.moveDown(2);

    // Certificate Border
    const borderColor = this.getScoreColor(category);
    doc.rect(40, 140, doc.page.width - 80, doc.page.height - 240)
       .lineWidth(3)
       .stroke(borderColor);

    // Certificate ID
    doc.fontSize(10)
       .fillColor('#6b7280')
       .text(`Certificate ID: ${certificateId}`, 60, 160);

    doc.moveDown(2);

    // Company Name
    doc.fontSize(24)
       .fillColor('#1f2937')
       .text(companyName, { align: 'center' });

    doc.moveDown(1);

    // Certificate Statement
    doc.fontSize(12)
       .fillColor('#4b5563')
       .text('This certificate verifies that the above organization has achieved a', { align: 'center' });

    doc.moveDown(1);

    // Score Display - Large centered
    doc.fontSize(60)
       .fillColor(borderColor)
       .text(score.toFixed(1), { align: 'center' });

    doc.fontSize(14)
       .fillColor('#6b7280')
       .text('Carbon Score', { align: 'center' });

    doc.moveDown(0.5);

    // Category Badge
    doc.fontSize(18)
       .fillColor(borderColor)
       .text(`${category} Performance`, { align: 'center' });

    doc.moveDown(2);

    // Details Section
    const detailsY = doc.y;
    doc.fontSize(10)
       .fillColor('#4b5563');

    doc.text(`Issue Date: ${new Date(issueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 60, detailsY);

    doc.text(`Valid Until: ${new Date(validUntil).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 60, detailsY + 20);

    if (registrationNumber) {
      doc.text(`Registration: ${registrationNumber}`, 60, detailsY + 40);
    }

    // QR Code
    const qrImage = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
    doc.image(qrImage, doc.page.width - 160, detailsY - 20, {
      width: 100,
      height: 100
    });

    doc.fontSize(8)
       .fillColor('#6b7280')
       .text('Scan to verify', doc.page.width - 160, detailsY + 85, {
         width: 100,
         align: 'center'
       });

    // Footer
    const footerY = doc.page.height - 120;
    
    doc.fontSize(8)
       .fillColor('#9ca3af')
       .text('Issuing Authority: CarbonScoreX Platform', { align: 'center' }, footerY);
    
    doc.text(`Signature Hash: ${signature.substring(0, 32)}...`, { align: 'center' });
    
    doc.fontSize(7)
       .text(`Verification URL: ${verificationUrl}`, { align: 'center' });

    doc.moveDown(1);
    
    doc.fontSize(6)
       .text('This certificate is digitally signed and can be verified at the URL above.', { 
         align: 'center',
         width: 400
       });

    // Finalize PDF
    doc.end();

    // Wait for stream to finish
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    return {
      filePath,
      fileName,
      signature,
      verificationUrl
    };
  }

  /**
   * Delete certificate file
   */
  deleteCertificate(fileName) {
    const filePath = path.join(this.certificatesDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Certificate deleted: ${fileName}`);
    }
  }
}

module.exports = new CertificateGenerator();