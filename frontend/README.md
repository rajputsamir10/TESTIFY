# TESTIFY Frontend

Role-based React client for the TESTIFY online examination platform.

## What this app includes

- Separate experiences for admin, teacher, and student users
- Role-protected routes and session-aware redirects
- Exam flow for students (instructions, disclaimer, attempt, results)
- Teacher authoring and evaluation flows
- Coding-answer support with teacher-locked language rules
- Cookie-based authentication with refresh handling
- Global theme toggle and route transition loader

## Stack

- React 19
- Vite 8
- React Router 6
- Axios
- Tailwind CSS
- React Hook Form + Zod

## Prerequisites

- Node.js 18+
- npm 9+
- Running TESTIFY backend API

## Environment

The client reads `VITE_API_BASE_URL`.

Current local default in `.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Notes:

- If `VITE_API_BASE_URL` is not set, the client falls back to `/api`.
- Vite dev server proxies `/api` to `http://127.0.0.1:8000`.

## Local development

1. Start backend server first (Django API available at `http://127.0.0.1:8000`).
2. Install dependencies:

```bash
npm install
```

3. Start Vite dev server:

```bash
npm run dev
```

4. Open the printed local URL (typically `http://127.0.0.1:5173`).

## Available scripts

- `npm run dev` - start development server
- `npm run build` - create production build in `dist/`
- `npm run preview` - preview built app locally
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

Deploy the generated `dist/` output using your static hosting setup, and ensure API/CORS/cookie settings are configured for your frontend origin.

## Troubleshooting

- `401` loops usually indicate missing/expired refresh cookie or mismatched cookie domain/samesite settings.
- CORS issues typically come from backend `CORS_ALLOWED_ORIGINS` or `CSRF_TRUSTED_ORIGINS` mismatch.
- If API calls fail in development, confirm backend is running and `VITE_API_BASE_URL` is correct.
