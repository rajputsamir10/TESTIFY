#!/usr/bin/env python
"""Test database connectivity before deployment."""

import os
import sys
import psycopg2
from urllib.parse import urlparse

# Load environment
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not set")
    sys.exit(1)

print(f"Testing connection to: {DATABASE_URL[:50]}...")

try:
    # Parse the URL
    parsed = urlparse(DATABASE_URL)
    print(f"  Host: {parsed.hostname}")
    print(f"  Port: {parsed.port or 5432}")
    print(f"  Database: {parsed.path.lstrip('/')}")
    print(f"  User: {parsed.username}")
    
    # Try to connect
    conn = psycopg2.connect(DATABASE_URL)
    print("✅ SUCCESS: Database connection successful!")
    
    # Test query
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    print(f"  PostgreSQL Version: {cursor.fetchone()[0][:50]}...")
    
    cursor.close()
    conn.close()
    
except psycopg2.OperationalError as e:
    print(f"❌ ERROR: Cannot connect to database")
    print(f"  Details: {str(e)}")
    sys.exit(1)
except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    sys.exit(1)
