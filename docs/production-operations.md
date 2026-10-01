# VÉRONA — Production Operations, Incident Response & Runbooks

**System**: VÉRONA High-End Garments E-Commerce Platform  
**Document**: Production Operations Guide (Phase 30)  
**Status**: APPROVED FOR PRODUCTION  

---

## 1. Overview & Operational Principles

This document defines standard operating procedures (SOPs), incident response workflows, disaster recovery runbooks, and credential rotation procedures for the VÉRONA e-commerce platform.

### Operational Principles
1. **Zero Data Loss for Financial Transactions**: In any incident involving payments, orders, or refunds, financial states must reconcile with the payment gateway (Razorpay) before restoring operations.
2. **Fail-Closed Security**: If authentication or authorization state cannot be verified, access is denied (HTTP 401/403). Never fail-open.
3. **Deterministic State Regressions Prohibited**: Finite state machines for Orders, Inventory, Fulfillment, and Refunds cannot be forced into invalid backwards transitions without audited administrative compensation events.
4. **Isolated Secrets**: Secrets exist solely in environment configurations; no plain-text credentials in code, logs, or databases.

---

## 2. System Health & Observability

### 2.1. Health Telemetry (`GET /api/health`)
The `/api/health` endpoint serves as the canonical liveness and readiness probe for Vercel/Kubernetes routing:
- **Success (`200 OK`)**: Application runtime is healthy, and MongoDB database ping succeeded (`connected: true`).
- **Degraded (`503 Service Unavailable` or `status: degraded`)**: MongoDB connection dropped or latency exceeded operational thresholds.
- **Cache-Control**: `no-store, no-cache, must-revalidate` (strictly never cached).
- **Security**: Endpoint exposes no connection strings, cluster hostnames, or authentication credentials.

### 2.2. Structured Logging
All system events are formatted with structured JSON metadata:
```json
{
  "timestamp": "2026-09-28T12:00:00.000Z",
  "level": "info",
  "message": "Order created successfully",
  "metadata": {
    "context": "OrderService",
    "orderNumber": "VRN-2026-A1B2C3",
    "customerId": "cust_12345"
  }
}
```
**Masked Fields**: Passwords, payment card details, webhook secrets, full auth tokens, and customer identity numbers must never be logged.

---

## 3. Incident Response Procedures

### 3.1. Incident Classification

| Severity | Definition | Examples | SLA Response |
|---|---|---|---|
| **SEV-1 (Critical)** | Core revenue path broken; platform unavailable | Storefront down, checkout broken, payment verification failing, database outage | < 15 minutes |
| **SEV-2 (High)** | Major operational degradation | Admin dashboard inaccessible, warehouse fulfillment blocked, email dispatch failing | < 1 hour |
| **SEV-3 (Moderate)** | Non-critical feature impaired | Reviews submission failing, search suggestions slow, marketing banner misaligned | < 4 hours |
| **SEV-4 (Low)** | Minor bug or cosmetic issue | Copy error, minor formatting inconsistency | Next release cycle |

### 3.2. Incident Response Workflow
```
[1. DETECT] Alert triggered or incident reported
      ↓
[2. TRIAGE] Classify severity; establish incident lead
      ↓
[3. MITIGATE] Apply temporary mitigation (e.g. enable Maintenance Mode, rollback deployment)
      ↓
[4. INVESTIGATE] Analyze structured logs, traces, provider status
      ↓
[5. RECOVER] Deploy hotfix or execute recovery runbook
      ↓
[6. VERIFY] Execute smoke test matrix across customer & admin flows
      ↓
[7. POST-MORTEM] Document timeline, root cause, and preventative action items
```

---

## 4. Disaster Recovery & Provider Outage Runbooks

### 4.1. Runbook: MongoDB Database Outage
1. **Detection**: `/api/health` returns `connected: false`; error rate spike (`MongoNetworkError`, `MongooseServerSelectionError`).
2. **Immediate Mitigation**:
   - Check MongoDB Atlas Status Dashboard for region outages.
   - If single node failure, Atlas automatic failover promotes secondary replica within 10–30 seconds.
   - If prolonged regional outage, initiate Atlas cross-region cluster restore or point-in-time recovery (PITR).
3. **Restoration Verification**:
   - Verify connection pool recovery via `/api/health`.
   - Run inventory reservation cleanup job (`/api/admin/inventory/reservations/cleanup`) to release stale checkout locks.
   - Trigger payment reconciliation (`/api/admin/orders/reconciliation`) for orders placed during the outage window.

### 4.2. Runbook: Payment Gateway (Razorpay) Outage
1. **Detection**: Spike in payment verification timeouts or 502/504 errors on `/api/payments/verify`.
2. **Immediate Mitigation**:
   - Storefront checkout displays customer-friendly retry message: "Payment processor is currently experiencing delays. Your order has been preserved. Please retry shortly."
   - Do NOT mark pending orders as cancelled automatically.
3. **Post-Outage Reconciliation**:
   - Execute Razorpay webhook replay sync: un-reconciled orders in `PENDING_PAYMENT` state will receive gateway webhooks and transition to `CONFIRMED`.
   - Run batch reconciliation script: queries Razorpay Orders API for transactions captured between `T_outage_start` and `T_outage_end`.

### 4.3. Runbook: Email Provider (Resend) Outage
1. **Detection**: Webhook errors or failed email delivery jobs in `NotificationModel`.
2. **Mitigation**:
   - Notification orchestrator isolates email failures without blocking order confirmation or payment processing.
   - Failed notifications are marked `FAILED` with retry counter.
3. **Recovery**:
   - Trigger notification retry batch via `/api/admin/notifications/[id]/retry` once Resend services report operational status.

### 4.4. Runbook: Shipping Logistics Provider Outage
1. **Detection**: Carrier label generation failure on `/api/admin/fulfillment/[id]/shipments`.
2. **Mitigation**:
   - System automatically falls back to `MANUAL` shipping mode.
   - Operations teams continue picking and packing; tracking numbers can be assigned manually without halting warehouse throughput.

---

## 5. Security Incident & Secret Rotation Runbook

If an API key, database password, or secret token is compromised:

1. **Immediate Revocation**:
   - In the provider console (Clerk, Razorpay, Resend, Cloudinary, MongoDB Atlas), revoke the compromised key immediately or generate a replacement secondary key.
2. **Configuration Update**:
   - Update the corresponding environment variable in the deployment dashboard (e.g., Vercel Project Settings).
3. **Zero-Downtime Redeployment**:
   - Trigger immediate production deployment:
     ```bash
     vercel deploy --prod
     ```
4. **Audit Trail Verification**:
   - Inspect `/api/admin/audit-logs` for anomalous activity by the compromised credential.
   - Invalidate all active staff sessions if staff JWT secret or Clerk session secret was rotated.

---

## 6. Database Backup & Restoration Runbook

### 6.1. Backup Architecture (MongoDB Atlas)
- **Continuous Backups**: Point-in-time recovery (PITR) with 1-minute granularity for the past 7 days.
- **Daily Snapshots**: Automated daily snapshots retained for 30 days.
- **Monthly Snapshots**: Retained for 12 months for compliance.
- **Encryption**: Encrypted at rest using AES-256; encrypted in transit using TLS 1.3.

### 6.2. Staging Restoration Test Procedure
1. Log in to MongoDB Atlas console.
2. Select target cluster snapshot $\to$ Choose "Restore to a different cluster" $\to$ Select `verona-staging-recovery`.
3. Verify restored dataset:
   - Check document counts for `customers`, `orders`, `products`, `inventory_ledgers`.
   - Verify indexes exist:
     ```javascript
     db.products.getIndexes();
     db.orders.getIndexes();
     db.customers.getIndexes();
     ```
4. Point staging application environment to restored database and verify `/api/health` reports healthy.

---

## 7. Production Maintenance Mode

To enable scheduled maintenance mode:
1. Navigate to `/admin/settings` $\to$ **Maintenance Mode**.
2. Toggle **Maintenance Mode Active** to `ON`.
3. Provide customer announcement text (e.g., *"VÉRONA is undergoing scheduled system optimization. We will return at 04:00 GMT."*).
4. Save settings. Storefront immediately presents maintenance banner while preserving administrative access.
