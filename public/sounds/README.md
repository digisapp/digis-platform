# Stream Alert Sound Files

This directory should contain the following sound files for stream alerts:

## Gift Alert Sounds
- `gift-small.wav` - For gifts under 100 coins (light "ding" sound)
- `gift-medium.wav` - For gifts 100-499 coins (pleasant chime)
- `gift-large.wav` - For gifts 500-999 coins (exciting fanfare)
- `gift-epic.wav` - For gifts 1000+ coins (epic celebration sound)

## Top Tipper Sound
- `big-tip.wav` - For top tipper spotlight (celebratory fanfare)

## Goal Celebration Sound
- `goal-complete.wav` - For when a stream goal is reached (triumph fanfare)

## Quick Setup - Generate Sounds

We've created a sound generator tool to create these files instantly:

1. Open `scripts/generate-sounds.html` in your browser
2. Click "Preview" to listen to each sound
3. Click "Download" to save each file (downloads as .wav)
4. Move all 6 downloaded `.wav` files to this `public/sounds/` folder
5. Refresh your stream page - sounds will play automatically!

**Note:** The generator creates high-quality WAV files using Web Audio API. All modern browsers support WAV audio natively.

## Sound Specifications
- Format: WAV (uncompressed audio)
- Sample Rate: 48kHz (browser AudioContext default)
- Bit Depth: 16-bit
- Duration: 0.3-1.5 seconds (short and punchy)
- Volume: Normalized to prevent clipping

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
