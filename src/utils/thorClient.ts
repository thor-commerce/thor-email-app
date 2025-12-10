import { GraphQLClient } from 'graphql-request';

/**
 * Configuration for Thor Commerce API client
 */
export interface ThorClientConfig {
	THOR_API_KEY: string;
	THOR_TENANT: string;
	THOR_API_URL?: string;
}

/**
 * Create a Thor Commerce Admin API client
 * This client is configured with your API key and tenant
 * Works in any environment (Node.js, Cloudflare Workers, Deno, etc.)
 */
export function createThorClient(config: ThorClientConfig): GraphQLClient {
	const apiUrl = config.THOR_API_URL || 'https://api.thorcommerce.io';
	const endpoint = `${apiUrl}/${config.THOR_TENANT}/admin/graphql`;
	console.log("endpoint", endpoint);
	const client = new GraphQLClient(endpoint, {
		headers: {
			'X-API-Key': config.THOR_API_KEY,
			'Content-Type': 'application/json',
		},
		fetch: globalThis.fetch,
	});

	return client;
}

/**
 * Create Thor client from environment variables (works in Node.js, Workers, etc.)
 */
export function createThorClientFromEnv(env: Record<string, string | undefined> | any): GraphQLClient {
	if (!env.THOR_API_KEY || !env.THOR_TENANT) {
		throw new Error('Missing required environment variables: THOR_API_KEY and THOR_TENANT');
	}

	return createThorClient({
		THOR_API_KEY: env.THOR_API_KEY,
		THOR_TENANT: env.THOR_TENANT,
		THOR_API_URL: env.THOR_API_URL,
	});
}

/**
 * Helper function to safely call the Thor API with error handling
 */
export async function thorApiCall<T>(
	client: GraphQLClient,
	query: string,
	variables?: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
	try {
		const data = await client.request<T>(query, variables);
		return { data, error: null };
	} catch (error) {
		console.error('Thor API error:', error);
		return {
			data: null,
			error: error instanceof Error ? error : new Error('Unknown error')
		};
	}
}
