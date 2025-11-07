#!/bin/bash

# CI Check: Ensure Drizzle imports are only in Node.js runtime contexts
# This prevents Edge runtime errors on Vercel

echo "🔍 Checking Drizzle ORM runtime safety..."
echo ""

ERRORS=0

# Check 1: Client components should never import Drizzle
echo "📱 Checking client components..."
CLIENT_VIOLATIONS=$(grep -r "use client" src --include="*.tsx" --include="*.ts" -l | \
  xargs grep -l "from '@/lib/data/system'\|from '@/db'" 2>/dev/null || true)

if [ -n "$CLIENT_VIOLATIONS" ]; then
  echo "❌ FAIL: Client components importing Drizzle:"
  echo "$CLIENT_VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ PASS: No client components import Drizzle"
fi

echo ""

# Check 2: API routes importing Drizzle must have Node runtime export
echo "🚀 Checking API routes for Node runtime..."
ROUTE_VIOLATIONS=0

# Find all route files that import Drizzle
find src/app/api -name "route.ts" -type f | while read file; do
  # Check if file imports Drizzle
  if grep -q "from '@/lib/data/system'\|from '@/db'" "$file"; then
    # Check if it has runtime export
    if ! grep -q "export const runtime.*=.*['\"]nodejs['\"]" "$file"; then
      echo "❌ Missing runtime='nodejs': $file"
      ERRORS=$((ERRORS + 1))
      ROUTE_VIOLATIONS=$((ROUTE_VIOLATIONS + 1))
    fi
  fi
done

if [ $ROUTE_VIOLATIONS -eq 0 ]; then
  echo "✅ PASS: All Drizzle routes have Node runtime"
else
  echo "❌ FAIL: $ROUTE_VIOLATIONS routes missing Node runtime export"
fi

echo ""

# Check 3: Verify DATABASE_URL uses transaction pooler (6543)
echo "🔌 Checking database connection configuration..."
if [ -f .env.local ]; then
  if grep -q "DATABASE_URL.*:6543" .env.local; then
    echo "✅ PASS: Using transaction pooler (port 6543)"
  else
    echo "⚠️  WARNING: DATABASE_URL should use port 6543 (transaction pooler)"
    if grep -q "DATABASE_URL.*:5432" .env.local; then
      echo "   Currently using direct connection (5432)"
      echo "   This may cause connection churn on Vercel"
    fi
  fi
else
  echo "⚠️  WARNING: .env.local not found, skipping DB URL check"
fi

echo ""

# Check 4: Services using Drizzle should be documented
echo "📚 Checking service documentation..."
UNDOCUMENTED=0

# List of services that use Drizzle
DRIZZLE_SERVICES=(
  "src/lib/streams/stream-service.ts"
  "src/lib/wallet/wallet-service.ts"
  "src/lib/calls/call-service.ts"
  "src/lib/shows/show-service.ts"
)

for service in "${DRIZZLE_SERVICES[@]}"; do
  if [ -f "$service" ]; then
    if ! grep -q "Must be used with Node.js runtime\|Node runtime\|runtime.*nodejs" "$service"; then
      echo "⚠️  WARNING: $service missing runtime documentation"
      UNDOCUMENTED=$((UNDOCUMENTED + 1))
    fi
  fi
done

if [ $UNDOCUMENTED -eq 0 ]; then
  echo "✅ PASS: All services documented"
else
  echo "⚠️  $UNDOCUMENTED services need runtime documentation"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Found $ERRORS critical issues"
  echo ""
  echo "Fix these issues before deploying to prevent Edge runtime errors."
  echo "See docs/DATABASE_ACCESS_PATTERNS.md for guidelines."
  exit 1
fi
