# Stream Goals Widget - Usage Guide

## 🎯 Features

- **Animated Progress Bars** with neon glow effects
- **Real-time Updates** as gifts/viewers are received
- **Goal Completion Celebration** with confetti and trophy animation
- **Multiple Goal Support** (up to 3 displayed simultaneously)
- **Compact Overlay Mode** for minimalist stream display
- **Glassmorphism Design** matching Digis aesthetic

---

## 📦 Components

### 1. `StreamGoalsWidget`
Main widget for displaying stream goals with full details.

### 2. `StreamGoalsOverlay`
Minimal overlay version for on-stream display.

### 3. `GoalCompletionCelebration`
Full-screen celebration animation when a goal is completed.

---

## 🚀 Usage Example

### In Your Stream Page:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { StreamGoalsWidget, StreamGoalsOverlay } from '@/components/stream/StreamGoalsWidget';
import { GoalCompletionCelebration } from '@/components/stream/GoalCompletionCelebration';

export default function StreamPage({ streamId }: { streamId: string }) {
  const [goals, setGoals] = useState([]);
  const [completedGoal, setCompletedGoal] = useState(null);

  // Fetch goals from API
  useEffect(() => {
    async function fetchGoals() {
      const res = await fetch(`/api/streams/${streamId}/goals`);
      const data = await res.json();
      setGoals(data.goals);
    }

    fetchGoals();

    // Set up real-time updates (every 5 seconds or via websocket)
    const interval = setInterval(fetchGoals, 5000);
    return () => clearInterval(interval);
  }, [streamId]);

  return (
    <div className="relative">
      {/* Video player */}
      <div className="aspect-video bg-black">
        {/* LiveKit or your video component */}

        {/* Compact overlay on top of video */}
        <StreamGoalsOverlay goals={goals} />
      </div>

      {/* Full widget below video */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Stream Goals</h2>
        <StreamGoalsWidget
          goals={goals}
          onGoalComplete={(goal) => {
            setCompletedGoal(goal);
            // Play sound, send notification, etc.
          }}
        />
      </div>

      {/* Celebration animation */}
      {completedGoal && (
        <GoalCompletionCelebration
          goalTitle={completedGoal.title}
          rewardText={completedGoal.rewardText}
          triggerKey={completedGoal.id}
          onComplete={() => setCompletedGoal(null)}
        />
      )}
    </div>
  );
}
```

---

## 🎨 Goal Types

### 1. Coins Goal (any gift)
```typescript
{
  title: "Unlock Karaoke",
  description: "Help me reach 1000 coins!",
  goalType: "coins",
  targetAmount: 1000,
  currentAmount: 750,
  rewardText: "I'll sing your song!",
  isActive: true,
  isCompleted: false
}
```

### 2. Specific Gift Goal
```typescript
{
  title: "Rose Rain",
  description: "100 roses for a special dance",
  goalType: "gifts",
  giftId: "rose-gift-id",
  targetAmount: 100,
  currentAmount: 45,
  rewardText: "Special dance performance!",
  isActive: true,
  isCompleted: false
}
```

### 3. Viewer Goal
```typescript
{
  title: "500 Viewers Milestone",
  description: "Let's hit 500 viewers!",
  goalType: "viewers",
  targetAmount: 500,
  currentAmount: 432,
  rewardText: "Private Q&A session!",
  isActive: true,
  isCompleted: false
}
```

---

## 📡 API Endpoints Needed

### GET `/api/streams/:streamId/goals`
Fetch all active goals for a stream.

```typescript
export async function GET(
  request: Request,
  { params }: { params: { streamId: string } }
) {
  const goals = await db
    .select()
    .from(streamGoals)
    .where(
      and(
        eq(streamGoals.streamId, params.streamId),
        eq(streamGoals.isActive, true)
      )
    )
    .orderBy(asc(streamGoals.createdAt));

  return Response.json({ goals });
}
```

### POST `/api/streams/:streamId/goals`
Create a new goal (creator only).

```typescript
export async function POST(
  request: Request,
  { params }: { params: { streamId: string } }
) {
  const body = await request.json();

  const newGoal = await db
    .insert(streamGoals)
    .values({
      streamId: params.streamId,
      title: body.title,
      description: body.description,
      goalType: body.goalType,
      targetAmount: body.targetAmount,
      rewardText: body.rewardText,
      isActive: true,
    })
    .returning();

  return Response.json({ goal: newGoal[0] });
}
```

### PATCH `/api/streams/:streamId/goals/:goalId`
Update goal progress (called when gifts are sent).

```typescript
export async function PATCH(
  request: Request,
  { params }: { params: { streamId: string; goalId: string } }
) {
  const { incrementAmount } = await request.json();

  const [updated] = await db
    .update(streamGoals)
    .set({
      currentAmount: sql`${streamGoals.currentAmount} + ${incrementAmount}`,
      updatedAt: new Date(),
      isCompleted: sql`${streamGoals.currentAmount} + ${incrementAmount} >= ${streamGoals.targetAmount}`,
      completedAt: sql`CASE WHEN ${streamGoals.currentAmount} + ${incrementAmount} >= ${streamGoals.targetAmount} THEN NOW() ELSE NULL END`,
    })
    .where(eq(streamGoals.id, params.goalId))
    .returning();

  return Response.json({ goal: updated });
}
```

---

## 🎮 Real-time Updates

### Option 1: Polling (Simple)
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/streams/${streamId}/goals`);
    const data = await res.json();
    setGoals(data.goals);
  }, 5000); // Every 5 seconds

  return () => clearInterval(interval);
}, [streamId]);
```

### Option 2: WebSocket (Better)
```typescript
useEffect(() => {
  const ws = new WebSocket(`wss://your-api/streams/${streamId}/goals`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'goal_update') {
      setGoals(prev =>
        prev.map(g => g.id === data.goalId ? { ...g, ...data.updates } : g)
      );
    }
  };

  return () => ws.close();
}, [streamId]);
```

### Option 3: Supabase Realtime (Easiest)
```typescript
useEffect(() => {
  const subscription = supabase
    .channel(`stream_goals:${streamId}`)
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stream_goals',
        filter: `stream_id=eq.${streamId}`
      },
      (payload) => {
        setGoals(prev =>
          prev.map(g => g.id === payload.new.id ? payload.new : g)
        );
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [streamId]);
```

---

## 🎨 Customization

### Change Colors
```tsx
<StreamGoalsWidget
  goals={goals}
  className="custom-class" // Add custom styles
/>
```

### Compact Mode (minimal)
```tsx
<StreamGoalsWidget
  goals={goals}
  compact={true} // Shows only progress bar
/>
```

### Different Position
```tsx
{/* Top center */}
<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-96">
  <StreamGoalsWidget goals={goals} compact />
</div>

{/* Bottom */}
<div className="fixed bottom-20 left-4 right-4 z-50">
  <StreamGoalsWidget goals={goals} />
</div>
```

---

## 🧪 Testing

### Mock Data
```typescript
const mockGoals = [
  {
    id: '1',
    title: 'Unlock Dance',
    description: '1000 coins to unlock special dance',
    goalType: 'coins',
    targetAmount: 1000,
    currentAmount: 750,
    rewardText: 'I\'ll do a special dance!',
    isActive: true,
    isCompleted: false,
  },
  {
    id: '2',
    title: '100 Roses',
    description: 'Send me 100 roses!',
    goalType: 'gifts',
    targetAmount: 100,
    currentAmount: 45,
    rewardText: 'Rose rain celebration!',
    isActive: true,
    isCompleted: false,
  },
];
```

---

## 🔥 Tips

1. **Limit Active Goals**: Show max 3 goals to avoid clutter
2. **Auto-complete**: Mark goals as completed when target is reached
3. **Sound Effects**: Play sound when goal completes
4. **Push Notifications**: Notify creator when goal completes
5. **Analytics**: Track which goals drive most engagement
6. **A/B Test**: Test different goal amounts and rewards

---

## 🎬 Demo

Check `/demo/stream-goals` for a live preview with mock data.
