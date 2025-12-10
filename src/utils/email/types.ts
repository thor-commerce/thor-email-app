/**
 * Email provider interface
 */
export interface EmailProvider {
	sendEmail(options: SendEmailOptions): Promise<EmailResult>;
}

export interface SendEmailOptions {
	to: string;
	from?: string;
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
}

export interface EmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * AWS SES configuration
 */
export interface EmailConfig {
	from: string;
	awsRegion: string;
	awsAccessKeyId: string;
	awsSecretAccessKey: string;
}
