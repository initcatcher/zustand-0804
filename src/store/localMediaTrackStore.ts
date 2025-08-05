import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  LocalTrack,
  Room,
  Track,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";
import { supportsBackgroundProcessors } from "@livekit/track-processors";

export interface LocalMediaTrackState {
  // 로컬 미디어 트랙 상태
  videoTrack: LocalTrack<Track.Kind.Video> | null;
  audioTrack: LocalTrack<Track.Kind.Audio> | null;

  isProcessing: boolean;
  isTracksPublished: boolean;
}

interface LocalMediaTrackActions {
  // 로컬 미디어 트랙 생성/해제
  //   createLocalMediaTrack: (options?: {
  //     deviceId?: string;
  //     facingMode?: "user" | "environment";
  //     resolution?: { width: number; height: number };
  //   }) => Promise<void>;

  createLocalMediaTrack: () => Promise<void>;
  destroyLocalMediaTrack: () => void;

  // // 기본 컨트롤
  // toggle: () => Promise<void>;
  // enable: () => Promise<void>;
  // disable: () => void;
  // mute: () => void;
  // unmute: () => void;

  // // 카메라 전환
  // switchCamera: (deviceId?: string) => Promise<void>;
  // flipCamera: () => Promise<void>;

  // 방 연동
  publishLocalMediaTrack: (room: Room) => Promise<void>;
  unpublishLocalMediaTrack: (room: Room) => Promise<void>;
  applyVirtualBackground: (backgroundValue?: string) => Promise<void>;

  // // 상태 관리
  // setError: (error: string) => void;
  // clearError: () => void;
  // reset: () => void;
}

type LocalMediaTrackStore = LocalMediaTrackState & LocalMediaTrackActions;

const initialState: LocalMediaTrackState = {
  videoTrack: null,
  audioTrack: null,
  isProcessing: false,
  isTracksPublished: false,
};

export const useLocalMediaTrackStore = create<LocalMediaTrackStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      createLocalMediaTrack: async () => {
        set({ isProcessing: true });

        try {
          const audioTrack = await createLocalAudioTrack();
          const videoTrack = await createLocalVideoTrack();

          if (!supportsBackgroundProcessors()) {
            console.warn(
              "Background processors are not supported in this environment."
            );
          }

          // const virtual = VirtualBackground("");
          // await videoTrack.setProcessor(virtual);

          set({
            audioTrack,
            videoTrack,
            isProcessing: false,
          });
          console.log("Local media tracks created:", {
            audioTrack,
            videoTrack,
          });
        } catch (error) {
          console.error("Error creating local media track:", error);
          set({ isProcessing: false });
          throw error;
        }
      },

      destroyLocalMediaTrack: () => {
        const state = get();
        if (state.audioTrack) {
          state.audioTrack.stop();
        }
        if (state.videoTrack) {
          state.videoTrack.stop();
        }
        set({ audioTrack: null, videoTrack: null });
        console.log("Local media tracks destroyed");
      },

      publishLocalMediaTrack: async (room: Room) => {
        const state = get();

        if (!state.audioTrack && !state.videoTrack) {
          throw new Error("No local media track to publish");
        }

        try {
          if (state.audioTrack) {
            await room.localParticipant.publishTrack(state.audioTrack);
          }
          if (state.videoTrack) {
            await room.localParticipant.publishTrack(state.videoTrack);
          }
        } catch (error) {
          console.error("Failed to publish local media track", error);
          throw error;
        }
      },

      unpublishLocalMediaTrack: async (room: Room) => {
        const state = get();

        if (!state.audioTrack && !state.videoTrack) {
          return;
        }

        try {
          if (state.audioTrack) {
            await room.localParticipant.unpublishTrack(state.audioTrack);
          }
          if (state.videoTrack) {
            await room.localParticipant.unpublishTrack(state.videoTrack);
          }
        } catch (error) {
          console.error("Failed to publish local media track", error);
          throw error;
        }
      },
    }),
    { name: "local-media-track-store" }
  )
);
