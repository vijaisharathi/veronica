# Client State Management (`store/`)

## Overview
Global client state stores (e.g. Zustand) for ephemeral UI interactions such as navigation drawer states, active modals, and currency preferences.

## Rule
Authoritative commerce state (cart items, prices, discounts) must always be computed and verified by server-side domain services.
No state stores are created until required in Phase 02/07.
