# MilestoneChain System Development Plan

## Purpose

This plan turns the current crowdfunding platform into a dependable end-to-end product: donors can discover and fund campaigns, creators can launch and manage milestone-based campaigns, admins can moderate the platform, and backend/blockchain services stay observable and recoverable.

## Current Architecture

- Frontend: Vite + React + React Router + TanStack Query + Apollo Client + Wagmi + Clerk. It owns campaign discovery, campaign creation, donation UX, milestone review screens, wallet/sign-in flows, notifications, analytics, ledger views, and admin screens.
- Backend: Express + MongoDB/Mongoose + GraphQL Yoga + REST routes. It owns campaign metadata, user records, donation records, notification records, media/proof uploads, webhook ingestion, admin moderation, cache access, and blockchain state aggregation.
- Blockchain: Hardhat contracts and scripts. It owns campaign factory deployment, contribution recording, milestone proof/voting/release state, refunds, and event emission.
- External services: MongoDB Atlas, Upstash Redis, Cloudinary, Pinata IPFS, Resend, Clerk, Polygon Amoy RPC/Alchemy, WalletConnect.

## Core User Flows

1. Donor onboarding: connect wallet -> sign in with Clerk Web3 auth -> browse campaigns -> inspect campaign details -> donate on-chain -> backend records donation -> donor sees ledger/history/notifications.
2. Creator campaign launch: connect wallet -> sign in -> create campaign metadata -> deploy/register contract -> upload cover/proof assets -> backend stores campaign -> campaign becomes discoverable.
3. Milestone review: creator submits proof -> proof is pinned to IPFS -> donors/reviewers vote -> contract releases tranche or blocks release -> backend processes events and sends notifications.
4. Admin operations: admin signs in -> guard verifies wallet role -> dashboard loads stats and service health -> admin manages users and campaign flags/status.
5. Platform observability: health endpoints report critical service readiness -> service test script validates configured integrations -> build/test pipeline catches frontend/backend contract drift.

## Service Responsibilities

- `backend/src/app.js`: API composition, CORS, webhook raw body route, GraphQL mount, health route, REST route mounting, global error handling.
- `backend/src/config/env.js`: all required and optional environment configuration.
- `backend/src/config/db.js`: MongoDB connection with retry and clear Atlas/IP whitelist guidance.
- `backend/src/services/cacheService.js`: Redis-backed cache helpers with graceful degradation when Redis is unavailable or misconfigured.
- `backend/src/services/campaignService.js`: campaign metadata and blockchain state composition.
- `backend/src/services/blockchainService.js`: RPC/contract reads and chain state normalization.
- `backend/src/services/pinataService.js`: proof/metadata pinning to IPFS.
- `backend/src/services/cloudinaryService.js`: campaign cover/media uploads.
- `backend/src/services/emailService.js`: notification email dispatch through Resend.
- `backend/src/controllers/adminController.js`: admin user/campaign moderation, platform stats, platform health.
- `frontend/src/lib/api.ts`: single REST API contract used by pages and components.
- `frontend/src/providers/AppProviders.tsx`: Wagmi, React Query, Apollo, toast providers.
- `frontend/src/routes/admin/*`: guarded admin dashboard, users, and campaign moderation.

## Integration Contracts To Keep Stable

- Admin campaign flagging must send `{ flagged, flagReason }` and read backend field `flagged`.
- Campaign status values must match backend validators: `draft`, `active`, `completed`, `cancelled`, `suspended`.
- Admin health must return `health.mongodb`, `health.redis`, `health.pinata`, `health.cloudinary`, `health.resend`, and `health.overall` for the dashboard.
- API client should inject Clerk auth tokens centrally; route components should not pass unused auth arguments to API methods.
- Cache service must expose generic `getCached`, `setCached`, `invalidate`, and campaign-specific invalidation helpers.

## Changes Completed In This Pass

- Fixed backend service smoke test database import to use `connectDatabase(process.env.MONGODB_URI)`.
- Added `invalidate(key)` export to the cache service for Redis integration tests.
- Made Redis cache reads/writes/invalidation degrade gracefully on Upstash errors instead of crashing request flows.
- Aligned frontend admin flag requests with backend validator by sending `flagReason` instead of `reason`.
- Added `flagged` to the frontend campaign API type and admin moderation logic.
- Replaced invalid admin status option `paused` with backend-supported `suspended`.
- Removed generated/undefined `useAuth`, `useAccount`, `siwe`, and `getToken` usage from admin pages where the route guard and API client already handle auth.
- Updated admin health response to include the service shape rendered by the dashboard.

## Verification Performed

- Frontend production build: `npm run build` in `frontend` passed.
- Backend import smoke: `node -e "require('./src/app')"` in `backend` passed.
- Cache export smoke: confirmed `cacheService.invalidate` is exported.
- Vite dev server: `http://127.0.0.1:3000` returned HTTP 200.
- Client routes: `/explore` and `/admin` returned HTTP 200 through Vite history fallback.`r`n- Blockchain fallback test: `npx hardhat test` passed on Hardhat local network with 1 passing contract test.

## Known Verification Gaps

- `npx tsc --noEmit` is blocked by a parse error in the installed `node_modules/csstype/index.d.ts`, likely from a corrupted or incompatible dependency install. Reinstalling dependencies or pinning a stable TypeScript version should be done next.
- Playwright CLI was fetched, but Chromium browser download timed out, so screenshot/console-based rendered QA could not be completed in this pass.
- Full `backend/test-services.js` was not run end-to-end because it performs real third-party operations against MongoDB, Redis, Cloudinary, Pinata, and Resend.
- Configured blockchain `npm test` currently requires Ganache on `127.0.0.1:7545`; it failed when Ganache was not running. Use `npx hardhat test` for local in-process contract checks or start Ganache before `npm test`.

## Priority Development Roadmap

### P0: Stabilize Build And Runtime Checks

- Add explicit scripts: `frontend:typecheck`, `backend:smoke`, `blockchain:test`, and root `test:all`.
- Reinstall or normalize frontend dependencies so `tsc --noEmit` can parse dependencies cleanly.
- Add CI steps for frontend build, frontend typecheck, backend import smoke, and Hardhat tests.
- Add route-level rendered smoke tests for `/`, `/explore`, `/campaign/:id`, `/create-campaign`, `/wallet`, `/admin`.

### P1: Finish Backend/Frontend Contract Hardening

- Generate or centralize shared API types for campaigns, donations, users, notifications, and admin health.
- Normalize `flagged`/`isFlagged` naming to a single field across backend and frontend.
- Add admin endpoints for platform-wide donations/ledger so `LedgerPage` can support true admin mode.
- Add consistent error response shapes for all REST endpoints.
- Add query invalidation after campaign creation, donation recording, proof upload, and moderation updates.

### P2: Improve Core Platform Workflows

- Donation flow: verify wallet chain -> validate amount -> submit transaction -> wait for receipt -> record donation -> show receipt and ledger update.
- Campaign creation: validate milestones total target -> upload media -> deploy/register contract -> persist metadata -> navigate to management screen.
- Milestone proof flow: upload proof -> pin to IPFS -> submit contract proof -> notify donors/reviewers.
- Notifications: mark read/unread, pagination, optional email triggers, and event-driven creation.

### P3: Service Observability And Reliability

- Expand `/health` with latency checks for MongoDB and optional configured services.
- Keep public `/health` lightweight and make `/api/admin/health` detailed and authenticated.
- Add structured logging around uploads, donation recording, webhooks, and blockchain event processing.
- Add retry/backoff wrappers for Pinata, Cloudinary, Resend, and RPC reads.
- Add cache key invalidation after campaign mutations and event processing.

### P4: Performance And UX Polish

- Code-split heavy frontend routes with `React.lazy` and route-level suspense to reduce the current large bundle warning.
- Memoize expensive derived campaign lists and dashboard summaries where needed.
- Add empty, loading, error, and retry states for every data-driven page.
- Review mobile layouts for tables: admin users, admin campaigns, ledger, donations, and milestone reviews.
- Add accessible labels/tooltips for icon-only actions.

## Recommended Test Matrix

- Frontend static: `npm run build`, `npm run typecheck`, lint once configured.
- Frontend rendered: homepage load, explore search/filter, campaign detail, wallet connect shell state, admin guard redirect, admin dashboard authenticated state.
- Backend static: import smoke, env validation smoke, route registration smoke.
- Backend integration: MongoDB connection, Redis set/get/del, Cloudinary upload, Pinata JSON/file pin, Resend dry-run or test email.
- API contract: campaigns list/detail/create, donations list/stats/record, users upsert/get, notifications list/read, admin users/roles, admin campaign flag/status, admin stats/health.
- Blockchain: factory deploy, campaign creation, contribution, proof submission, voting, tranche release, refund path, emitted events.
- End-to-end: create campaign -> donate -> submit proof -> vote -> release funds -> ledger/notifications reflect state.

## Immediate Next Actions

1. Normalize dependency/tooling so TypeScript checks run successfully.
2. Complete Playwright Chromium install and capture desktop/mobile screenshots for core routes.
3. Add a non-destructive backend smoke script that does not upload files or send email unless explicitly enabled.
4. Add route-level lazy loading to reduce the Vite bundle warning.
5. Build a small seeded local/dev dataset for campaigns, donations, users, notifications, and flagged campaigns.

