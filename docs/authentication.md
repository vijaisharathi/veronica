# VÉRONA — Phase 04: Authentication & Customer Account System Documentation

This document defines the authentication architecture, external identity integration, customer profile synchronization, and session lifecycle for **VÉRONA**.

---

## 1. Authentication Architecture

* **Authentication Provider**: Clerk
* **Integration Library**: `@clerk/nextjs`
* **Authority**: The authentication provider session is strictly authoritative for identity verification. VÉRONA never stores passwords or authentication credentials in its local database.

```text
Clerk Identity Provider
       │
       │ external identity ID (`authProviderId`)
       ▼
VÉRONA Customer (MongoDB)
       │
       ├── Profile (Name, Phone, Image, Verification)
       ├── Preferences (Marketing Email, SMS, WhatsApp)
       ├── Addresses (Delivery & Billing)
       ├── Orders (Purchases)
       └── Commerce (Cart, Wishlist)
```

---

## 2. Authentication Flows

### 2.1 Sign Up Flow
1. User accesses `/signup` on the VÉRONA storefront.
2. User submits registration details via Clerk.
3. Clerk sends verification code to email.
4. Upon successful email verification, Clerk establishes a secure session.
5. `syncCustomerFromClerk` creates the matching VÉRONA Customer document in MongoDB with `authProviderId = clerkUser.id`.
6. User is redirected to `/account`.

### 2.2 Sign In Flow
1. User accesses `/login`.
2. Credentials verified through Clerk.
3. Secure session cookie established.
4. Server-side helper `getCurrentCustomer()` resolves the VÉRONA Customer document.
5. User accesses authenticated storefront and client account portal.

### 2.3 Sign Out Flow
1. User confirms logout on `/account` or navigation bar.
2. Clerk session is terminated and invalidated.
3. Protected routes (`/account/*`) become immediately inaccessible (401 / redirect).

---

## 3. Server-Side Authentication Helpers

Located in `lib/auth/`:

* `getCurrentAuthUser()`: Returns `{ userId, sessionId }` from Clerk session or `null`.
* `requireAuthenticatedUser()`: Asserts active session; throws `AuthenticationError` (401) if absent.
* `getCurrentCustomer()`: Resolves VÉRONA `Customer` model; enforces `status !== SUSPENDED`.
* `requireCustomer()`: Asserts valid customer profile; throws `AuthenticationError` (401) or `AccountSuspendedError` (403).
* `getCurrentStaff()`: Resolves internal operator profile from `StaffModel`.
* `requireStaff()`: Asserts staff identity; throws `AuthorizationError` (403) if caller is a customer.

---

## 4. Account Profile & Preferences APIs

* `GET /api/account/profile`: Retrieves current customer's profile DTO.
* `PATCH /api/account/profile`: Allows updating only allowlisted fields: `firstName`, `lastName`, `displayName`, `phone`.
* `GET /api/account/preferences`: Retrieves communication preferences.
* `PATCH /api/account/preferences`: Allows updating `marketingEmail`, `marketingSms`, `marketingWhatsapp`.

---

## 5. Security & Privacy

1. **No Client-Controlled Identity**: Customers can never pass `customerId` in query params or request bodies to access data. Identity is always resolved server-side from the authenticated session.
2. **No Passwords in MongoDB**: Local database has zero credential fields.
3. **No Sensitive Leaks**: API error responses never disclose internal stack traces or database errors in production.
4. **Cache Controls**: All customer account APIs set `Cache-Control: private, no-store, no-cache, must-revalidate`.
