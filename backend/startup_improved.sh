#!/bin/sh
# Improved startup script with connection retry logic

set -e

echo "🚀 Starting TESTIFY Backend..."

# Wait for database to be ready (retry up to 30 seconds)
echo "⏳ Waiting for database connection..."
MAX_RETRIES=6
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if python -c "import django; django.setup(); from django.db import connection; connection.ensure_connection()" 2>/dev/null; then
        echo "✅ Database is ready!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "⚠️  Database not ready yet (attempt $RETRY_COUNT/$MAX_RETRIES), waiting 5 seconds..."
        sleep 5
    else
        echo "❌ Database connection failed after $MAX_RETRIES attempts"
        exit 1
    fi
done

echo "🔄 Running database migrations..."
python manage.py migrate --noinput || {
    echo "❌ Migrations failed!"
    exit 1
}

echo "📦 Collecting static files..."
python manage.py collectstatic --noinput || {
    echo "⚠️  Static file collection failed, continuing..."
}

echo "✨ Starting Gunicorn..."
gunicorn testify_backend.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 3 \
    --worker-class sync \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
