# Frontend Master Plan

## Purpose
Build a premium, fully responsive Web3 crowdfunding frontend for the Polygon ecosystem using a Next.js App Router architecture, TypeScript, Tailwind CSS, wagmi, viem, Apollo Client, and Framer Motion.

## Current Workspace Analysis
- The frontend currently uses the Next.js Pages Router.
- Existing implementation is JavaScript-based and must be migrated to TypeScript for the new UI system.
- The current Tailwind config uses a lighter neon theme and must be replaced with the "Premium Nebula" palette.
- The frontend dependency set is sufficient for the current scaffold, but the design system phase will require additional packages for animation, charts, toasts, and Apollo integration if they are not already present.

## Design System Direction
- Use a deep indigo/black background with layered radial gradients.
- Use neon amethyst and electric cyan as the primary interaction accents.
- Use glassmorphism surfaces with `bg-white/5`, `backdrop-blur-xl`, and `border-white/10`.
- Use a serif display font for headings and a clean sans-serif for body copy.
- Favor floating, layered layouts and glowing edge treatments rather than flat cards.

## Execution Phases

### Phase 1: Foundation & Theme Setup
- Set up the Next.js App Router structure.
- Replace the current Tailwind config with the requested premium palette and typography tokens.
- Create the global viewport background and root layout.
- Add the responsive navigation shell for desktop and mobile.
- Initialize wagmi and Apollo Client providers at the root.

### Phase 2: UI Library
- Phase 2 is complete.
- Build a typed `Button` component with loading states.
- Build a reusable `GlassCard` container.
- Build a motion-enabled `ProgressBar`.
- Build the trust-focused `IdentityBadge` component.

### Phase 3: Explore Campaigns Page
- Create the campaign feed grid in `app/page.tsx`.
- Build the hero section with editorial typography and overlapping stat cards.
- Render campaign cards with staggered Framer Motion entry.
- Assume campaign metadata is served from MongoDB while funding totals come from The Graph.

### Phase 4: Campaign Detail View
- Build the immersive campaign detail layout in `app/campaign/[id]/page.tsx`.
- Add the milestone tracker with proof modal.
- Add the sticky pledge and DAO voting widgets on the right column.

## Implementation Rules
- All new components must be written in TypeScript.
- Use Framer Motion for hover, tap, layout, and modal transitions.
- Use soft dark-mode text tones instead of pure white.
- Reflect Web3 async states with loading, success, and error feedback.
- Keep contract interaction, Graph reads, and Mongo-backed metadata isolated in separate layers.

## Current Gate
- Phase 1 and Phase 2 are complete.
- Wait for the next explicit phase command before building Phase 3 or 4.
- This file remains the working plan for the frontend rewrite.