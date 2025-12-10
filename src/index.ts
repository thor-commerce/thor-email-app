import { fromHono } from "chanfana";
import { Hono } from "hono";
import { WebhookReceiver } from "./endpoints/webhookReceiver";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register Thor Commerce Webhook endpoint
openapi.post("/webhooks/thor", WebhookReceiver);

// Export the Hono app
export default app;
