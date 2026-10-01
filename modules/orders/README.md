# Orders & Fulfillment Domain (`modules/orders`)

## Overview
Order lifecycle orchestration, finite-state machine transitions, and invoice generation.

## Roadmap Phase
**Phase 11 — Order Management & Fulfillment Pipeline**

## Key Responsibilities
- Deterministic order state machine (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, RETURN_REQUESTED).
- Order persistence, line item snapshots, tax computation records, and historical logs.
- Fulfillment assignment, packing slips, and GST compliant tax invoices.

## Planned Structure
```text
modules/orders/
├── order.service.ts
├── order.repository.ts
├── order.types.ts
├── order.validation.ts
└── order.state-machine.ts
```
