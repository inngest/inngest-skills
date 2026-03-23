---
name: inngest-versioning
description: Version Inngest functions and events safely. Covers step memoization and safe deploys, adding/removing/reordering steps, major function rewrites with timestamp and event version routing, event schema versioning with the v field, CEL expressions for version-based routing, and migration strategies for zero-downtime upgrades.
---

# Inngest Versioning

Safely evolve Inngest functions and events over time without breaking in-progress runs. Inngest uses step-based memoization — not explicit version numbers — to handle changes gracefully across deployments.

> **These skills are focused on TypeScript.** For Python or Go, refer to the [Inngest documentation](https://www.inngest.com/llms.txt) for language-specific guidance. Core concepts apply across all languages.

## Core Concept: Step Memoization

Inngest tracks each step by hashing its ID with a counter. Completed steps return memoized results — **they never re-execute, even after redeployment**. This is the foundation of safe versioning.

```typescript
// Step "charge-customer" runs once, result is memoized
const charge = await step.run("charge-customer", async () => {
  return stripe.charges.create({ amount: 1000, customer: customerId });
});

// On re-execution (after later steps), "charge-customer" returns stored result
// The customer is NOT charged again
```

**Key rule:** Function IDs must not change between deploys. Changing a function ID creates a new function — it does not update the existing one.

## Safe Changes (No Special Handling Needed)

### Adding New Steps

New steps execute when discovered by in-progress runs. This is always safe.

```typescript
// Original function
export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/placed" },
  async ({ event, step }) => {
    await step.run("charge-payment", async () => {
      return chargeCustomer(event.data.orderId);
    });
    await step.run("send-confirmation", async () => {
      return sendOrderConfirmation(event.data.email);
    });
  }
);

// Updated — new step added between existing ones
export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/placed" },
  async ({ event, step }) => {
    await step.run("charge-payment", async () => {
      return chargeCustomer(event.data.orderId);
    });
    // ✅ New step — safely runs for in-progress and new runs
    await step.run("reserve-inventory", async () => {
      return reserveStock(event.data.items);
    });
    await step.run("send-confirmation", async () => {
      return sendOrderConfirmation(event.data.email);
    });
  }
);
```

**Constraint:** New steps must not depend on data from other new steps that haven't executed yet in an in-progress run.

### Modifying Step Logic (Same ID)

Changing the code inside a step while keeping the same ID is safe. In-progress runs use memoized results; new runs use updated logic.

```typescript
// ✅ Safe: Changed logic, same step ID
await step.run("calculate-tax", async () => {
  // Old: return amount * 0.08;
  return calculateTaxWithNewRules(amount, region); // Updated logic
});
```

### Removing Steps

Safe. In-progress runs skip removed steps. Memoized data persists but is unused.

### Reordering Steps

Produces SDK warnings but functions handle it gracefully. Memoized steps return stored results regardless of position. **Avoid reordering when possible** to keep code clear.

## Forcing Step Re-execution

Change the step ID to force a step to re-execute, even for in-progress runs.

```typescript
// ❌ Old step — in-progress runs have memoized result
await step.run("calculate-risk-score", async () => {
  return legacyRiskModel(userData);
});

// ✅ New step ID — forces re-execution with new logic
await step.run("calculate-risk-score-v2", async () => {
  return improvedRiskModel(userData);
});
```

**Use this when:** You need in-progress runs to pick up new logic for a specific step, not just future runs.

## Major Rewrites: Timestamp-Based Routing

For incompatible function rewrites, run two versions side by side using `if` expressions on the trigger. Each version handles events from its time period.

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "my-app" });

const CUTOVER_TS = 1704067200000; // Jan 1, 2024 00:00:00 UTC

// V1 — handles events before cutover
export const processUploadV1 = inngest.createFunction(
  {
    id: "process-upload",
  },
  {
    event: "file/uploaded",
    if: `event.ts < ${CUTOVER_TS}`,
  },
  async ({ event, step }) => {
    await step.run("process-file", async () => {
      return legacyProcessor(event.data.fileId);
    });
  }
);

// V2 — handles events after cutover
export const processUploadV2 = inngest.createFunction(
  {
    id: "process-upload-v2",
  },
  {
    event: "file/uploaded",
    if: `event.ts >= ${CUTOVER_TS}`,
  },
  async ({ event, step }) => {
    await step.run("validate-file", async () => {
      return validateFileFormat(event.data.fileId);
    });
    await step.run("process-file", async () => {
      return newProcessor(event.data.fileId);
    });
    await step.run("generate-thumbnail", async () => {
      return createThumbnail(event.data.fileId);
    });
  }
);
```

**Critical rules:**
- **Function IDs must differ** between V1 and V2 (`"process-upload"` vs `"process-upload-v2"`)
- In-progress V1 runs complete with original logic
- New events route to V2 based on the `if` expression
- Remove V1 only after all its runs have completed

## Event Schema Versioning with the `v` Field

The `v` field is **purely metadata** — Inngest does not assign it any built-in behavior. It only becomes meaningful when you reference it in `if` expressions to route events to different function versions.

### Sending Versioned Events

```typescript
// V1 event schema
await inngest.send({
  name: "user/profile.updated",
  v: "1",
  data: {
    userId: "user_123",
    email: "new@example.com",
  },
});

// V2 event schema — added new fields
await inngest.send({
  name: "user/profile.updated",
  v: "2",
  data: {
    userId: "user_123",
    email: "new@example.com",
    changes: { email: { from: "old@example.com", to: "new@example.com" } },
    changedBy: "user_456",
  },
});
```

### Routing by Event Version

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "my-app" });

// Handle V1 events (including unversioned events sent before v field was added)
export const handleProfileUpdateV1 = inngest.createFunction(
  { id: "handle-profile-update-v1" },
  {
    event: "user/profile.updated",
    if: 'event.v != "2"',
  },
  async ({ event, step }) => {
    await step.run("update-profile", async () => {
      return updateUserProfile(event.data.userId, event.data);
    });
  }
);

// Handle V2 events with richer data
export const handleProfileUpdateV2 = inngest.createFunction(
  { id: "handle-profile-update-v2" },
  {
    event: "user/profile.updated",
    if: 'event.v == "2"',
  },
  async ({ event, step }) => {
    await step.run("update-profile", async () => {
      return updateUserProfile(event.data.userId, event.data);
    });
    await step.run("log-audit-trail", async () => {
      return logAuditEvent({
        userId: event.data.userId,
        changes: event.data.changes,
        changedBy: event.data.changedBy,
      });
    });
  }
);
```

### Version Format Conventions

```typescript
// ✅ Good: Date-based versions (recommended for event schemas)
v: "2024-01-15";
v: "2024-01-15.1"; // Minor revision on same date

// ✅ Good: Simple numeric versions
v: "1";
v: "2";

// ❌ Avoid: Semver (unnecessary complexity for events)
v: "1.2.3";
```

## Combined Pattern: Version Field + Timestamp Cutover

For maximum control, combine both strategies:

```typescript
import { Inngest } from "inngest";

const inngest = new Inngest({ id: "my-app" });

const CUTOVER_TS = 1704067200000;

// Legacy handler — pre-cutover events only
export const processPaymentLegacy = inngest.createFunction(
  { id: "process-payment-legacy" },
  {
    event: "billing/payment.received",
    if: `event.ts < ${CUTOVER_TS}`,
  },
  async ({ event, step }) => {
    await step.run("process", async () => {
      return legacyPaymentFlow(event.data);
    });
  }
);

// Current handler — post-cutover events (expects v2 schema)
export const processPaymentV2 = inngest.createFunction(
  { id: "process-payment-v2" },
  {
    event: "billing/payment.received",
    if: `event.ts >= ${CUTOVER_TS}`,
  },
  async ({ event, step }) => {
    await step.run("validate-payment", async () => {
      return validatePayment(event.data);
    });
    await step.run("process-payment", async () => {
      return processPayment(event.data);
    });
    await step.run("reconcile", async () => {
      return reconcileAccounts(event.data);
    });
  }
);
```

## Expression Syntax Quick Reference

Inngest uses CEL (Common Expression Language) for `if` expressions:

| Expression | Description |
|---|---|
| `event.v == "2"` | Match specific version |
| `event.v != "2"` | Exclude specific version (also matches unversioned events) |
| `event.ts < 1704067200000` | Match events before timestamp |
| `event.ts >= 1704067200000` | Match events at or after timestamp |
| `event.v == "2" && event.data.region == "us"` | Combine conditions |

See [Expression Syntax Reference](../references/expressions.md) for full CEL syntax.

## Migration Checklist

When versioning functions or events:

1. **Never change a function ID** — this creates a new function, not an update
2. **Use different IDs for V1 and V2 functions** when running side by side
3. **Ensure `if` expressions are mutually exclusive** — every event should match exactly one function
4. **Handle unversioned events** — use `event.v != "2"` (not `== null`) to catch events sent before versioning was added
5. **Monitor in-progress runs** — remove old function versions only after all their runs complete
6. **There is no built-in drain mechanism** — you must monitor and wait for V1 runs to finish manually
7. **Resync after deploying** — Inngest requires a resync whenever you deploy new function configurations. Integration-based syncing (Vercel, Netlify) handles this automatically; otherwise resync manually or via curl
8. **Test with the Dev Server** — pause execution with `step.sleep()`, modify code, and observe memoization behavior

## Common Patterns

### Gradual Rollout

Route a percentage of traffic to a new version using event data:

```typescript
// Producer tags events for rollout
await inngest.send({
  name: "ai/document.summarize",
  data: {
    documentId: "doc_123",
    rolloutGroup: Math.random() < 0.1 ? "canary" : "stable",
  },
});

// Canary version (10% of traffic)
export const summarizeCanary = inngest.createFunction(
  { id: "summarize-document-canary" },
  {
    event: "ai/document.summarize",
    if: 'event.data.rolloutGroup == "canary"',
  },
  async ({ event, step }) => {
    // New summarization pipeline
  }
);

// Stable version (90% of traffic)
export const summarizeStable = inngest.createFunction(
  { id: "summarize-document-stable" },
  {
    event: "ai/document.summarize",
    if: 'event.data.rolloutGroup == "stable"',
  },
  async ({ event, step }) => {
    // Proven summarization pipeline
  }
);
```

### Backward-Compatible Event Evolution

Add fields without breaking existing consumers:

```typescript
// ✅ Add optional fields — existing functions ignore them
await inngest.send({
  name: "order/placed",
  v: "2",
  data: {
    orderId: "ord_123",
    customerId: "cus_456",
    amount: 2500,
    // New in V2 — existing consumers safely ignore these
    shippingMethod: "express",
    estimatedDelivery: "2024-02-01",
  },
});

// Existing function works unchanged — extra fields are ignored
export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/placed" },
  async ({ event, step }) => {
    await step.run("charge", async () => {
      return charge(event.data.orderId, event.data.amount);
    });
  }
);
```

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Function appears as new in dashboard | Function ID was changed | Restore original ID; use a separate V2 function for major rewrites |
| Both V1 and V2 trigger for same event | `if` expressions overlap | Ensure expressions are mutually exclusive |
| Old events don't match any function | Missing catch-all for unversioned events | Use `event.v != "2"` on the V1 handler to match all non-V2 events |
| Step runs again unexpectedly | Step ID was changed | Keep step IDs stable unless you intentionally want re-execution |
| In-progress run skips new step | New step depends on another new step's data | Ensure new steps only use data from previously memoized steps or the event |

See [inngest-durable-functions](../inngest-durable-functions/SKILL.md) for function configuration and [inngest-events](../inngest-events/SKILL.md) for event design patterns.
