import type { Context } from "hono";
import { z } from "zod";

// Cloudflare Workers context type
// For non-Workers environments, you can create a simple config object instead
export type AppContext = Context<{ Bindings: Env }>;

// Thor Commerce Webhook Types
export const ThorWebhookEvent = z.object({
	id: z.string().describe("Webhook event ID (e.g., whr_01kc4gj71aexas8x0m022enwth)"),
	object: z.literal("event"),
	created: z.number().describe("Unix timestamp"),
	idempotency_key: z.string().uuid(),
	data: z.object({
		object: z.object({
			id: z.string().describe("Resource ID (e.g., order_01kc4gj6smfg9tan4k99e0zrb8)"),
		}).passthrough(), // Allow additional fields
	}),
	type: z.string().describe("Event type (e.g., order.payment_state.changed)"),
});

export type ThorWebhookEventType = z.infer<typeof ThorWebhookEvent>;

// Common Thor Commerce event types
export enum ThorEventType {
	ORDER_CREATED = "order.created",
	ORDER_UPDATED = "order.updated",
	ORDER_PAYMENT_STATE_CHANGED = "order.payment_state.changed",
	ORDER_FULFILLMENT_STATE_CHANGED = "order.fulfillment_state.changed",
	ORDER_CANCELLED = "order.cancelled",
}
