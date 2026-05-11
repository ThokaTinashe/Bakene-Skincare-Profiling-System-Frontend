# Skin Profile CRM – PRD

## Problem Statement
Secure, internal web CRM for skincare consultations. Manage client skin profiles, track progress over time with structured data and before/after images, maintain consultation history and product usage. Roles: Admin, Consultant, Viewer. POPIA-compliant intent.

## Stack
- Backend (reference): FastAPI + MongoDB + JWT auth + Emergent Object Storage
- Frontend: React 19, React Router 7, Tailwind, Shadcn/UI, lucide-react, sonner
- User has their own backend they'll wire to the same `/api/*` contract

## API Contract (consumed by frontend)
- POST `/api/auth/login`, `/api/auth/logout`, GET `/api/auth/me` (httpOnly cookie based)
- GET/POST/PATCH/DELETE `/api/clients`, `/api/clients/{id}`
- GET/POST `/api/clients/{id}/consultations`, DELETE `/api/consultations/{id}`
- POST `/api/images/upload` (multipart: file, client_id, kind=before|after)
- GET `/api/images/{image_id}` (auth-gated blob), GET `/api/images?client_id=`
- GET `/api/audit-logs` (admin)
- GET/POST/PATCH/DELETE `/api/users` (admin)
- GET `/api/dashboard/stats`

## Implemented (2026-02 — initial build)
- Login (split-screen orange-clinical aesthetic)
- Dashboard: 4 KPI tiles + recent consultations + recent clients
- Clients list with search, skin-type filter, concern filter, clear filters
- Client form (add/edit) — personal, skin profile (with concern chips), product history
- Client Profile: header, contact/skin/product panels, before/after slider compare, vertical consultation timeline with per-visit images, image zoom dialog
- Add Consultation: date, treatment, notes, recommendations, follow-up, products tag input, before & after image upload with preview
- Team (admin): create users, change role, delete (self-delete blocked)
- Audit Trail (admin): chronological list of every action
- AuthContext, ProtectedRoute with role gating, sonner toasts
- `data-testid` on all interactive elements

## Design
- Primary: #E35D3F (coral-orange)
- Typography: Fraunces (display) + IBM Plex Sans (body)
- Clean clinical: white surfaces, left-aligned data grids, generous spacing

## Backlog (Phase 2)
- P1: Date-range filter on consultations list endpoint integration
- P1: Analytics charts (recharts) on dashboard (visits per month, concern distribution)
- P2: Automated follow-up reminders (email/WhatsApp via SendGrid / Twilio)
- P2: AI skin analysis (Gemini Nano Banana for skin texture insight)
- P2: PDF export of client journey for handoff / consent
- P2: Image annotations & area-of-concern markup on uploads

## Test Credentials
See `/app/memory/test_credentials.md` (admin@skinprofile.com / Admin@12345 — only valid against the reference backend).
