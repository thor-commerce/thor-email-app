# Thor Commerce Email App Template

A production-ready Cloudflare Worker template for receiving and processing Thor Commerce webhooks. This template provides a solid foundation for building email notification systems triggered by Thor Commerce events.

> **🚀 New here?** Check out the [Quick Start Guide](./QUICKSTART.md) to get running in 5 minutes!

Built with:
- **[Cloudflare Workers](https://workers.dev)** - Serverless edge computing
- **[Hono](https://hono.dev/)** - Ultra-fast web framework
- **[Chanfana](https://chanfana.pages.dev/)** - OpenAPI 3.1 integration
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[GraphQL Code Generator](https://the-guild.dev/graphql/codegen)** - Type-safe API client

## Features

✅ **Secure Webhook Verification** - HMAC-SHA256 signature validation  
✅ **Replay Attack Protection** - Timestamp verification  
✅ **Type-Safe GraphQL Client** - Auto-generated from Thor Commerce Admin API  
✅ **Full TypeScript Support** - Zod schemas and GraphQL codegen  
✅ **Event Handlers** - Pre-built handlers for common Thor Commerce events  
✅ **OpenAPI Documentation** - Auto-generated API docs  
✅ **Production Ready** - Error handling, logging, and best practices

## Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (or npm/yarn)
- [Cloudflare account](https://workers.dev) (free tier works great)

### 2. Installation

```bash
# Clone or use this template
git clone <your-repo-url>
cd thor-email-app

# Install dependencies
pnpm install

# Login to Cloudflare
pnpm wrangler login
```

### 3. Configure Secrets

Set your Thor Commerce credentials:

```bash
# Set the webhook secret
pnpm wrangler secret put THOR_WEBHOOK_SECRET

# Set your Thor API key
pnpm wrangler secret put THOR_API_KEY

# Set your Thor tenant ID
pnpm wrangler secret put THOR_TENANT
```

### 4. Generate GraphQL Types

Generate TypeScript types from the Thor Commerce Admin API:

```bash
# Set up local environment for codegen
cp .env.example .env.local
# Edit .env.local and add your THOR_API_KEY and THOR_TENANT

# Generate types
pnpm codegen
```

This creates type-safe GraphQL clients in `src/generated/graphql.ts`.

### 5. Deploy

```bash
# Deploy to Cloudflare Workers
pnpm run deploy
```

Your webhook endpoint will be available at:
```
https://your-worker.workers.dev/webhooks/thor
```

## Local Development

Start the local development server:

```bash
pnpm run dev
```

The API will be available at `http://localhost:8787/` with OpenAPI documentation.

### Testing Webhooks Locally

For local webhook testing, you'll need to:

1. Set up a temporary webhook secret for development
2. Use a tool like [ngrok](https://ngrok.com/) to expose your local server
3. Configure Thor Commerce to send webhooks to your ngrok URL

```bash
# In one terminal
pnpm run dev

# In another terminal
ngrok http 8787
```

## Configuring Thor Commerce

1. Go to your Thor Commerce dashboard
2. Navigate to **Webhooks** settings
3. Click **Add Webhook**
4. Enter your webhook URL: `https://your-worker.workers.dev/webhooks/thor`
5. Generate and save the **Webhook Secret**
6. Select the events you want to receive:
   - `order.created`
   - `order.payment_state.changed`
   - `order.fulfillment_state.changed`
   - `order.cancelled`

## Project Structure

```
├── src/
│   ├── index.ts                    # Main router and app configuration
│   ├── types.ts                    # TypeScript types and Zod schemas
│   ├── endpoints/
│   │   ├── webhookReceiver.ts      # Main webhook handler
│   │   └── task*.ts                # Example API endpoints (can be removed)
│   ├── graphql/
│   │   └── orders.graphql          # GraphQL queries for Thor API
│   ├── generated/
│   │   └── graphql.ts              # Auto-generated GraphQL types (run pnpm codegen)
│   └── utils/
│       ├── webhookVerification.ts  # Signature verification utilities
│       └── thorClient.ts           # Thor Commerce API client
├── codegen.ts                      # GraphQL Code Generator configuration
├── wrangler.jsonc                  # Cloudflare Workers configuration
└── package.json
```

## Implementing Your Email Logic

The webhook receiver is set up with placeholder methods for each event type. Implement your email sending logic in `src/endpoints/webhookReceiver.ts`:

### Example: Order Confirmation Email

```typescript
import { createThorClient } from '../utils/thorClient';
import { GetOrderDocument } from '../generated/graphql';

private async handleOrderCreated(c: AppContext, event: z.infer<typeof ThorWebhookEvent>) {
  const orderId = event.data.object.id;
  
  // Fetch full order details using type-safe GraphQL client
  const client = createThorClient(c.env);
  const order = await client.request(GetOrderDocument, { id: orderId });
  
  // Send email using your preferred email service
  await sendEmail({
    to: order.customer.email,
    subject: `Order Confirmation - ${order.number}`,
    template: "order-confirmation",
    data: {
      orderId: order.id,
      orderNumber: order.number,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      items: order.lineItems,
      total: order.total,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
    }
  });
  
  console.log(`Order confirmation email sent for ${orderId}`);
}
```

### Creating Custom Queries

Add your GraphQL queries to `src/graphql/*.graphql`:

```graphql
query GetOrderForEmail($id: ID!) {
  order(id: $id) {
    id
    number
    customer {
      email
      firstName
      lastName
    }
    lineItems {
      quantity
      variant {
        name
        product {
          name
        }
      }
    }
  }
}
```

Then regenerate types:
```bash
pnpm codegen
```

## Supported Event Types

| Event Type | Description | Handler Method |
|------------|-------------|----------------|
| `order.created` | New order placed | `handleOrderCreated()` |
| `order.payment_state.changed` | Payment status updated | `handleOrderPaymentStateChanged()` |
| `order.fulfillment_state.changed` | Fulfillment status updated | `handleOrderFulfillmentStateChanged()` |
| `order.cancelled` | Order cancelled | `handleOrderCancelled()` |

## Security

### Webhook Signature Verification

All incoming webhooks are verified using HMAC-SHA256:

1. Thor Commerce signs each webhook with your secret
2. Signature is sent in the `Thor-Signature` header
3. Format: `t=<timestamp>,v1=<signature>`
4. The worker verifies the signature matches the payload

### Replay Attack Protection

Webhooks older than 5 minutes (configurable) are rejected to prevent replay attacks.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `THOR_WEBHOOK_SECRET` | Webhook signing secret from Thor Commerce | Yes |
| `THOR_API_KEY` | Thor Commerce Admin API key | Yes |
| `THOR_TENANT` | Your Thor Commerce tenant ID | Yes |
| `THOR_API_URL` | Thor Commerce API URL | No (defaults to http://api.thorcommerce.io) |

Set secrets using:
```bash
pnpm wrangler secret put THOR_WEBHOOK_SECRET
pnpm wrangler secret put THOR_API_KEY
pnpm wrangler secret put THOR_TENANT
```

## Testing

### Example Webhook Payload

```json
{
  "id": "whr_01kc4gj71aexas8x0m022enwth",
  "object": "event",
  "created": 1765383150,
  "idempotency_key": "ed7815df-c7bd-4d94-9326-9873967f26f5",
  "data": {
    "object": {
      "id": "order_01kc4gj6smfg9tan4k99e0zrb8"
    }
  },
  "type": "order.payment_state.changed"
}
```

### Testing with curl

```bash
# Note: You'll need to generate a valid signature
curl -X POST https://your-worker.workers.dev/webhooks/thor \
  -H "Content-Type: application/json" \
  -H "Thor-Signature: t=1234567890,v1=<valid-signature>" \
  -d '{
    "id": "whr_test123",
    "object": "event",
    "created": 1765383150,
    "idempotency_key": "test-key",
    "data": {
      "object": {
        "id": "order_test123"
      }
    },
    "type": "order.created"
  }'
```

## Monitoring & Debugging

### View Logs

```bash
# Stream real-time logs
pnpm wrangler tail
```

### Check Webhook Status

1. Monitor the Cloudflare Workers dashboard
2. Check Thor Commerce webhook logs
3. Review email service delivery logs

## Email Service Integration

This template doesn't include email sending functionality. Here are recommended services:

- **[Resend](https://resend.com/)** - Modern email API
- **[SendGrid](https://sendgrid.com/)** - Reliable email delivery
- **[Mailgun](https://www.mailgun.com/)** - Developer-friendly email API
- **[Postmark](https://postmarkapp.com/)** - Transactional email

## Deployment

### Production Deployment

```bash
pnpm run deploy
```

### Custom Domain

Configure a custom domain in your `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "webhooks.yourdomain.com/*",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

## Troubleshooting

### Webhook Signature Verification Fails

- Verify the webhook secret is correctly set: `pnpm wrangler secret list`
- Check that Thor Commerce has the same secret configured
- Ensure the timestamp isn't too old (default: 5 minutes)

### Events Not Being Received

- Verify the webhook URL is correct in Thor Commerce
- Check that the worker is deployed: `pnpm wrangler deployments list`
- Review logs: `pnpm wrangler tail`

### TypeScript Errors

```bash
# Regenerate Cloudflare Workers types
pnpm run cf-typegen
```

## Contributing

Feel free to customize this template for your specific needs. Consider:

1. Adding database integration (D1, KV, Durable Objects)
2. Implementing rate limiting
3. Adding retry logic for failed emails
4. Creating email templates
5. Adding analytics and tracking

## GraphQL Code Generation

This project uses GraphQL Code Generator to create type-safe clients for the Thor Commerce Admin API.

### Quick Commands

```bash
# Generate types from Thor API
pnpm codegen

# Watch mode for development
pnpm codegen:watch
```

For detailed GraphQL setup instructions, see [GRAPHQL_SETUP.md](./GRAPHQL_SETUP.md).

## Resources

- [Thor Commerce Documentation](https://docs.thor-commerce.com/)
- [Thor Commerce Admin API](http://api.thorcommerce.io/{tenant}/admin/graphql)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/docs)
- [Chanfana Documentation](https://chanfana.pages.dev/)
- [GraphQL Code Generator](https://the-guild.dev/graphql/codegen)

## License

MIT

---

Built with ❤️ for the Thor Commerce ecosystem
