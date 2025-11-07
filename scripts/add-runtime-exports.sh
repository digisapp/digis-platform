#!/bin/bash

# Add Node runtime exports to API routes that use Drizzle
# This prevents Edge runtime issues on Vercel

add_runtime_export() {
  local file=$1

  # Check if file already has runtime export
  if grep -q "export const runtime" "$file"; then
    echo "✓ Already has runtime export: $file"
    return
  fi

  # Find the line number after the last import
  local last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

  if [ -z "$last_import_line" ]; then
    echo "✗ No imports found in: $file"
    return
  fi

  # Insert runtime exports after last import
  local runtime_exports="\n// Force Node.js runtime for Drizzle ORM\nexport const runtime = 'nodejs';\nexport const dynamic = 'force-dynamic';\n"

  # Use sed to insert after the last import line
  sed -i '' "${last_import_line}a\\
\\
// Force Node.js runtime for Drizzle ORM\\
export const runtime = 'nodejs';\\
export const dynamic = 'force-dynamic';
" "$file"

  echo "✓ Added runtime export: $file"
}

# Streaming endpoints
add_runtime_export "src/app/api/streams/[streamId]/route.ts"
add_runtime_export "src/app/api/streams/live/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/broadcast-token/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/end/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/gift/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/join/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/leaderboard/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/leave/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/message/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/messages/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/token/route.ts"
add_runtime_export "src/app/api/streams/[streamId]/viewers/route.ts"

# Profile/explore endpoints
add_runtime_export "src/app/api/profile/[username]/route.ts"
add_runtime_export "src/app/api/profile/[username]/followers/route.ts"
add_runtime_export "src/app/api/profile/[username]/following/route.ts"
add_runtime_export "src/app/api/explore/route.ts"

# Calls endpoints
add_runtime_export "src/app/api/calls/[callId]/route.ts"
add_runtime_export "src/app/api/calls/[callId]/token/route.ts"

# Shows endpoint
add_runtime_export "src/app/api/shows/[showId]/route.ts"

echo ""
echo "✓ Runtime exports added successfully!"
