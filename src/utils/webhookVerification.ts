/**
 * Thor Commerce Webhook Signature Verification
 * 
 * Thor Commerce signs webhooks using HMAC-SHA256 with your webhook secret.
 * The signature is sent in the `X-Webhook-Signature` header.
 * Format: "sha256=<signature>"
 */

export async function verifyThorWebhookSignature(
	payload: string,
	signature: string | null,
	secret: string
): Promise<boolean> {
	if (!signature) {
		return false;
	}

	try {
		// Thor Commerce format: "sha256=<signature>"
		let sig: string;
		
		if (signature.startsWith('sha256=')) {
			// Thor Commerce format
			sig = signature.replace('sha256=', '');
		} else if (signature.includes('v1=')) {
			// Alternative format: "t=<timestamp>,v1=<signature>"
			const elements = signature.split(',');
			const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
			const v1Sig = elements.find(el => el.startsWith('v1='))?.split('=')[1];
			
			if (!timestamp || !v1Sig) {
				return false;
			}
			
			// Use timestamp-based payload
			payload = `${timestamp}.${payload}`;
			sig = v1Sig;
		} else {
			// Unknown format
			console.error('Unknown signature format:', signature);
			return false;
		}

		// Compute HMAC-SHA256
		const encoder = new TextEncoder();
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);

		const signatureBytes = await crypto.subtle.sign(
			'HMAC',
			key,
			encoder.encode(payload)
		);

		// Convert to hex string
		const computedSignature = Array.from(new Uint8Array(signatureBytes))
			.map(b => b.toString(16).padStart(2, '0'))
			.join('');

		// Constant-time comparison
		return safeCompare(computedSignature, sig);
	} catch (error) {
		console.error('Error verifying webhook signature:', error);
		return false;
	}
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}

/**
 * Verify webhook timestamp is within tolerance (default 5 minutes)
 * This helps prevent replay attacks
 * 
 * Note: Thor Commerce uses "sha256=" format which doesn't include timestamps,
 * so this function is optional and only works with timestamp-based formats
 */
export function verifyWebhookTimestamp(
	signature: string | null,
	toleranceSeconds: number = 300
): boolean {
	if (!signature) {
		return true; // Skip timestamp validation if no signature
	}

	// Only validate if signature contains timestamp (t=)
	if (!signature.includes('t=')) {
		return true; // Skip for sha256= format
	}

	try {
		const timestamp = signature.split(',').find(el => el.startsWith('t='))?.split('=')[1];
		if (!timestamp) {
			return true; // Skip if no timestamp found
		}

		const webhookTime = parseInt(timestamp, 10);
		const currentTime = Math.floor(Date.now() / 1000);
		const diff = Math.abs(currentTime - webhookTime);

		return diff <= toleranceSeconds;
	} catch (error) {
		return true; // Skip on error rather than failing
	}
}
