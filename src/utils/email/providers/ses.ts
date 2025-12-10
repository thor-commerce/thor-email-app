import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { EmailProvider, SendEmailOptions, EmailResult } from '../types';

/**
 * AWS SES v2 email provider
 * Works seamlessly in Cloudflare Workers with TLS encryption
 */
export class SESProvider implements EmailProvider {
	private client: SESv2Client;
	
	constructor(region: string, accessKeyId: string, secretAccessKey: string) {
		this.client = new SESv2Client({
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}
	
	async sendEmail(options: SendEmailOptions): Promise<EmailResult> {
		try {
			const command = new SendEmailCommand({
				FromEmailAddress: options.from,
				Destination: {
					ToAddresses: [options.to],
				},
				Content: {
					Simple: {
						Subject: {
							Data: options.subject,
							Charset: 'UTF-8',
						},
						Body: {
							Html: {
								Data: options.html,
								Charset: 'UTF-8',
							},
							...(options.text ? {
								Text: {
									Data: options.text,
									Charset: 'UTF-8',
								},
							} : {}),
						},
					},
				},
				...(options.replyTo ? {
					ReplyToAddresses: [options.replyTo],
				} : {}),
			});
			
			const response = await this.client.send(command);
			
			return {
				success: true,
				messageId: response.MessageId,
			};
		} catch (error) {
			console.error('AWS SES Error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'AWS SES failed',
			};
		}
	}
}
