#!/bin/bash

# Update imports from @/db to @/lib/data/system

files=(
  "src/app/api/auth/login/route.ts"
  "src/app/api/calls/[callId]/route.ts"
  "src/app/api/calls/[callId]/token/route.ts"
  "src/app/api/debug/usernames/route.ts"
  "src/app/api/explore/route.ts"
  "src/app/api/profile/[username]/followers/route.ts"
  "src/app/api/profile/[username]/following/route.ts"
  "src/app/api/profile/[username]/route.ts"
  "src/app/api/shows/[showId]/route.ts"
  "src/app/api/streams/[streamId]/broadcast-token/route.ts"
  "src/app/api/streams/[streamId]/gift/route.ts"
  "src/app/api/streams/[streamId]/join/route.ts"
  "src/app/api/streams/[streamId]/leave/route.ts"
  "src/app/api/streams/[streamId]/message/route.ts"
  "src/app/api/streams/[streamId]/token/route.ts"
  "src/lib/calls/call-service.ts"
  "src/lib/content/content-service.ts"
  "src/lib/explore/follow-service.ts"
  "src/lib/messages/message-service.ts"
  "src/lib/wallet/wallet-service.ts"
  "src/lib/shows/show-service.ts"
  "src/lib/services/call-service.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Replace db imports
    sed -i '' "s|from '@/db'|from '@/lib/data/system'|g" "$file"
    sed -i '' "s|from '@/db/schema'|from '@/lib/data/system'|g" "$file"
    echo "✓ Updated: $file"
  else
    echo "✗ Not found: $file"
  fi
done

echo ""
echo "✓ Import updates complete!"
