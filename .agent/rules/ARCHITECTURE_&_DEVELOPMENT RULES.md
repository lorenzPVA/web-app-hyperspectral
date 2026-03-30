---
trigger: model_decision
description: This document defines the physical layout of the repository and the strict engineering rules required to maintain velocity and prevent technical debt during the prototyping phase. Do not deviate from these constraints without architectural review.
---

**Stack:** TypeScript, React (Vite), Express, Prisma (SQLite)

## 1. REPOSITORY TOPOLOGY
Navigate the project using this structure. Do not create new top-level directories.

* `/backend/` - The Node.js server boundary.
    * `/prisma/schema.prisma` - The single source of truth for the database schema.
    * `/src/server.ts` - The Express API entry point. All routes live here until file size exceeds 500 lines.
* `/frontend/` - The React application boundary.
    * `/src/App.tsx` - Core UI component and state container.
    * `/src/api.ts` - All `fetch` calls to the backend must be isolated here.
* `/mock_storage/` - Local simulation of the S3 bucket. Never commit actual `.raw` or `.hdr` files to Git.

## 2. ARCHITECTURAL INVARIANTS
These are the non-negotiable rules of the system design.

1.  **Keep the Database Flat:** The `Scan` metadata table must remain a flat relational structure. Do not introduce JSON columns, nested tables, or PostGIS spatial extensions. The prototype relies on simple bounding box floats (`bbox_min_lon`, `bbox_max_lat`).
2.  **No Raw Data in the Database:** The SQLite database stores text and numbers only. Heavy binary data (`.raw`) remains entirely in `/mock_storage/`. The DB only stores the `storage_url` pointer.
3.  **Single Source of Truth for Types:** The Prisma schema (`schema.prisma`) dictates the shape of the data. The frontend `ScanMetadata` interface must perfectly mirror the Prisma output. Do not maintain divergent data models.

## 3. STRICT CODING STANDARDS
Write boring, predictable code. Premature optimization will kill this prototype.

* **Explicit Typing:** `any` is strictly forbidden. All variables, function parameters, and API responses must have explicit TypeScript interfaces.
* **Fail Fast:** If an upload is missing a bounding box or acquisition time, the backend must immediately reject it with a `400 Bad Request`. Do not attempt to guess or interpolate missing metadata.
* **Zero Redundant State:** Do not use Redux or Zustand. Use standard React `useState` and pass props down. The application is entirely driven by the API response; do not cache stale data in the frontend.
* **CSS Minimalism:** Do not install massive component libraries (Material UI, Ant Design) for the prototype. Use plain CSS or standard HTML elements to visualize the data quickly. Function dictates form.

## 4. DEPLOYMENT & EXECUTION
* **Backend:** `cd backend && npx prisma db push && npm run dev`
* **Frontend:** `cd frontend && npm run dev`
* Additional run.sh that could run everything in single sh file