# VÉRONA — Production-Grade Full-Stack Fashion E-Commerce Platform

> Haute couture and contemporary luxury fashion marketplace engineered for uncompromising aesthetics, financial determinism, operational scalability, and enterprise-grade security.

---

## 1. Executive Overview

**VÉRONA** is a production-ready, full-stack digital fashion atelier and e-commerce platform built on Next.js 15, React 19, TypeScript, Tailwind CSS, and MongoDB Atlas. Inspired by premier digital fashion boutiques, VÉRONA combines intuitive shopping navigation with an elevated luxury editorial visual identity and enterprise operational capabilities.

The platform was built following a comprehensive, strictly sequenced **30-phase roadmap**. The entire roadmap is now **100% COMPLETE**.

---

## 2. Platform Architecture

VÉRONA is constructed as an authoritative **Modular Monolith**. Rather than premature distributed microservices, business domains reside in cohesive domain modules (`modules/*`), ensuring independent testability and clear domain boundaries while benefiting from single-deployment velocity and unified Next.js App Router performance.

```
VÉRONA Platform Architecture
│
├── Storefront & Customer Experience
│   ├── Luxury Editorial Shell & Mega-Menu (Phase 07)
│   ├── Catalog & Collections Showcase (Phases 08, 09)
│   ├── Dynamic Multi-Attribute Garment Variants (Phase 12)
│   ├── Search & Faceted Filter Engine (Phase 10)
│   ├── Product Detail Experience & Sizing (Phase 11)
│   ├── Persistent Wishlist & Recently Viewed (Phase 13)
│   └── Shopping Bag & Server Recalculation (Phase 14)
│
├── Checkout & Commercial Transactions
│   ├── Deterministic Minor-Unit Pricing & Coupons (Phase 15)
│   ├── Postal Code Serviceability & Address Governance (Phase 16)
│   ├── Multi-Step Checkout Pipeline (Phase 17)
│   ├── Razorpay Payment Gateway & HMAC Verification (Phase 18)
│   └── Order Management Lifecycle & State Machine (Phase 19)
│
├── Logistics & Post-Purchase Operations
│   ├── Multi-Warehouse Inventory & Atomic Ledgers (Phase 20)
│   ├── Fulfillment, Wave Picking & Carrier Shipping (Phase 21)
│   ├── Returns & Exchanges Inspection Pipeline (Phase 22)
│   ├── Automated Gateway Refunds & Over-Refund Guard (Phase 23)
│   ├── Verified Customer Reviews & Moderation (Phase 24)
│   ├── Resend Multi-Channel Event Notifications (Phase 25)
│   └── Customer Support Concierge & SLA Ticketing (Phase 26)
│
├── Administrative Control Plane
│   ├── Executive Operations Dashboard & Financial KPIs (Phase 27)
│   ├── Catalog, Editorial Content & Campaign Hub (Phase 28)
│   ├── Customer 360° Portfolio & Workforce Governance (Phase 29)
│   └── Append-Only Security Forensics Audit Trail (Phase 29)
│
└── Infrastructure & Reliability
    ├── Edge Security Headers (HSTS, CSP, X-Frame) (Phase 30)
    ├── Dynamic Sitemap & Search Engine Crawler Governance (Phase 30)
    ├── Multi-Tier Testing Pyramid (874 Automated Tests) (Phase 30)
    └── Production Operations & Disaster Recovery Runbooks (Phase 30)
```

---

## 3. Technology Stack

* **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components & Server Actions)
* **UI & Core**: [React 19](https://react.dev/), [TypeScript 5.7](https://www.typescriptlang.org/) (Strict Mode)
* **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) with HSL luxury tokens & Lucide React icons
* **Database**: [MongoDB Atlas](https://www.mongodb.com/) via [Mongoose 8](https://mongoosejs.com/) with cached connection pooling
* **Identity & Authentication**: [Clerk](https://clerk.com/) with session cookies and webhook synchronization
* **Payments & Gateway**: [Razorpay](https://razorpay.com/) with HMAC SHA-256 cryptographic verification
* **Transactional Email**: [Resend](https://resend.com/) with event-driven failure isolation
* **Media & Assets**: [Cloudinary](https://cloudinary.com/) for media CDN optimization & Unsplash
* **Validation**: [Zod](https://zod.dev/) for strict runtime schema verification
* **Testing**: [Vitest 3](https://vitest.dev/) (874 unit & integration tests) and [Playwright](https://playwright.dev/) for E2E verification

---

## 4. Repository Structure

```
verona/
├── app/                  # Next.js App Router (Storefront, Admin, API Routes, Sitemap, Robots)
├── components/           # Reusable luxury UI components & domain views
├── config/               # Global constants, navigation config, and pricing tokens
├── constants/            # Permissions, Roles, Status Enums, Error Codes
├── db/                   # Mongoose models registry and domain schemas
├── docs/                 # Production architecture, operations runbooks, API contracts
├── lib/                  # Adapters (Auth, Money, Validation, Edge Middleware, Logger)
├── modules/              # Autonomous domain modules (Pricing, Cart, Orders, Admin, etc.)
├── tests/                # Multi-tier test suites (Unit, Integration, E2E)
└── types/                # Core TypeScript database and domain interfaces
```

---

## 5. Local Development Setup

### 5.1. Prerequisites
- Node.js 20+ LTS
- MongoDB local instance or MongoDB Atlas URI
- npm or yarn

### 5.2. Installation
```bash
# Clone the repository
git clone https://github.com/verona-fashion/verona.git
cd verona

# Install dependencies
npm install

# Copy environment configuration template
cp .env.example .env.local
```

### 5.3. Environment Configuration
Populate `.env.local` using the template documented in `.env.example`. Key configuration sections:
- `DATABASE_URL`: MongoDB connection string.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Clerk authentication keys.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: Razorpay keys.
- `RESEND_API_KEY`: Resend transactional email API key.

### 5.4. Run the Development Server
```bash
npm run dev
# Server accessible at http://localhost:3000
```

---

## 6. Available Production Commands

| Command | Description | Status |
| :--- | :--- | :--- |
| `npm run dev` | Boots local Next.js development server | Active |
| `npm run build` | Compiles optimized Next.js production build | Verified (0 errors) |
| `npm run start` | Launches compiled production server | Production Ready |
| `npm run lint` | Runs ESLint across all codebase files | Verified (0 errors) |
| `npm run typecheck` | Strict TypeScript verification (`tsc --noEmit`) | Verified (0 errors) |
| `npm run test` | Executes all 107 Vitest test suites (874 tests) | Verified (874/874 pass) |
| `npm run test:watch` | Runs Vitest in interactive watch mode | Development Tool |
| `npm run test:coverage`| Generates comprehensive test coverage metrics | Quality Gate |
| `npm run test:e2e` | Runs Playwright browser automation suites | Verification |

---

## 7. Financial Invariants & Security Architecture

1. **Integer Minor Units (Paise)**: All monetary figures are handled strictly in integer minor units (₹1,000.00 = `100000`). Zero floating-point arithmetic.
2. **Immutable Order Snapshots**: Order totals, item unit prices, discounts, and delivery addresses are frozen upon payment verification into immutable historical snapshots.
3. **Over-Refund Prevention**: Refund calculation engines enforce that cumulative partial refunds can never exceed the captured payment amount.
4. **Anti-IDOR Protection**: Customer session ownership checks strictly isolate customer orders, addresses, refunds, reviews, and support tickets.
5. **Anti-Self-Escalation & Super Admin Protection**: Administrative staff cannot escalate their own roles or assign privileges beyond their clearance ceiling; the last active Super Admin cannot be suspended or demoted.
6. **Hardened Webhooks**: Razorpay, Resend, and carrier webhooks require cryptographic HMAC SHA-256 signature verification with idempotent replay protection.

---

## 8. Documentation Reference

- **[Architecture Blueprint](file:///d:/portfolio%20pages/garments%20e-commerce/docs/architecture.md)**: Deep dive into domain service architecture, state machines, and boundaries.
- **[REST API Contract](file:///d:/portfolio%20pages/garments%20e-commerce/docs/api.md)**: Exhaustive inventory of all storefront, customer account, and admin endpoints.
- **[Production Operations Guide](file:///d:/portfolio%20pages/garments%20e-commerce/docs/production-operations.md)**: Incident response runbooks, disaster recovery procedures, and secret rotation workflows.
- **[Release Readiness Report](file:///d:/portfolio%20pages/garments%20e-commerce/docs/release-readiness.md)**: Final audit certification and phase-by-phase sign-off.

---

## 9. Completed Roadmap (Phases 1–30)

- [x] **Phase 01 — Project Architecture & Engineering Foundation**
- [x] **Phase 02 — Design System & Storefront UI Foundation**
- [x] **Phase 03 — Database Architecture & Schema Engineering**
- [x] **Phase 04 — Authentication & Identity Management**
- [x] **Phase 05 — Authorization & Role-Based Access Control (RBAC)**
- [x] **Phase 06 — Customer Profile & Account Management**
- [x] **Phase 07 — Storefront Shell, Mega-Menu & Homepage Experience**
- [x] **Phase 08 — Category & Seasonal Collection Taxonomies**
- [x] **Phase 09 — Product Catalog & Detail Architecture**
- [x] **Phase 10 — Faceted Search & Discovery Engine**
- [x] **Phase 11 — Product Detail Experience & Visual Merchandising**
- [x] **Phase 12 — Garment Variants & Multi-Attribute Matrix**
- [x] **Phase 13 — Customer Wishlist & Recently Viewed System**
- [x] **Phase 14 — Shopping Bag Engine & Real-Time Cart Synchronization**
- [x] **Phase 15 — Deterministic Pricing, Promotional Campaigns & Coupons**
- [x] **Phase 16 — Customer Address Governance & Postal Serviceability**
- [x] **Phase 17 — Multi-Step Checkout Pipeline & Session Governance**
- [x] **Phase 18 — Razorpay Payment Gateway & Webhook Signature Verification**
- [x] **Phase 19 — Order Management & Finite State Machine**
- [x] **Phase 20 — Multi-Warehouse Inventory & Concurrency Ledgers**
- [x] **Phase 21 — Fulfillment Operations, Wave Picking & Carrier Logistics**
- [x] **Phase 22 — Returns & Exchanges Lifecycle Management**
- [x] **Phase 23 — Automated Gateway Refunds & Over-Refund Guard**
- [x] **Phase 24 — Verified Customer Reviews & Moderation Pipeline**
- [x] **Phase 25 — Notifications Engine & Resend Multi-Channel Delivery**
- [x] **Phase 26 — Customer Support Concierge & SLA Ticketing System**
- [x] **Phase 27 — Executive Analytics Cockpit & Operations Dashboard**
- [x] **Phase 28 — Product, Editorial Content & Campaign Merchandising**
- [x] **Phase 29 — Customer, Staff & Platform Administration**
- [x] **Phase 30 — Testing, Security, Performance, SEO & Production Deployment**

---

**Release Status**: **v1.0.0 APPROVED FOR PRODUCTION RELEASE**
#   v e r o n i c a  
 