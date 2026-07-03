# Point Management System

Monorepo scaffold for the Point Management System.

## First Increment

Implemented in `apps/api`:

- Express + TypeScript API server
- Socket.io server bootstrap
- Prisma schema for users, profiles, points, trips, pings, reports, notifications, and refresh tokens
- Postgres-backed OTP and live-location state
- Student NU-email signup with OTP verification
- Driver registration flow with pending approval
- Login with access + refresh JWTs
- Refresh-token rotation and logout revocation
- `authenticate` and `authorize(...roles)` middleware
- First-admin seed script
- Supabase/PostgreSQL database support

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Generate Prisma client and run migrations:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. Seed the first admin:

   ```bash
   pnpm db:seed
   ```

5. Run the API:

   ```bash
   pnpm dev:api
   ```

Health check: `GET http://localhost:4000/api/health`

## Auth Endpoints

- `POST /api/auth/students/signup`
- `POST /api/auth/students/verify-otp`
- `POST /api/auth/students/resend-otp`
- `POST /api/auth/drivers/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

## Architecture Notes

- Prisma is used as the single ORM.
- OTPs are stored in PostgreSQL ephemeral state with a 10-minute default TTL.
- Latest trip locations are cached in PostgreSQL for Socket.io initial state.
- Access tokens default to 15 minutes; refresh tokens default to 7 days and are stored hashed in PostgreSQL for rotation/revocation.
- Student signup enforces `^[a-zA-Z][0-9]{6}@nu\.edu\.pk$` on the server.
- Socket.io broadcasts trip/location updates to in-process rooms.
