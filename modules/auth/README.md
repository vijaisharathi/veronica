# Authentication & Identity Domain (`modules/auth`)

## Overview
Manages customer and administrative identity, credentials, role-based access control (RBAC), and session lifecycles.

## Roadmap Phase
**Phase 05 — Customer Authentication & Identity Management**
**Phase 06 — Admin Authorization & Staff Permissions**

## Architecture & Responsibilities
- User account creation, social login, and password management.
- Session generation and verification via isolated auth adapters (`lib/auth/`).
- Role assignment and permission matrix evaluation.
- Customer profile retrieval and credential security.

## Boundaries
- UI authentication components belong in `components/auth/` or `app/(storefront)/(auth)/`.
- Domain services (`auth.service.ts`) execute validation and business logic.
- Persistence is handled via `auth.repository.ts`.
