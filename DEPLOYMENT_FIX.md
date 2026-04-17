# Render Deployment Fix Guide

## Problem
Django migrations fail during Render deployment with:
```
django.db.utils.OperationalError: connection to server at 
"db.ekorjtlzobipgzpdbfig.supabase.co" failed: Network is unreachable
```

## Root Cause
**Supabase is blocking Render's IP address** due to network restrictions.

---

## Solution 1: Fix Supabase IP Whitelist (IMMEDIATE)

### Step 1: Go to Supabase Dashboard
- https://supabase.com/dashboard
- Select your project
- Click **Settings** → **Network**

### Step 2: Check IP Restrictions
Look for **IP Whitelist** or **Network Restrictions** section:

**If empty/no restrictions:**
- ✅ Your IP restrictions are already disabled
- Problem is elsewhere - check Supabase status page

**If there's an IP list:**
- Remove all restrictions temporarily (for testing)
- OR get Render's outbound IPs and add them

### Step 3: Redeploy on Render
1. Go to: https://dashboard.render.com/web/srv-d7gv5o7aqgkc739k7khg
2. Click **Manual Deploy** → **Deploy Latest Commit**
3. Watch logs for migration success

---

## Solution 2: Update render.yaml (Migrations Retry)

If Solution 1 doesn't work, edit your [render.yaml](../render.yaml):

```yaml
services:
  - type: web
    name: testify-backend
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: |
      bash -c '
      set -e
      for i in {1..5}; do
        echo "Migration attempt $i..."
        python manage.py migrate --noinput && break
        if [ $i -lt 5 ]; then sleep 10; fi
      done
      python manage.py collectstatic --noinput
      gunicorn testify_backend.wsgi:application --bind 0.0.0.0:$PORT
      '
    # ... rest of config
```

This adds **5 retry attempts** with 10-second delays.

---

## Solution 3: Test Connection Locally

Run this before deploying:

```bash
cd e:\TESTIFY
python test_db_connection.py
```

Expected output:
```
Testing connection to: postgresql://...
  Host: db.ekorjtlzobipgzpdbfig.supabase.co
  Port: 5432
  Database: postgres
  User: postgres
✅ SUCCESS: Database connection successful!
```

If it fails locally, the DATABASE_URL is wrong.

---

## Verification Steps

After fixing, verify your deployment:

### 1. Check Backend Health
```bash
curl https://testify-backend.onrender.com/api/auth/me/
```
Expected: `401 Unauthorized` (no auth) - this means backend is running!

### 2. Check Logs on Render
- Navigate to your service: https://dashboard.render.com/web/srv-d7gv5o7aqgkc739k7khg
- Click **Logs** tab
- Look for "Applied N migrations" or "Running on 0.0.0.0:10000"

### 3. Test Database from Render Shell
- Click **Shell** tab on Render
- Run:
```bash
python manage.py dbshell
SELECT 1;
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Network is unreachable" | ➡️ Fix Supabase IP whitelist |
| "FATAL: password authentication failed" | ➡️ Check DATABASE_URL has correct password |
| "database does not exist" | ➡️ Check DATABASE_URL points to correct DB |
| "sslmode error" | ➡️ Ensure `?sslmode=require` in DATABASE_URL |
| Migrations timeout | ➡️ Use retry strategy in render.yaml |

---

## Next Steps

1. ✅ Check Supabase IP whitelist settings
2. ✅ Run `python test_db_connection.py` locally
3. ✅ Redeploy on Render
4. ✅ Check logs for success
5. ✅ Test backend with curl command above

If still failing, share the **latest logs from Render** and I'll help debug further!
