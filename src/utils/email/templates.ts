import Handlebars from 'handlebars/runtime';
// @ts-ignore - Precompiled templates
import orderConfirmationTemplate from '../../emails/compiled/order-confirmation.js';

/**
 * Pre-compiled email templates (MJML + Handlebars compiled at build time)
 * Templates are compiled from MJML to HTML and precompiled with Handlebars via: pnpm build:emails
 */
const templates: Record<string, any> = {
	'order-confirmation': orderConfirmationTemplate,
};

/**
 * Render an email template using precompiled Handlebars templates
 */
export function renderEmailTemplate(templateName: string, data: any): string {
	const precompiledTemplate = templates[templateName];
	
	if (!precompiledTemplate) {
		throw new Error(`Email template not found: ${templateName}. Available: ${Object.keys(templates).join(', ')}`);
	}
	
	// Create template from precompiled spec
	const template = Handlebars.template(precompiledTemplate);
	
	// Render with data
	return template(data);
}

/**
 * Order confirmation email data structure
 */
export interface OrderConfirmationData {
	orderNumber: string;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string;
		city: string;
		postalCode: string;
		countryCode: string;
	};
	billingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string;
		city: string;
		postalCode: string;
		countryCode: string;
	};
	lineItems: Array<{
		name: string;
		quantity: number;
		unitPrice: {
			value: string;
			currencyCode: string;
		};
		imageUrl?: string;
	}>;
	subtotal: {
		value: string;
		currencyCode: string;
	};
	shippingPrice: {
		value: string;
		currencyCode: string;
	};
	total: {
		value: string;
		currencyCode: string;
	};
}
