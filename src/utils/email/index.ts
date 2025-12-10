import type { EmailProvider, EmailConfig } from './types';
import { SESProvider } from './providers/ses';

/**
 * Create AWS SES email provider from configuration
 */
export function createEmailProvider(config: EmailConfig): EmailProvider {
	return new SESProvider(
		config.awsRegion,
		config.awsAccessKeyId,
		config.awsSecretAccessKey
	);
}

/**
 * Create AWS SES email provider from environment variables
 */
export function createEmailProviderFromEnv(env: Record<string, string | undefined> | any): EmailProvider {
	if (!env.AWS_REGION || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
		throw new Error('Missing required AWS SES environment variables: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
	}
	
	const config: EmailConfig = {
		from: env.EMAIL_FROM || 'noreply@example.com',
		awsRegion: env.AWS_REGION,
		awsAccessKeyId: env.AWS_ACCESS_KEY_ID,
		awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	};
	
	return createEmailProvider(config);
}
