---
name: inngest-realtime
description: Use when streaming durable workflow updates to a UI in real time — live order status pages that animate as steps complete, AI agent token streaming from a function to the browser, log tailing for long-running jobs, or human-in-the-loop approval flows that publish a prompt and wait for a user reply. Covers Inngest v4 native realtime: defining typed channels, publishing from inside step.run, minting subscription tokens via server actions, and consuming the stream from React/Next.js client components.
---

# Inngest Realtime

Stream updates from durable Inngest functions to live UIs. Use channels and topics to broadcast progress, render workflow execution as it happens, or build bi-directional human-in-the-loop flows.

> **These skills are focused on TypeScript.** For Python or Go, refer to the [Inngest documentation](https://www.inngest.com/llms.txt) for language-specific guidance. Core concepts apply across all languages.

> **⚠ CRITICAL: v3 vs v4 package selection**
>
> Realtime in Inngest v4 lives at the SDK subpath `inngest/realtime`. The standalone `@inngest/realtime` npm package is a **v3-era package** and is **NOT compatible with `inngest@4.x`**. If your project is on v4 (the npm default), do not install `@inngest/realtime`. Use the imports below.
>
> Symptoms of using the wrong package on v4: `TypeError: Cls is not a constructor` on every `PUT /api/inngest`, 401 on subscription tokens, type incompatibility on `new Inngest({ middleware: [...] })`. Verify your `package.json` shows `"inngest": "^4.x"` before reading further.

## Prerequisites

- Inngest v4 SDK installed (`npm install inngest`) — see the `inngest-setup` skill
- `INNGEST_DEV=1` set in `.env.local` for local development (without it, the SDK demands cloud signing keys and 401s on token requests)
- Local Inngest dev server running (`npx inngest-cli@latest dev`)
- Optional: `zod` for schema validation on topics

## When to use Realtime

| Problem shape | Pattern |
|---|---|
| Order status page animates as durable workflow steps complete | Per-run channel, publish per step, client subscribes |
| AI agent streams tokens to a chat UI | Per-conversation channel, publish chunks, stream to browser |
| Log tail for a long-running job | Single channel, log topic, append to UI |
| Human-in-the-loop approval | Channel + waitForEvent, publish prompt, wait for response |
| Admin dashboard with live order list | Global admin channel, fan-out from each function |

## Architecture

Three pieces:

1. **Channel definition** — a typed contract for what gets published. Lives in shared module so both server and client can reference the same channel name.
2. **Publishing** — from inside `step.run` blocks, call `step.realtime.publish(id, channel.topic, data)`. Each publish is durable: re-runs on retry are deduplicated by `id`.
3. **Subscribing** — server action mints a subscription token; client component calls `subscribe(token, callback)`.

## Step 1: Define a channel

Channels are pure data — no class hierarchy, no zod runtime required (but recommended for type safety). Define them once and import where needed.

```typescript
// src/inngest/channels.ts
import { channel } from 'inngest/realtime';
import { z } from 'zod';

// Per-run channel: each fulfill-order run publishes step updates to its own channel.
export const orderChannel = channel({
  name: (orderId: string) => `order:${orderId}`,
  topics: {
    step: {
      schema: z.object({
        name: z.string(),
        status: z.enum(['running', 'complete', 'failed']),
        output: z.record(z.string(), z.unknown()).optional(),
        ts: z.number(),
      }),
    },
  },
});

// Global admin channel: fan-out for cross-cutting visibility.
export const adminChannel = channel({
  name: 'admin',
  topics: {
    order: {
      schema: z.object({
        orderId: z.string(),
        step: z.string(),
        status: z.enum(['running', 'complete', 'failed']),
        ts: z.number(),
      }),
    },
  },
});
```

**Two channel name shapes:**
- `name: 'admin'` — static channel, accessed as `adminChannel.order` (topic ref)
- `name: (id) => 'channel:${id}'` — parametric, accessed as `orderChannel(id).step` (call the channel def with the id, then access topic)

## Step 2: Publish from inside a function

In v4, every `step` has a built-in `realtime.publish` method. **No middleware required.** Each call is a durable boundary — retries are deduplicated by the publish id.

```typescript
// src/inngest/functions/fulfill-order.ts
import { inngest } from '../client';
import { orderChannel, adminChannel } from '../channels';

export const fulfillOrder = inngest.createFunction(
  {
    id: 'fulfill-order',
    retries: 3,
    triggers: [{ event: 'store/order.placed' }],
  },
  async ({ event, step }) => {
    const { orderId, customerEmail, lineItems } = event.data;

    const emit = async (
      name: string,
      status: 'running' | 'complete' | 'failed',
      output?: Record<string, unknown>,
    ) => {
      const ts = Date.now();
      await step.realtime.publish(
        `emit-order-${name}-${status}`,
        orderChannel(orderId).step,
        { name, status, output, ts },
      );
      // Fan-out to admin channel as well
      await step.realtime.publish(
        `emit-admin-${name}-${status}`,
        adminChannel.order,
        { orderId, step: name, status, ts },
      );
    };

    await emit('capture-payment', 'running');
    const payment = await step.run('capture-payment', async () => {
      // ...
      return { paymentIntentId: 'pi_...', status: 'succeeded' };
    });
    await emit('capture-payment', 'complete', payment);

    await emit('reserve-inventory', 'running');
    const inventory = await step.run('reserve-inventory', async () => {
      // ...
    });
    await emit('reserve-inventory', 'complete', inventory);

    // ...
  },
);
```

**Why no middleware:** Inngest v4 ships realtime support natively. Earlier versions used `@inngest/realtime`'s `realtimeMiddleware()` to inject a `publish` arg into the handler. v4 puts it on `step.realtime` directly.

**Non-durable client publishing** (rare — usually you want durable):
```typescript
await inngest.realtime.publish(orderChannel(orderId).step, { ... });
// fires immediately, not retry-safe, doesn't include run ID
```

## Step 3: Mint a subscription token (server action)

In Next.js App Router, use a Server Action to securely mint a short-lived token. Without a token, clients can't subscribe.

```typescript
// src/app/orders/[orderId]/actions.ts
'use server';

import { getSubscriptionToken } from 'inngest/realtime';
import { inngest } from '@/inngest/client';
import { orderChannel } from '@/inngest/channels';

export async function fetchOrderSubscriptionToken(orderId: string) {
  const token = await getSubscriptionToken(inngest, {
    channel: orderChannel(orderId),
    topics: ['step'],
  });

  // ⚠ CRITICAL: strip the ChannelInstance from the response.
  // getSubscriptionToken returns { channel: ChannelInstance, ... } where
  // ChannelInstance contains zod schema methods (a class with prototypes).
  // Next.js refuses to serialize classes across the server-action → client-component
  // boundary, so return ONLY primitives.
  return {
    channel: orderChannel(orderId).name as string,
    topics: ['step'] as const,
    key: token.key,
    apiBaseUrl: token.apiBaseUrl,
  };
}
```

**Why strip the channel:** Next.js's serializer rejects classes/prototypes with:
```
Only plain objects, and a few built-ins, can be passed to Client Components from Server Components.
Classes or null prototypes are not supported.
```

The `subscribe()` function on the client accepts either a `ChannelInstance` or a bare string for the `channel` field. Passing the string bypasses the serialization issue without losing functionality.

## Step 4: Subscribe from a client component

```typescript
// src/components/OrderStatusClient.tsx
'use client';

import * as React from 'react';
import { subscribe } from 'inngest/realtime';
import { fetchOrderSubscriptionToken } from '@/app/orders/[orderId]/actions';

type StepMessage = {
  name: string;
  status: 'running' | 'complete' | 'failed';
  output?: Record<string, unknown>;
  ts: number;
};

export function OrderStatusClient({ orderId }: { orderId: string }) {
  const [messages, setMessages] = React.useState<StepMessage[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let sub: { close?: (reason?: string) => void } | undefined;

    (async () => {
      try {
        const token = await fetchOrderSubscriptionToken(orderId);
        if (cancelled) return;

        sub = await subscribe(
          {
            channel: token.channel,
            topics: [...token.topics],
            key: token.key,
            apiBaseUrl: token.apiBaseUrl,
          },
          (message) => {
            if (cancelled) return;
            setMessages((prev) => [...prev, message.data as StepMessage]);
          },
        );
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      sub?.close?.('unmount');
    };
  }, [orderId]);

  // ... render messages ...
}
```

## Pattern: Single-run subscription (HTTP streaming)

Alternative to the React hook pattern — subscribe inside a Next.js API route and pipe the stream to the client via SSE:

```typescript
// src/app/api/orders/[orderId]/stream/route.ts
import crypto from 'crypto';
import { inngest } from '@/inngest/client';
import { subscribe } from 'inngest/realtime';
import { orderChannel } from '@/inngest/channels';

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  const stream = await subscribe({
    app: inngest,
    channel: orderChannel(params.orderId),
    topics: ['step'],
  });

  return new Response(stream.getEncodedStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

Client consumes via `fetch().getReader()` rather than the `subscribe()` callback. Use this when you want the SSE behavior or when the client-side `subscribe()` API doesn't fit your component lifecycle.

## Pattern: Human-in-the-loop

Combine `step.realtime.publish` with `step.waitForEvent`:

```typescript
import crypto from 'crypto';

export const reviewWorkflow = inngest.createFunction(
  { id: 'review-workflow', triggers: [{ event: 'review/start' }] },
  async ({ event, step }) => {
    const confirmationId = await step.run('gen-id', () => crypto.randomUUID());

    // Publish a prompt — the client subscribes and renders an approval UI
    await step.realtime.publish(
      'publish-prompt',
      reviewChannel.message,
      { message: 'Confirm to proceed?', confirmationId },
    );

    // Wait up to 15 minutes for the user to send the matching event back
    const confirmation = await step.waitForEvent('await-confirmation', {
      event: 'review/confirmation',
      timeout: '15m',
      if: `async.data.confirmationId == "${confirmationId}"`,
    });

    if (!confirmation) {
      // user didn't respond — abort or escalate
      return { decision: 'timed_out' };
    }
    // continue workflow...
  },
);
```

The `confirmationId` links the published prompt to the matching reply, so the workflow knows which response to act on.

## Common pitfalls

### Don't use `@inngest/realtime` on v4

The standalone `@inngest/realtime` package is for Inngest v3 only. On v4, all realtime APIs are in the SDK subpath `inngest/realtime`. Mixing them produces:
- `TypeError: Cls is not a constructor` on `PUT /api/inngest` (v3 middleware class signature mismatch)
- 401 Unauthorized on subscription tokens
- TypeScript errors casting middleware

**Verify with:** `grep '"inngest"' package.json` — if it's `^4.x`, use `inngest/realtime`. Period.

### Don't return ChannelInstance from a Next.js server action

`getSubscriptionToken` returns `{ channel: ChannelInstance, ... }` where ChannelInstance has zod schema methods (a class). Next.js refuses to serialize classes across the server-action → client-component boundary. Strip to primitives before returning. See Step 3 above.

### `INNGEST_DEV=1` is required for local dev

Without it, the SDK assumes cloud mode and demands `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY`. All realtime operations 401 / 500. Add to `.env.local`. Hard restart the dev server (Next.js does not hot-reload `.env.local` changes).

### Channel topic schemas validate on publish, not on consume

If your published payload doesn't match the zod schema, the publish fails server-side. Subscriber receives nothing. Catch publish errors during step execution, or run with `validate: false` in `subscribe()` if you have a reason to skip schema validation client-side.

## Reference

- v4 native realtime entry: `import { channel, getSubscriptionToken, subscribe } from 'inngest/realtime'`
- Step-level publish: `step.realtime.publish(id, topicRef, data)` — durable, retry-safe
- Client-level publish: `inngest.realtime.publish(topicRef, data)` — non-durable, fires immediately
- Subscribe overloads: `subscribe(token)` returns a stream; `subscribe(token, callback)` invokes callback per message
- Next.js Server Action gotcha: strip `ChannelInstance` → return `{ channel: string, topics, key, apiBaseUrl }`
