# External Payment Adapter Boundary (`lib/payments`)

## Overview
Isolates payment gateway SDKs (Razorpay, Cashfree, Stripe) behind a standardized payment provider contract.

## Rule
Zero payment credentials or SDK references are instantiated in Phase 01.
Implementation deferred to Phase 10.
