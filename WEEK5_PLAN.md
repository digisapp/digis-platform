# Week 5: Content System (PPV) - Implementation Plan

## Goal
Build a complete pay-per-view content system where creators can upload and monetize exclusive photos, videos, and galleries.

## Exit Criteria
- [x] Creators can upload content with prices
- [x] Fans can browse and purchase content
- [x] Purchased content is permanently unlocked
- [x] Transaction history tracks purchases
- [x] Content library shows owned content
- [x] Creators see earnings per content item

## Database Schema

### 1. Content Items Table
```sql
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES users(id) NOT NULL,

  -- Content Details
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video', 'gallery')),

  -- Pricing
  unlock_price INTEGER NOT NULL, -- In coins
  is_free BOOLEAN DEFAULT false,

  -- Media
  thumbnail_url TEXT NOT NULL,
  media_url TEXT NOT NULL, -- Single file or gallery JSON
  duration_seconds INTEGER, -- For videos

  -- Stats
  view_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,

  -- Status
  is_published BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_creator ON content_items(creator_id, created_at DESC);
CREATE INDEX idx_content_published ON content_items(is_published, created_at DESC);
```

### 2. Content Purchases Table
```sql
CREATE TABLE content_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_items(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,

  -- Transaction
  coins_spent INTEGER NOT NULL,
  transaction_id UUID REFERENCES wallet_transactions(id),

  -- Access
  unlocked_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(content_id, user_id) -- Can only purchase once
);

CREATE INDEX idx_purchases_user ON content_purchases(user_id, unlocked_at DESC);
CREATE INDEX idx_purchases_content ON content_purchases(content_id);
```

### 3. Content Tags Table (Optional - for discovery)
```sql
CREATE TABLE content_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_content ON content_tags(content_id);
CREATE INDEX idx_tags_tag ON content_tags(tag);
```

## API Routes

### Content Management (Creators)
- `POST /api/content/create` - Upload new content
- `GET /api/content/creator/[creatorId]` - Get creator's content
- `PATCH /api/content/[contentId]` - Update content details
- `DELETE /api/content/[contentId]` - Delete content
- `GET /api/content/[contentId]/stats` - Get earnings and stats

### Content Discovery (Fans)
- `GET /api/content/feed` - Browse all content (with filters)
- `GET /api/content/[contentId]` - Get content details
- `POST /api/content/[contentId]/purchase` - Purchase content
- `GET /api/content/library` - User's purchased content

### File Upload
- `POST /api/upload/content` - Upload media files (Supabase Storage)

## Frontend Components

### Creator Side
1. **ContentStudio** (`/creator/content`)
   - List of creator's content
   - Upload button
   - Edit/delete options
   - Earnings per item

2. **ContentUpload Modal**
   - File upload (drag & drop)
   - Title, description inputs
   - Price selector
   - Thumbnail preview
   - Publish button

3. **ContentEditor**
   - Edit existing content
   - Update price
   - Unpublish option

### Fan Side
4. **ContentFeed** (`/content`)
   - Grid of content items
   - Thumbnail previews (blurred for locked)
   - Price display
   - Creator info
   - Filter by type/creator

5. **ContentDetail** (`/content/[contentId]`)
   - Full content view (if owned)
   - Preview + lock overlay (if not owned)
   - Purchase button
   - Creator info
   - Related content

6. **ContentLibrary** (`/content/library`)
   - User's purchased content
   - Grid view
   - Download options
   - Purchase history

### Shared Components
7. **ContentCard**
   - Thumbnail with blur effect if locked
   - Lock icon + price
   - Creator avatar
   - Title
   - Click to view/purchase

8. **PurchaseModal**
   - Content preview
   - Price breakdown
   - Confirm purchase
   - Balance check

## File Upload Strategy

### Supabase Storage
```typescript
// Upload to Supabase Storage
const bucket = 'content-media';

// File organization
content-media/
  ├── photos/
  │   ├── [creator-id]/
  │   │   └── [content-id].jpg
  ├── videos/
  │   ├── [creator-id]/
  │   │   └── [content-id].mp4
  └── thumbnails/
      └── [creator-id]/
          └── [content-id]-thumb.jpg
```

**Benefits:**
- Free 1GB storage (Supabase)
- CDN distribution
- Signed URLs for security
- Direct upload from browser

## Content Service (`src/lib/content/content-service.ts`)

### Key Methods:
```typescript
class ContentService {
  // Create content
  static async createContent(creatorId, data, mediaFile)

  // Purchase content
  static async purchaseContent(userId, contentId)

  // Check if user owns content
  static async hasAccess(userId, contentId)

  // Get content feed
  static async getContentFeed(filters, pagination)

  // Get creator's content
  static async getCreatorContent(creatorId)

  // Get user's library
  static async getUserLibrary(userId)

  // Update stats
  static async incrementViewCount(contentId)
}
```

## Purchase Flow

1. **User clicks "Unlock for X coins"**
2. Check balance → Show error if insufficient
3. Create purchase record
4. Deduct coins from user → wallet transaction
5. Credit coins to creator → wallet transaction
6. Update content stats (purchase_count, total_earnings)
7. Grant access → Redirect to content view

## Security Considerations

### Content Protection
- Signed URLs with expiration
- Watermark overlay (optional)
- Disable right-click/download (client-side deterrent)
- Track unauthorized sharing attempts

### Privacy
- Only show content to:
  - Creator who owns it
  - Users who purchased it
- Blur thumbnails for locked content
- Hide media URLs from frontend

## Testing Checklist

### Creator Flow
- [ ] Upload photo content
- [ ] Upload video content
- [ ] Set unlock price
- [ ] Edit content details
- [ ] Delete content
- [ ] View earnings stats

### Fan Flow
- [ ] Browse content feed
- [ ] Filter by creator/type
- [ ] Purchase content with coins
- [ ] View purchased content
- [ ] Access content library
- [ ] Insufficient balance error

### Edge Cases
- [ ] Duplicate purchase attempt (should error)
- [ ] Deleted content handling
- [ ] Large file uploads (10MB+ videos)
- [ ] Invalid file formats
- [ ] Creator viewing own content (free access)

## Revenue Estimates

**Example Creator Earnings:**
- 10 photos @ 20 coins each
- 100 purchases total = 2,000 coins
- At $0.10/coin = $200 earned
- Platform takes 20% = Creator gets $160

**Scaling:**
- Popular creator with 1,000 fans
- 50 content items average
- 20% conversion = 200 purchases per item
- 50 items × 200 purchases × 20 coins = 200,000 coins
- = $20,000 in sales per month

## Week 5 Tasks (Ordered)

### Day 1: Database + Backend
1. Create database schema
2. Build ContentService
3. Create upload API
4. Create purchase API

### Day 2: File Upload
1. Set up Supabase Storage bucket
2. Implement file upload endpoint
3. Add thumbnail generation
4. Test large file uploads

### Day 3: Creator Tools
1. Build ContentStudio page
2. Create ContentUpload modal
3. Add content management
4. Show earnings stats

### Day 4: Fan Experience
1. Build ContentFeed page
2. Create ContentDetail view
3. Build PurchaseModal
4. Create ContentLibrary

### Day 5: Polish + Testing
1. Add blur effects for locked content
2. Implement filters and search
3. Add watermarks (optional)
4. End-to-end testing
5. Performance optimization

---

**Ready to build the content goldmine!** 💎📸
