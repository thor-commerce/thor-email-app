/**
 * Standalone Thor Commerce Webhook Handler
 * 
 * This module provides a framework-agnostic webhook handler that works in:
 * - Node.js (Express, Fastify, etc.)
 * - Cloudflare Workers
 * - Deno
 * - Bun
 * - Any JavaScript runtime with fetch support
 */

import { z } from 'zod';
import { ThorWebhookEvent, ThorEventType } from '../types';
import { verifyThorWebhookSignature, verifyWebhookTimestamp } from './webhookVerification';
import { createThorClient, type ThorClientConfig } from './thorClient';

/**
 * Configuration for the webhook handler
 */
export interface WebhookHandlerConfig extends ThorClientConfig {
	THOR_WEBHOOK_SECRET: string;
}

/**
 * Result of webhook processing
 */
export interface WebhookResult {
	success: boolean;
	message?: string;
	error?: string;
	statusCode: number;
}

/**
 * Event handlers interface - implement these to handle webhook events
 */
export interface WebhookEventHandlers {
	onOrderCreated?: (event: z.infer<typeof ThorWebhookEvent>, client: ReturnType<typeof createThorClient>) => Promise<void>;
	onOrderPaymentStateChanged?: (event: z.infer<typeof ThorWebhookEvent>, client: ReturnType<typeof createThorClient>) => Promise<void>;
	onOrderFulfillmentStateChanged?: (event: z.infer<typeof ThorWebhookEvent>, client: ReturnType<typeof createThorClient>) => Promise<void>;
	onOrderCancelled?: (event: z.infer<typeof ThorWebhookEvent>, client: ReturnType<typeof createThorClient>) => Promise<void>;
	onOtherEvent?: (event: z.infer<typeof ThorWebhookEvent>, client: ReturnType<typeof createThorClient>) => Promise<void>;
}

/**
 * Standalone webhook processor
 * Works with any HTTP framework or runtime
 */
export async function processWebhook(
	rawBody: string,
	signature: string | null | undefined,
	config: WebhookHandlerConfig,
	handlers: WebhookEventHandlers = {}
): Promise<WebhookResult> {
	try {
		// Verify webhook signature
		const isValidSignature = await verifyThorWebhookSignature(
			rawBody,
			signature || null,
			config.THOR_WEBHOOK_SECRET
		);

		if (!isValidSignature) {
			console.warn('Invalid webhook signature received');
			return {
				success: false,
				error: 'Invalid signature',
				statusCode: 401,
			};
		}

		// Verify timestamp to prevent replay attacks
		const isValidTimestamp = verifyWebhookTimestamp(signature || null);
		if (!isValidTimestamp) {
			console.warn('Webhook timestamp is too old or invalid');
			return {
				success: false,
				error: 'Invalid timestamp',
				statusCode: 401,
			};
		}

		// Parse and validate the webhook payload
		const event = JSON.parse(rawBody);
		const validatedEvent = ThorWebhookEvent.parse(event);

		console.log('Received Thor webhook:', {
			id: validatedEvent.id,
			type: validatedEvent.type,
			orderId: validatedEvent.data.object.id,
		});

		// Create Thor API client for fetching additional data
		const client = createThorClient(config);

		// Route to appropriate handler
		switch (validatedEvent.type) {
			case ThorEventType.ORDER_CREATED:
				if (handlers.onOrderCreated) {
					await handlers.onOrderCreated(validatedEvent, client);
				}
				break;

			case ThorEventType.ORDER_PAYMENT_STATE_CHANGED:
				if (handlers.onOrderPaymentStateChanged) {
					await handlers.onOrderPaymentStateChanged(validatedEvent, client);
				}
				break;

			case ThorEventType.ORDER_FULFILLMENT_STATE_CHANGED:
				if (handlers.onOrderFulfillmentStateChanged) {
					await handlers.onOrderFulfillmentStateChanged(validatedEvent, client);
				}
				break;

			case ThorEventType.ORDER_CANCELLED:
				if (handlers.onOrderCancelled) {
					await handlers.onOrderCancelled(validatedEvent, client);
				}
				break;

			default:
				if (handlers.onOtherEvent) {
					await handlers.onOtherEvent(validatedEvent, client);
				}
				console.log(`Unhandled event type: ${validatedEvent.type}`);
		}

		return {
			success: true,
			message: 'Webhook processed successfully',
			statusCode: 200,
		};

	} catch (error) {
		console.error('Error processing webhook:', error);

		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: 'Invalid webhook payload',
				statusCode: 400,
			};
		}

		return {
			success: false,
			error: 'Internal server error',
			statusCode: 500,
		};
	}
}

/**
 * Example: Express.js integration
 * 
 * ```typescript
 * import express from 'express';
 * import { processWebhook } from './utils/standaloneWebhook';
 * 
 * const app = express();
 * 
 * app.post('/webhooks/thor', express.raw({ type: 'application/json' }), async (req, res) => {
 *   const result = await processWebhook(
 *     req.body.toString(),
 *     req.headers['thor-signature'],
 *     {
 *       THOR_API_KEY: process.env.THOR_API_KEY!,
 *       THOR_TENANT: process.env.THOR_TENANT!,
 *       THOR_WEBHOOK_SECRET: process.env.THOR_WEBHOOK_SECRET!,
 *     },
 *     {
 *       onOrderCreated: async (event, client) => {
 *         console.log('Order created:', event.data.object.id);
 *         // Send email here
 *       }
 *     }
 *   );
 *   
 *   res.status(result.statusCode).json({
 *     success: result.success,
 *     message: result.message,
 *     error: result.error,
 *   });
 * });
 * ```
 */

/**
 * Example: Node.js native HTTP server
 * 
 * ```typescript
 * import { createServer } from 'http';
 * import { processWebhook } from './utils/standaloneWebhook';
 * 
 * createServer(async (req, res) => {
 *   if (req.url === '/webhooks/thor' && req.method === 'POST') {
 *     let body = '';
 *     req.on('data', chunk => body += chunk);
 *     req.on('end', async () => {
 *       const result = await processWebhook(
 *         body,
 *         req.headers['thor-signature'],
 *         {
 *           THOR_API_KEY: process.env.THOR_API_KEY!,
 *           THOR_TENANT: process.env.THOR_TENANT!,
 *           THOR_WEBHOOK_SECRET: process.env.THOR_WEBHOOK_SECRET!,
 *         }
 *       );
 *       
 *       res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
 *       res.end(JSON.stringify({ success: result.success }));
 *     });
 *   }
 * }).listen(3000);
 * ```
 */
