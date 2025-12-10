import { z } from "zod";
import { ThorWebhookEvent, type AppContext } from "../types";
import { createThorClientFromEnv } from "../utils/thorClient";
import { GetOrderDocument, type GetOrderQuery } from "../generated/graphql";
import { createEmailProviderFromEnv } from "../utils/email";
import { renderEmailTemplate, type OrderConfirmationData } from "../utils/email/templates";
import { centsToAmount } from "../utils/currency";

/**
 * Handle order.created webhook event
 * Triggered when a new order is placed
 */
export async function handleOrderCreated(
    c: AppContext,
    event: z.infer<typeof ThorWebhookEvent>
) {
    const orderId = event.data.object.id;
    console.log("📦 Order created:", orderId);

    try {
        const client = createThorClientFromEnv(c.env);

        // Fetch full order details with typed response
        const data = await client.request<GetOrderQuery>(GetOrderDocument, { id: orderId });

        // data.order is now fully typed with GetOrderQuery type
        if (!data.order) {
            console.error("Order not found:", orderId);
            return;
        }

        if (!data.order) {
            throw new Error("Order data is undefined");
        }

        // TODO: Map real order data from GraphQL query when expanded
        const shippingAddress = {
            firstName: data.order.shippingAddress?.firstName,
            lastName: data.order.shippingAddress?.lastName,
            address1: data.order.shippingAddress?.address1,
            city: data.order.shippingAddress?.city,
            postalCode: data.order.shippingAddress?.postalCode,
            countryCode: data.order.shippingAddress?.countryCode,
        };

        const emailData: OrderConfirmationData = {
            orderNumber: data.order.orderNumber.toString(),
            shippingAddress,
            billingAddress: data.order.billingAddress ? {
                firstName: data.order.billingAddress.firstName,
                lastName: data.order.billingAddress.lastName,
                address1: data.order.billingAddress.address1,
                city: data.order.billingAddress.city,
                postalCode: data.order.billingAddress.postalCode,
                countryCode: data.order.billingAddress.countryCode,
            } : shippingAddress,
            lineItems: data.order.lineItems.nodes.map(item => ({
                name: item.productName,
                quantity: item.quantity,
                imageUrl: item.variant?.image.src + "?w=200&f=webp",
                unitPrice: {
                    value: centsToAmount(item.unitPrice.value.centAmount),
                    currencyCode: item.unitPrice.value.currencyCode,
                },
            })),
            subtotal: {
                value: centsToAmount(data.order.subtotal.centAmount),
                currencyCode: data.order.subtotal.currencyCode,
            },
            shippingPrice: {
                value: centsToAmount(data.order.shippingLines.reduce((sum, line) => sum + line.total.centAmount, 0)),
                currencyCode: data.order.shippingLines.length > 0 ? data.order.shippingLines[0].total.currencyCode : 'DKK',
            },
            total: {
                value: centsToAmount(data.order.total.centAmount),
                currencyCode: data.order.total.currencyCode,
            },
        };

        const emailHtml = renderEmailTemplate('order-confirmation', emailData);

        // Send order confirmation email
        const emailProvider = createEmailProviderFromEnv(c.env);
        const emailResult = await emailProvider.sendEmail({
            to: data.order.customer.email, // TODO: Get from data.order.customer.email when query is expanded
            from: c.env.EMAIL_FROM || 'noreply@example.com',
            subject: `Order Confirmation #${data.order.orderNumber}`,
            html: emailHtml,
            text: `Thank you for your order! Order number: ${data.order.orderNumber}`,
        });

        if (emailResult.success) {
            console.log("✅ Order confirmation email sent:", emailResult.messageId);
        } else {
            console.error("❌ Failed to send email:", emailResult.error);
        }

        console.log("✅ Order confirmation processed");
    } catch (error) {
        console.error("Failed to process order.created:", error);
        throw error;
    }
}
