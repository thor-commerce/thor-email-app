import type { CodegenConfig } from '@graphql-codegen/cli';
import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env.local or .env
dotenvConfig({ path: '.env.local' });
dotenvConfig({ path: '.env' });

if (!process.env.THOR_API_KEY || !process.env.THOR_TENANT) {
  console.error('\n❌ Error: Missing required environment variables');
  console.error('Please set THOR_API_KEY and THOR_TENANT in .env.local or .env\n');
  process.exit(1);
}

const config: CodegenConfig = {
  overwrite: true,
  // Schema from Thor Commerce Admin API
  schema: [
    {
      [`https://api.thorcommerce.io/${process.env.THOR_TENANT}/admin/graphql`]: {
        headers: {
          'X-API-Key': process.env.THOR_API_KEY,
        },
      },
    },
  ],
  documents: 'src/graphql/**/*.graphql',
  ignoreNoDocuments: true,
  generates: {
    // Save schema for local IDE support
    'thor.schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
    // Generate TypeScript types and client
    'src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-graphql-request',
      ],
      config: {
        // Generate types that work well with Cloudflare Workers
        maybeValue: 'T | null | undefined',
        avoidOptionals: false,
        skipTypename: false,
        // Use explicit types instead of Pick/Omit for better compatibility
        preResolveTypes: true,
        // Add helpful descriptions to generated types
        addDocBlocks: true,
        // Don't import graphql-tag, use raw strings instead
        rawRequest: false,
        // Generate proper types for documents
        documentMode: 'string',
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;
