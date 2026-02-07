'use client';

export function LiveKitStyles() {
  return (
    <style jsx global>{`
      .livekit-container .lk-video-conference {
        --lk-bg: transparent !important;
        --lk-bg2: rgba(0, 0, 0, 0.4) !important;
        --lk-control-bg: rgba(0, 0, 0, 0.6) !important;
        --lk-control-hover-bg: rgba(34, 211, 238, 0.2) !important;
        --lk-accent-fg: rgb(34, 211, 238) !important;
        --lk-danger: rgb(239, 68, 68) !important;
        background: transparent !important;
      }

      .livekit-container .lk-focus-layout {
        background: transparent !important;
      }

      .livekit-container .lk-participant-tile {
        background: rgba(0, 0, 0, 0.6) !important;
        border: 2px solid rgba(34, 211, 238, 0.3) !important;
        border-radius: 1rem !important;
        box-shadow: 0 0 30px rgba(34, 211, 238, 0.2) !important;
      }

      .livekit-container .lk-participant-placeholder {
        background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(168, 85, 247, 0.1)) !important;
      }

      .livekit-container .lk-control-bar {
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(20px) !important;
        border-top: 1px solid rgba(34, 211, 238, 0.3) !important;
        padding: 1rem !important;
      }

      .livekit-container .lk-button {
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 0.75rem !important;
        transition: all 0.2s !important;
      }

      .livekit-container .lk-button:hover {
        background: rgba(34, 211, 238, 0.2) !important;
        border-color: rgba(34, 211, 238, 0.5) !important;
        transform: scale(1.05) !important;
      }

      .livekit-container .lk-disconnect-button {
        background: linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38)) !important;
        border: none !important;
      }

      .livekit-container .lk-disconnect-button:hover {
        background: linear-gradient(135deg, rgb(220, 38, 38), rgb(185, 28, 28)) !important;
      }

      .livekit-container .lk-participant-name {
        background: rgba(0, 0, 0, 0.7) !important;
        backdrop-filter: blur(10px) !important;
        border: 1px solid rgba(34, 211, 238, 0.3) !important;
        border-radius: 0.5rem !important;
        padding: 0.25rem 0.75rem !important;
      }

      /* Hide the local participant tile in 1:1 calls - show as small PIP instead */
      .livekit-container .lk-focus-layout .lk-carousel {
        position: absolute !important;
        bottom: 1rem !important;
        right: 1rem !important;
        width: 180px !important;
        height: auto !important;
        z-index: 20 !important;
      }

      .livekit-container .lk-focus-layout .lk-carousel .lk-participant-tile {
        width: 180px !important;
        height: 120px !important;
        border-radius: 0.75rem !important;
      }

      /* Make focus view take full space */
      .livekit-container .lk-focus-layout-wrapper {
        height: 100% !important;
      }

      /* Hide placeholder icon when no video */
      .livekit-container .lk-participant-placeholder svg {
        opacity: 0.3 !important;
        width: 48px !important;
        height: 48px !important;
      }

      /* Grid layout for when both participants are visible equally */
      .livekit-container .lk-grid-layout {
        gap: 0.5rem !important;
        padding: 0.5rem !important;
      }

      /* Center the video conference */
      .livekit-container {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .livekit-container .lk-video-conference {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .livekit-container .lk-focus-layout {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      /* Main participant takes center stage */
      .livekit-container .lk-focus-layout > .lk-participant-tile {
        max-width: 100% !important;
        max-height: 100% !important;
        width: auto !important;
        height: auto !important;
        aspect-ratio: 16/9 !important;
      }
    `}</style>
  );
}
