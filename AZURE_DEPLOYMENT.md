# Azure Deployment Guide (TESTIFY)

This project is ready for:
- Backend: Azure App Service (Linux, Python)
- Frontend: Azure App Service (Linux, Node.js, Next.js)

## 1) Backend (Azure App Service)

Create an App Service (Linux, Python 3.12). Then configure startup command:

```bash
bash startup.sh
```

The startup script is in [backend/startup.sh](backend/startup.sh).

### Required backend app settings

Use [backend/.env.azure.example](backend/.env.azure.example) as template. Minimum required values:

- `SECRET_KEY`
- `DATABASE_URL`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`

### Important for cookie auth across Azure domains

Because frontend and backend are on different domains, set:

- `AUTH_COOKIE_SECURE=True`
- `AUTH_COOKIE_SAMESITE=None`

Without this, login/refresh cookies are often blocked by browsers.

## 2) Frontend (Azure App Service)

Create a second App Service (Linux, Node.js 20+) for the frontend.

Use these commands in the frontend app service:

- Build command: `npm ci && npm run build`
- Startup command: `npm run start -- -H 0.0.0.0 -p $PORT`

Set frontend app setting:

- `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-app>.azurewebsites.net/api`

## 3) GitHub secrets for CI/CD

Add these repository secrets:

- `AZURE_BACKEND_APP_NAME`
- `AZURE_BACKEND_PUBLISH_PROFILE`
- `AZURE_FRONTEND_APP_NAME`
- `AZURE_FRONTEND_PUBLISH_PROFILE`
- `NEXT_PUBLIC_API_BASE_URL`

Then use workflows:

- [.github/workflows/azure-backend-appservice.yml](.github/workflows/azure-backend-appservice.yml)

## 4) Post-deploy validation

1. Backend health check:

```bash
curl -i https://<your-backend-app>.azurewebsites.net/api/auth/me/
```

Expected without login: `401 Unauthorized`.

2. Frontend loads and routes correctly:

- `/`
- `/login-selection`
- `/admin-login`

3. OTP flow:

- Send OTP from admin signup
- Check backend logs if email fails

## 5) Common issues

- Login fails silently: check `AUTH_COOKIE_SAMESITE=None` and `AUTH_COOKIE_SECURE=True`
- CORS blocked: verify exact frontend URL in `CORS_ALLOWED_ORIGINS`
- CSRF blocked: verify exact frontend and backend HTTPS URLs in `CSRF_TRUSTED_ORIGINS`
- OTP failure: verify SMTP credentials and provider limits
