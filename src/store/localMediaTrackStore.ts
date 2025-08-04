import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Room, createLocalTracks } from "livekit-client";
import type { LocalMediaTrackState } from "../types/localMediaTrack";

interface LocalMediaTrackActions {
  // 로컬 미디어 트랙 생성/해제
  //   createLocalMediaTrack: (options?: {
  //     deviceId?: string;
  //     facingMode?: "user" | "environment";
  //     resolution?: { width: number; height: number };
  //   }) => Promise<void>;

  createLocalMediaTrack: () => Promise<void>;
  destroyLocalMediaTrack: () => void;

  // 기본 컨트롤
  toggle: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => void;
  mute: () => void;
  unmute: () => void;

  // 카메라 전환
  switchCamera: (deviceId?: string) => Promise<void>;
  flipCamera: () => Promise<void>;

  // 방 연동
  publishLocalMediaTrack: (room: Room) => Promise<void>;
  unpublishLocalMediaTrack: (room: Room) => Promise<void>;

  // 상태 관리
  setError: (error: string) => void;
  clearError: () => void;
  reset: () => void;
}

type LocalMediaTrackStore = LocalMediaTrackState & LocalMediaTrackActions;

const initialState: LocalMediaTrackState = {
  localMediaTrack: null,
};

export const useLocalMediaTrackStore = create<LocalMediaTrackStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        createLocalMediaTrack: async () => {
          const state = get();

          // 이미 로컬 미디어 트랙이 있으면 정리
          if (state.localMediaTrack) {
            state.localMediaTrack.stop();
          }

          try {
            const localMediaTrack = await createLocalTracks({
              audio: true,
              video: true,
            });

            set((state) => {
              state.localMediaTrack = localMediaTrack;
            });
          } catch (error) {
            console.error(error);
          }
        },

        destroyLocalMediaTrack: () => {
          const state = get();
          if (state.localMediaTrack) {
            state.localMediaTrack.stop();
            set((state) => {
              state.localMediaTrack = undefined;
              state.isEnabled = false;
              state.isPublished = false;
            });
          }
        },

        toggle: async () => {
          const { isEnabled, enable, disable } = get();
          if (isEnabled) {
            disable();
          } else {
            await enable();
          }
        },

        enable: async () => {
          const state = get();
          if (!state.localMediaTrack) {
            await get().createLocalMediaTrack();
          } else {
            set((state) => {
              state.isEnabled = true;
            });
          }
        },

        disable: () => {
          const state = get();
          if (state.localMediaTrack) {
            state.localMediaTrack.stop();
          }
          set((state) => {
            state.localMediaTrack = undefined;
            state.isEnabled = false;
            state.isPublished = false;
          });
        },

        mute: () => {
          const state = get();
          if (state.localMediaTrack && state.isEnabled) {
            state.localMediaTrack.mute();
            set((state) => {
              state.isMuted = true;
            });
          }
        },

        unmute: () => {
          const state = get();
          if (state.localMediaTrack && state.isEnabled) {
            state.localMediaTrack.setEnabled(true);
            set((state) => {
              state.isMuted = false;
            });
          }
        },

        switchCamera: async (deviceId?: string) => {
          const state = get();

          if (!deviceId) {
            console.warn("Device ID is required for camera switch");
            return;
          }

          try {
            if (state.localMediaTrack) {
              // 기존 로컬 미디어 트랙으로 카메라 전환 시도
              await state.localMediaTrack.switchCamera(deviceId);
              set((state) => {
                state.deviceId = deviceId;
              });
            } else {
              // 새 로컬 미디어 트랙 생성
              await get().createLocalMediaTrack({ deviceId });
            }
          } catch (error) {
            // 전환 실패 시 새 로컬 미디어 트랙 생성
            try {
              await get().createLocalMediaTrack({ deviceId });
            } catch (createError) {
              set((state) => {
                state.error = "Failed to switch camera";
              });
              throw createError;
            }
          }
        },

        flipCamera: async () => {
          const state = get();
          const newFacingMode =
            state.facingMode === "user" ? "environment" : "user";

          try {
            await get().createLocalMediaTrack({ facingMode: newFacingMode });
          } catch (error) {
            set((state) => {
              state.error = "Failed to flip camera";
            });
            throw error;
          }
        },

        publishLocalMediaTrack: async (room: Room) => {
          const state = get();

          if (!state.localMediaTrack || !state.isEnabled) {
            throw new Error("No local media track to publish");
          }

          try {
            await room.localParticipant.publishTrack(state.localMediaTrack, {
              videoEncoding: {
                maxBitrate: 1_500_000,
                maxFramerate: 30,
              },
              simulcast: true,
              source: "camera",
            });

            set((state) => {
              state.isPublished = true;
            });
          } catch (error) {
            set((state) => {
              state.error = "Failed to publish local media track";
            });
            throw error;
          }
        },

        unpublishLocalMediaTrack: async (room: Room) => {
          const state = get();

          if (!state.localMediaTrack || !state.isPublished) {
            return;
          }

          try {
            await room.localParticipant.unpublishTrack(state.localMediaTrack);
            set((state) => {
              state.isPublished = false;
            });
          } catch (error) {
            set((state) => {
              state.error = "Failed to unpublish local media track";
            });
            throw error;
          }
        },

        setError: (error: string) => {
          set((state) => {
            state.error = error;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = undefined;
          });
        },

        reset: () => {
          const state = get();
          if (state.localMediaTrack) {
            state.localMediaTrack.stop();
          }
          set(() => ({ ...initialState }));
        },
      }))
    ),
    { name: "local-media-track-store" }
  )
);
