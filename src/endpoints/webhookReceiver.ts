import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { ThorWebhookEvent, ThorEventType, type AppContext } from "../types";
import { verifyThorWebhookSignature, verifyWebhookTimestamp } from "../utils/webhookVerification";
import * as handlers from "../handlers";

export class WebhookReceiver extends OpenAPIRoute {
    schema = {
        tags: ["Webhooks"],
        summary: "Receive Thor Commerce webhooks",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: ThorWebhookEvent,
                    },
                },
            },
            headers: z.object({
                "thor-signature": z.string().optional().describe("Thor Commerce webhook signature"),
            }),
        },
        responses: {
            "200": {
                description: "Webhook received successfully",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            message: z.string(),
                        }),
                    },
                },
            },
            "400": {
                description: "Invalid webhook payload",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            error: z.string(),
                        }),
                    },
                },
            },
            "401": {
                description: "Invalid webhook signature",
                content: {
                    "application/json": {
                        schema: z.object({
                            success: z.boolean(),
                            error: z.string(),
                        }),
                    },
                },
            },
        },
    };

    async handle(c: AppContext) {
        try {
            // Get webhook secret from environment
            const webhookSecret = c.env.THOR_WEBHOOK_SECRET;
            if (!webhookSecret) {
                console.error("THOR_WEBHOOK_SECRET is not configured");
                return c.json({ success: false, error: "Webhook secret not configured" }, 500);
            }

            // Get the raw body for signature verification
            const rawBody = await c.req.text();
            const signature = c.req.header("X-Webhook-Signature");

            // Verify webhook signature
            const isValidSignature = await verifyThorWebhookSignature(
                rawBody,
                signature || null,
                webhookSecret
            );

            if (!isValidSignature) {
                console.warn("Invalid webhook signature received");
                return c.json({ success: false, error: "Invalid signature" }, 401);
            }

            // Verify timestamp to prevent replay attacks
            const isValidTimestamp = verifyWebhookTimestamp(signature || null);
            if (!isValidTimestamp) {
                console.warn("Webhook timestamp is too old or invalid");
                return c.json({ success: false, error: "Invalid timestamp" }, 401);
            }

            // Parse the webhook payload
            const event = JSON.parse(rawBody);
            const validatedEvent = ThorWebhookEvent.parse(event);

            // Log the webhook event
            console.log("Received Thor webhook:", {
                id: validatedEvent.id,
                type: validatedEvent.type,
                orderId: validatedEvent.data.object.id,
            });

            // Handle different event types
            await this.handleWebhookEvent(c, validatedEvent);

            // Return success response
            return c.json({
                success: true,
                message: "Webhook processed successfully",
            });

        } catch (error) {
            console.error("Error processing webhook:", error);

            if (error instanceof z.ZodError) {
                return c.json({
                    success: false,
                    error: "Invalid webhook payload",
                }, 400);
            }

            return c.json({
                success: false,
                error: "Internal server error",
            }, 500);
        }
    }

    /**
     * Handle different webhook event types
     * Delegates to handler functions in src/handlers/
     */
    private async handleWebhookEvent(c: AppContext, event: z.infer<typeof ThorWebhookEvent>) {
        switch (event.type) {
            case ThorEventType.ORDER_CREATED:
                await handlers.handleOrderCreated(c, event);
                break;

            case ThorEventType.ORDER_PAYMENT_STATE_CHANGED:
                await handlers.handleOrderPaymentStateChanged(c, event);
                break;

            case ThorEventType.ORDER_FULFILLMENT_STATE_CHANGED:
                await handlers.handleOrderFulfillmentStateChanged(c, event);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }
}
