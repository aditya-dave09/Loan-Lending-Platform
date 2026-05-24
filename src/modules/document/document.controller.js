const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const pdfService = require('../../services/pdf.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const fs = require('fs');
const path = require('path');

/**
 * Generate or download agreement PDF.
 */
const downloadPdf = asyncHandler(async (req, res) => {
  const loan = await prisma.loanAgreement.findUnique({
    where: { id: req.params.id },
    include: {
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      },
      repaymentSchedule: { orderBy: { installmentNumber: 'asc' } },
      signatures: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!loan) {
    throw ApiError.notFound('Loan agreement not found');
  }

  // Check participant access
  const isParticipant = loan.participants.some((p) => p.userId === req.user.id);
  if (!isParticipant) {
    throw ApiError.forbidden('You are not a participant in this loan');
  }

  // Generate PDF
  const { filePath, filename } = await pdfService.generateAgreementPdf(loan);

  // Store document record if not already stored
  const existingDoc = await prisma.document.findFirst({
    where: { loanId: loan.id, purpose: 'AGREEMENT_PDF' },
  });

  if (!existingDoc) {
    const stat = fs.statSync(filePath);
    await prisma.document.create({
      data: {
        fileName: path.basename(filePath),
        originalName: filename,
        mimeType: 'application/pdf',
        fileSize: stat.size,
        filePath,
        purpose: 'AGREEMENT_PDF',
        uploadedBy: req.user.id,
        loanId: loan.id,
      },
    });
  }

  // Send PDF as download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

/**
 * Upload a generic document.
 */
const upload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('No file uploaded');
  }

  const buffer = fs.readFileSync(req.file.path);
  const crypto = require('crypto');
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

  const document = await prisma.document.create({
    data: {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: req.file.path,
      purpose: req.body.purpose || 'OTHER',
      uploadedBy: req.user.id,
      loanId: req.body.loanId || null,
      checksum,
    },
    select: {
      id: true,
      fileName: true,
      originalName: true,
      mimeType: true,
      fileSize: true,
      purpose: true,
      checksum: true,
      createdAt: true,
    },
  });

  res.status(201).json(ApiResponse.created(document, 'File uploaded successfully'));
});

/**
 * Download a document by ID.
 */
const download = asyncHandler(async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
  });

  if (!document) {
    throw ApiError.notFound('Document not found');
  }

  // Check access: must be uploader or loan participant
  if (document.uploadedBy !== req.user.id) {
    if (document.loanId) {
      const participant = await prisma.loanParticipant.findFirst({
        where: { loanId: document.loanId, userId: req.user.id },
      });
      if (!participant) {
        throw ApiError.forbidden('You do not have access to this document');
      }
    } else {
      throw ApiError.forbidden('You do not have access to this document');
    }
  }

  if (!fs.existsSync(document.filePath)) {
    throw ApiError.notFound('File not found on server');
  }

  res.setHeader('Content-Type', document.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
  fs.createReadStream(document.filePath).pipe(res);
});

module.exports = { downloadPdf, upload, download };
