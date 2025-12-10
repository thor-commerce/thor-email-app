import { z } from "zod";
import { ThorWebhookEvent, type AppContext } from "../types";
import { createThorClientFromEnv } from "../utils/thorClient";
import { GetOrderDocument } from "../generated/graphql";

/**
 * Handle order.fulfillment_state.changed webhook event
 * Triggered when fulfillment/shipping status changes
 */
export async function handleOrderFulfillmentStateChanged(
	c: AppContext,
	event: z.infer<typeof ThorWebhookEvent>
) {
	const orderId = event.data.object.id;
	console.log("📮 Order fulfillment state changed:", orderId);

	try {
		// Create Thor API client
		const client = createThorClientFromEnv(c.env);

		// Fetch current order details to check fulfillment state
		const { order } = await client.request(GetOrderDocument, { id: orderId });

		console.log("Fulfillment state:", {
			orderId: order.id,
			shipmentState: order.shipmentState,
			customer: order.customer.email,
		});

		// Handle different fulfillment states
		if (order.shipmentState === "shipped") {
			// Order has been shipped
			// TODO: Send shipping notification with tracking
			console.log("📦 Order shipped - sending tracking info");
			
			// await sendEmail({
			//   to: order.customer.email,
			//   subject: 'Your Order Has Shipped!',
			//   template: 'order-shipped',
			//   data: {
			//     customerName: `${order.customer.firstName} ${order.customer.lastName}`,
			//     orderId: order.id,
			//     shippingAddress: order.shippingAddress,
			//     // trackingNumber: order.shipments[0]?.trackingNumber,
			//     // carrier: order.shipments[0]?.carrier,
			//   }
			// });
		} else if (order.shipmentState === "delivered") {
			// Order delivered
			// TODO: Send delivery confirmation
			console.log("✅ Order delivered - sending confirmation");
			
			// await sendEmail({
			//   to: order.customer.email,
			//   subject: 'Order Delivered',
			//   template: 'order-delivered',
			//   data: {
			//     customerName: `${order.customer.firstName} ${order.customer.lastName}`,
			//     orderId: order.id,
			//   }
			// });
		}

		console.log("✅ Fulfillment state change processed");
	} catch (error) {
		console.error("Failed to process fulfillment state change:", error);
		throw error;
	}
}
