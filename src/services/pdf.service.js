const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../config/logger');

/**
 * PDF Agreement Generator.
 * Creates a legally-styled loan agreement PDF with:
 * - Lender/borrower details
 * - Loan terms
 * - Repayment schedule table
 * - Digital signature records
 * - QR code for verification
 * - Integrity hash
 */
class PdfService {
  /**
   * Generate a loan agreement PDF.
   *
   * @param {object} loan - Full loan agreement with participants, schedule, signatures
   * @returns {string} Path to the generated PDF file
   */
  async generateAgreementPdf(loan) {
    const outputDir = path.resolve(config.upload.dir, 'agreements');

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `agreement-${loan.agreementNumber}.pdf`;
    const filePath = path.join(outputDir, filename);

    const lender = loan.participants.find((p) => p.role === 'LENDER');
    const borrower = loan.participants.find((p) => p.role === 'BORROWER');

    // Generate QR code as data URL
    const verifyUrl = `${config.appUrl}/api/v1/loans/${loan.id}/verify`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // ── Header ──────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').text('LOAN AGREEMENT', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text(`Agreement No: ${loan.agreementNumber}`, { align: 'center' });
      doc.text(`Date: ${new Date(loan.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      doc.moveDown(1);

      // ── Divider ─────────────────────────────
      this._drawDivider(doc);

      // ── Parties ─────────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text('PARTIES');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      doc.text(`LENDER:`, { continued: true }).font('Helvetica-Bold')
        .text(`  ${lender?.user?.firstName} ${lender?.user?.lastName}`);
      doc.font('Helvetica').text(`  Email: ${lender?.user?.email}`);
      doc.moveDown(0.5);

      doc.text(`BORROWER:`, { continued: true }).font('Helvetica-Bold')
        .text(`  ${borrower?.user?.firstName} ${borrower?.user?.lastName}`);
      doc.font('Helvetica').text(`  Email: ${borrower?.user?.email}`);
      doc.moveDown(1);

      this._drawDivider(doc);

      // ── Loan Terms ──────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('LOAN TERMS');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      const terms = [
        ['Principal Amount', `Rs.${parseFloat(loan.principalAmount).toLocaleString('en-IN')}`],
        ['Interest Rate', `${loan.interestRate}% per annum`],
        ['Tenure', `${loan.tenureMonths} months`],
        ['Repayment Frequency', loan.repaymentFrequency],
        ['Total Repayable', `Rs.${parseFloat(loan.totalRepayable || 0).toLocaleString('en-IN')}`],
        ['Purpose', loan.purpose || 'Not specified'],
      ];

      terms.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
      });

      if (loan.terms) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Additional Terms:');
        doc.font('Helvetica').text(loan.terms, { indent: 20 });
      }

      doc.moveDown(1);
      this._drawDivider(doc);

      // ── Repayment Schedule ──────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('REPAYMENT SCHEDULE');
      doc.moveDown(0.5);

      if (loan.repaymentSchedule && loan.repaymentSchedule.length > 0) {
        this._drawScheduleTable(doc, loan.repaymentSchedule);
      }

      doc.moveDown(1);
      this._drawDivider(doc);

      // ── Signatures ──────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('DIGITAL SIGNATURES');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      if (loan.signatures && loan.signatures.length > 0) {
        loan.signatures.forEach((sig) => {
          const status = sig.status === 'SIGNED' ? '✓ Signed' : '○ Pending';
          doc.text(`${status} — ${sig.user?.firstName} ${sig.user?.lastName}`);
          if (sig.signedAt) {
            doc.fillColor('#666666').text(
              `  Signed at: ${new Date(sig.signedAt).toLocaleString('en-IN')}`,
            );
            doc.text(`  Signature Hash: ${sig.signatureHash?.substring(0, 16)}...`);
          }
          doc.fillColor('#000000');
          doc.moveDown(0.3);
        });
      } else {
        doc.fillColor('#999999').text('No signatures yet');
        doc.fillColor('#000000');
      }

      doc.moveDown(1);
      this._drawDivider(doc);

      // ── Verification ────────────────────────
      doc.fontSize(12).font('Helvetica-Bold').text('VERIFICATION');
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      doc.text(`Integrity Hash: ${loan.integrityHash || 'Not generated'}`);
      doc.text(`Verify this agreement at: ${verifyUrl}`);
      doc.moveDown(0.5);

      // QR Code
      
      doc.x = 50;
      const qrY = doc.y;

      doc.image(qrBuffer, 50, qrY, {
        width: 80,
        height: 80,
      });

      doc.x = 50;
      doc.y = qrY + 95;

      doc.fontSize(7).text('Scan QR code to verify agreement authenticity', { align: 'left' });

      // ── Footer ──────────────────────────────
      doc.moveDown(2);
      doc.fontSize(7).fillColor('#999999').text(
        'This document is generated by LoanForge — a digital loan formalization platform. It does not constitute legal advice.',
        { align: 'center' },
      );
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        logger.info(`PDF generated: ${filePath}`);
        resolve({ filePath, filename });
      });

      writeStream.on('error', (err) => {
        logger.error('PDF generation error:', err);
        reject(err);
      });
    });
  }

  // ── Private Helpers ──────────────────────────

  
_drawDivider(doc) {
  doc.x = 50;

  doc.strokeColor('#CCCCCC')
    .lineWidth(0.5)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke();

  doc.x = 50;
  doc.moveDown(0.5);
}


  _drawScheduleTable(doc, schedule) {
    const tableTop = doc.y;
    const col = { num: 50, amount: 110, principal: 200, interest: 300, date: 400, status: 480 };

    // Header row
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('#', col.num, tableTop);
    doc.text('Amount', col.amount, tableTop);
    doc.text('Principal', col.principal, tableTop);
    doc.text('Interest', col.interest, tableTop);
    doc.text('Due Date', col.date, tableTop);
    doc.text('Status', col.status, tableTop);

    doc.moveDown(0.5);
    let y = doc.y;

    // Data rows (show max 24 rows to fit on pages)
    const displaySchedule = schedule.slice(0, 24);
    doc.font('Helvetica').fontSize(8);

    displaySchedule.forEach((item) => {
      if (y > 720) {
        doc.addPage();
        y = 50;
      }

      doc.text(String(item.installmentNumber), col.num, y);
      doc.text(`Rs.${parseFloat(item.amountDue).toFixed(0)}`, col.amount, y);
      doc.text(`Rs.${parseFloat(item.principalPortion).toFixed(0)}`, col.principal, y);
      doc.text(`Rs.${parseFloat(item.interestPortion).toFixed(0)}`, col.interest, y);
      doc.text(new Date(item.dueDate).toLocaleDateString('en-IN'), col.date, y);
      doc.text(item.status, col.status, y);

      y += 15;
    });

    if (schedule.length > 24) {
      doc.text(`... and ${schedule.length - 24} more installments`, col.num, y);
      y += 15;
    }

    doc.y = y;
  }
}

module.exports = new PdfService();
