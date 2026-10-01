# External Auth Adapter Boundary (`lib/auth`)

## Overview
Isolates 3rd-party authentication providers (e.g. Clerk, NextAuth, Firebase) behind a consistent interface.

## Rule
Domain services in `modules/auth` interact exclusively with this adapter, ensuring the application remains decoupled from third-party vendor APIs.
Implementation deferred to Phase 05.
