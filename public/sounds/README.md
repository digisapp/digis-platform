# Stream Alert Sound Files

This directory should contain the following sound files for stream alerts:

## Gift Alert Sounds
- `gift-small.mp3` - For gifts under 100 coins (light "ding" sound)
- `gift-medium.mp3` - For gifts 100-499 coins (pleasant chime)
- `gift-large.mp3` - For gifts 500-999 coins (exciting fanfare)
- `gift-epic.mp3` - For gifts 1000+ coins (epic celebration sound)

## Top Tipper Sound
- `big-tip.mp3` - For top tipper spotlight (celebratory fanfare)

## Goal Celebration Sound
- `goal-complete.mp3` - For when a stream goal is reached (triumph fanfare)

## Sound Specifications
- Format: MP3
- Sample Rate: 44.1kHz or 48kHz
- Bit Rate: 128-320 kbps
- Duration: 1-3 seconds (short and punchy)
- Volume: Normalized to -3dB to prevent clipping

## Recommendations
You can find free sound effects at:
- https://freesound.org
- https://mixkit.co/free-sound-effects/
- https://www.zapsplat.com

Suggested keywords to search:
- "coin drop"
- "level up"
- "achievement"
- "fanfare"
- "celebration"
- "success chime"
- "victory"

## Note
The app will gracefully handle missing sound files by silently failing.
Audio playback will be attempted but won't crash if files don't exist.
