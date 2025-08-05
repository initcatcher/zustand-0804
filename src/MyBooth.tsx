import {
  TrackLoop,
  TrackRefContext,
  TrackToggle,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { isLocalTrack, Track } from "livekit-client";
import { useEffect, useState } from "react";
import { useLocalMediaTrackStore } from "./store/localMediaTrackStore";
import { VirtualBackground } from "@livekit/track-processors";
import { KonvaVideoCanvas } from "./components/KonvaVideoCanvas";
import styles from "./MyBooth.module.css";

// Constants
const VIDEO_DIMENSIONS = {
  width: 640,
  height: 480,
} as const;

const QUALITY_OPTIONS = [
  { value: "high" as const, label: "High Quality (60fps)" },
  { value: "good" as const, label: "Good Quality (30fps)" },
  { value: "low" as const, label: "Low Quality (15fps)" },
] as const;

export default function MyBooth() {
  const trackRefs = useTracks();

  const { cameraTrack } = useLocalParticipant();
  const [useKonva, setUseKonva] = useState(false);
  const [quality, setQuality] = useState<"high" | "good" | "low">("good");
  const [enableMaskFilter, setEnableMaskFilter] = useState(true);

  const room = useRoomContext();
  const { publishLocalMediaTrack } = useLocalMediaTrackStore();


  const publishTracks = async () => {
    try {
      await publishLocalMediaTrack(room);
    } catch (error) {
      console.error("Failed to publish local media tracks:", error);
    }
  };

  useEffect(() => {
    if (isLocalTrack(cameraTrack?.track)) {
      cameraTrack.track.setProcessor(VirtualBackground("bg-green.png"));
    }
  }, [cameraTrack]);
  return (
    <div className={styles.myBooth}>
      <h1>My Booth</h1>
      <p>Welcome to your personal booth!</p>
      <button
        className={styles.publishButton}
        onClick={async () => {
          await publishTracks();
        }}
      >
        Publish
      </button>
      {/* Additional booth content can be added here */}
      {/* StartAudio label="Click to allow audio playback" /> */}
      <div className={styles.trackToggles}>
        <TrackToggle source={Track.Source.Microphone} />
        <TrackToggle source={Track.Source.Camera} />
      </div>

      <div className={styles.controlsPanel}>
        <label>
          <input
            type="checkbox"
            checked={useKonva}
            onChange={(e) => setUseKonva(e.target.checked)}
          />
          Use Konva Canvas
        </label>

        {useKonva && (
          <>
            <select
              value={quality}
              onChange={(e) =>
                setQuality(e.target.value as "high" | "good" | "low")
              }
              className={styles.qualitySelect}
            >
              {QUALITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <label className={styles.maskToggle}>
              <input
                type="checkbox"
                checked={enableMaskFilter}
                onChange={(e) => setEnableMaskFilter(e.target.checked)}
              />
              Enable Mask Filter (Background Removal)
            </label>
          </>
        )}
      </div>

      <TrackLoop tracks={trackRefs}>
        <TrackRefContext.Consumer>
          {(trackRef) => {
            if (!trackRef) return null;

            if (!useKonva) {
              return trackRef.publication && (
                <VideoTrack trackRef={trackRef as TrackReference} />
              );
            }

            return (
              <KonvaVideoCanvas
                trackRef={trackRef}
                quality={quality}
                width={VIDEO_DIMENSIONS.width}
                height={VIDEO_DIMENSIONS.height}
                enableMaskFilter={enableMaskFilter}
              />
            );
          }}
        </TrackRefContext.Consumer>
      </TrackLoop>
    </div>
  );
}
