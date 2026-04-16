# TESTIFY Frontend

Role-based Next.js client for the TESTIFY online examination platform.

## What this app includes

- Separate experiences for admin, teacher, and student users
- Role-protected routes and session-aware redirects
- Exam flow for students (instructions, disclaimer, attempt, results)
- Teacher authoring and evaluation flows
- Coding-answer support with teacher-locked language rules
- Cookie-based authentication with refresh handling
- Global theme toggle and route transition loader

## Stack

- Next.js 16
- React 19
- Axios
- Tailwind CSS
- React Hook Form + Zod

## Prerequisites

- Node.js 18+
- npm 9+
- Running TESTIFY backend API

## Environment

The client reads `NEXT_PUBLIC_API_BASE_URL`.

Current local default in `.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

Notes:

- If `NEXT_PUBLIC_API_BASE_URL` is not set, the client falls back to `/api`.
- The app now runs on the Next.js dev server; no Vite proxy is used.

## Local development

1. Start backend server first (Django API available at `http://127.0.0.1:8000`).
2. Install dependencies:

```bash
npm install
```

3. Start the Next.js dev server:

```bash
npm run dev
```

4. Open the printed local URL (typically `http://127.0.0.1:5173`).

## Available scripts

- `npm run dev` - start development server
- `npm run build` - create production build
- `npm run start` - start the production server locally
- `npm run lint` - run ESLint

## Authentication behavior

- API requests are sent with credentials enabled.
- Session tokens are managed through secure cookies.
- On `401`, the client attempts refresh via `/auth/token/refresh/` and retries once.
- If refresh fails, user is redirected to role-specific login.

## Build for production

```bash
npm ci
npm run build
```

Deploy the Next.js app as a Node server or platform-supported web app, and ensure API/CORS/cookie settings are configured for your frontend origin.

## Troubleshooting

- `401` loops usually indicate missing/expired refresh cookie or mismatched cookie domain/samesite settings.
- CORS issues typically come from backend `CORS_ALLOWED_ORIGINS` or `CSRF_TRUSTED_ORIGINS` mismatch.
- If API calls fail in development, confirm backend is running and `NEXT_PUBLIC_API_BASE_URL` is correct.
