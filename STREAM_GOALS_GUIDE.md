# Stream Goals User Guide

## Overview
Stream goals allow creators to set rewards that viewers can unlock by sending gifts during a live stream. When the goal is reached, the creator fulfills the reward (e.g., singing a requested song, doing a challenge, etc.).

## For Broadcasters (Creators)

### Setting a Goal

1. **During your live stream**, click the "Set Goal" button in the broadcaster controls
2. Fill in the goal details:
   - **Title**: Short description (e.g., "Next Song Request")
   - **Target Amount**: Number of coins needed (e.g., 100)
   - **Reward**: What you'll do when goal is reached (e.g., "I'll sing your requested song!")
3. Click "Create Goal"

### Managing Goals

#### Editing a Goal
- Click the **edit icon** (pencil) next to an active goal
- Update the title, target amount, or reward text
- Note: You cannot lower the target below the current progress

#### Ending a Goal
- Click the **end icon** (X) next to an active goal
- Confirm you want to end the goal
- The goal will be removed from the stream

### Important Rules

✓ **Only ONE active goal at a time** - If you try to create a new goal while one is active, you'll be prompted to edit or end the existing goal first

✓ **Can't undo ending a goal** - Once you end a goal, it's gone permanently

✓ **Progress is preserved when editing** - If viewers have already contributed 50 coins, editing the goal won't reset that progress

## For Viewers

### How to Contribute to a Goal

Viewers contribute to stream goals by **sending virtual gifts** to the creator:

1. **Click the gift button** during the stream
2. **Select a gift** from the gift menu
3. **Send the gift** to the creator

The coin value of each gift automatically contributes to the active goal progress!

### How Contributions Work

- **Any gift counts** - All gifts sent during the stream contribute to the active goal
- **Automatic tracking** - You don't need to do anything special - just send gifts as normal
- **Real-time updates** - The goal progress bar updates immediately when you send a gift
- **Leaderboard** - Top gifters are shown on the broadcaster's view

### Example

If the goal is "100 coins for Next Song":
- You send a gift worth 10 coins → Progress: 10/100
- Another viewer sends 25 coins → Progress: 35/100
- You send another 15 coins → Progress: 50/100
- ...and so on until 100 is reached!

## Technical Details

### Database Schema

Goals are stored with:
- `id`: Unique identifier
- `streamId`: Which stream this goal belongs to
- `title`: Goal name
- `goalType`: Currently only 'coins' is supported
- `targetAmount`: Coins needed to complete
- `currentAmount`: Current progress
- `rewardText`: What the creator will do
- `isActive`: Whether goal is currently active
- `isCompleted`: Whether goal has been reached

### API Endpoints

#### Create Goal
```
POST /api/streams/[streamId]/goals
Body: { title, goalType, targetAmount, rewardText }
```

#### Update Goal
```
PATCH /api/streams/[streamId]/goals/[goalId]
Body: { title, targetAmount, rewardText }
```

#### End Goal
```
DELETE /api/streams/[streamId]/goals/[goalId]
```

#### Get Goals
```
GET /api/streams/[streamId]/goals
Returns: { goals: StreamGoal[] }
```

### How Goals Auto-Update

When a viewer sends a gift:

1. Gift is processed via `/api/streams/[streamId]/gifts`
2. The gift's coin value is added to the stream's total earnings
3. The goal's `currentAmount` is automatically updated
4. Real-time event is broadcast to all viewers
5. Progress bar updates for everyone watching

The goal progress is tracked in the `stream_goals` table and is automatically incremented whenever a gift is received during the stream.

## Troubleshooting

### "Can't create a new goal"
**Issue**: You already have an active goal
**Solution**: Edit or end the existing goal first

### "Goal not updating"
**Issue**: Progress bar isn't moving when gifts are sent
**Solution**:
- Refresh the page
- Check that the goal is marked as `isActive: true`
- Verify gifts are being received properly

### "Lost my goal"
**Issue**: Accidentally ended a goal
**Solution**: Unfortunately goals cannot be restored once ended. Create a new goal with the same settings.

## Best Practices

### For Creators

1. **Set realistic targets** - Start with smaller goals (50-100 coins) to build momentum
2. **Clear rewards** - Make sure viewers understand exactly what they're unlocking
3. **Celebrate completion** - When a goal is reached, make it special!
4. **One at a time** - Focus on one goal rather than overwhelming viewers with multiple goals

### For Viewers

1. **Check the goal** - Look at what's being unlocked before contributing
2. **Team effort** - Work together with other viewers to reach the goal
3. **Support consistently** - Small contributions add up!

## Future Enhancements

Potential features coming soon:
- Multiple simultaneous goals
- Gift-specific goals (e.g., "Send 10 roses")
- Viewer count goals (e.g., "Reach 100 viewers")
- Goal milestones with partial rewards
- Goal history and analytics
