const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const crypto = require('crypto');
const logger = require('../../config/logger');

/**
 * Register a webhook endpoint.
 */
const create = asyncHandler(async (req, res) => {
  const { url, events, secret } = req.body;

  const webhook = await prisma.webhookEndpoint.create({
    data: {
      userId: req.user.id,
      url,
      events,
      secret: secret || crypto.randomBytes(32).toString('hex'),
    },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
    },
  });

  res.status(201).json(ApiResponse.created(webhook, 'Webhook endpoint registered'));
});

/**
 * List user's webhook endpoints.
 */
const list = asyncHandler(async (req, res) => {
  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { userId: req.user.id },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      lastError: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json(ApiResponse.ok(webhooks));
});

/**
 * Delete a webhook endpoint.
 */
const remove = asyncHandler(async (req, res) => {
  const webhook = await prisma.webhookEndpoint.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });

  if (!webhook) {
    throw ApiError.notFound('Webhook endpoint not found');
  }

  await prisma.webhookEndpoint.delete({ where: { id: req.params.id } });

  res.status(200).json(ApiResponse.ok(null, 'Webhook endpoint deleted'));
});

/**
 * Deliver a webhook event to all matching endpoints.
 * Called internally by services, not exposed as an API.
 */
async function deliverWebhookEvent(event, payload) {
  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: {
        isActive: true,
        events: { has: event },
      },
    });

    for (const endpoint of endpoints) {
      try {
        // Create HMAC signature
        const signature = crypto
          .createHmac('sha256', endpoint.secret)
          .update(JSON.stringify(payload))
          .digest('hex');

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-LoanForge-Event': event,
            'X-LoanForge-Signature': `sha256=${signature}`,
            'X-LoanForge-Delivery': crypto.randomUUID(),
          },
          body: JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() }),
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        // Record delivery
        await prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            payload,
            responseCode: response.status,
            success: response.ok,
            deliveredAt: new Date(),
            attempts: 1,
          },
        });
      } catch (error) {
        logger.warn(`Webhook delivery failed for ${endpoint.url}:`, error.message);

        await prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            payload,
            responseBody: error.message,
            success: false,
            attempts: 1,
          },
        });

        // Update endpoint last error
        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { lastError: error.message },
        });
      }
    }
  } catch (error) {
    logger.error('Webhook delivery system error:', error.message);
  }
}

module.exports = { create, list, remove, deliverWebhookEvent };
