import { z } from "zod";
import { ThorWebhookEvent, type AppContext } from "../types";
import { createThorClientFromEnv } from "../utils/thorClient";
import { GetOrderDocument } from "../generated/graphql";

/**
 * Handle order.payment_state.changed webhook event
 * Triggered when payment status changes (e.g., pending → paid, paid → refunded)
 */
export async function handleOrderPaymentStateChanged(
	c: AppContext,
	event: z.infer<typeof ThorWebhookEvent>
) {
	const orderId = event.data.object.id;
	console.log("💳 Order payment state changed:", orderId);

	try {
		// Create Thor API client
		const client = createThorClientFromEnv(c.env);

		// Fetch current order details to check payment state
		const { order } = await client.request(GetOrderDocument, { id: orderId });

		console.log("Payment state:", {
			orderId: order.id,
			paymentState: order.paymentState,
			customer: order.customer.email,
		});

		// Handle different payment states
		if (order.paymentState === "paid") {
			// Payment successful
			// TODO: Send payment confirmation email
			console.log("✅ Payment confirmed - sending email");
			
			// await sendEmail({
			//   to: order.customer.email,
			//   subject: 'Payment Confirmed',
			//   template: 'payment-confirmed',
			//   data: {
			//     customerName: `${order.customer.firstName} ${order.customer.lastName}`,
			//     orderId: order.id,
			//     amount: `${order.total.value} ${order.total.currencyCode}`,
			//   }
			// });
		} else if (order.paymentState === "failed") {
			// Payment failed
			// TODO: Send payment failed email
			console.log("❌ Payment failed - sending notification");
			
			// await sendEmail({
			//   to: order.customer.email,
			//   subject: 'Payment Failed',
			//   template: 'payment-failed',
			//   data: {
			//     customerName: `${order.customer.firstName} ${order.customer.lastName}`,
			//     orderId: order.id,
			//   }
			// });
		} else if (order.paymentState === "refunded") {
			// Payment refunded
			// TODO: Send refund confirmation email
			console.log("💰 Refund processed - sending confirmation");
		}

		console.log("✅ Payment state change processed");
	} catch (error) {
		console.error("Failed to process payment state change:", error);
		throw error;
	}
}
