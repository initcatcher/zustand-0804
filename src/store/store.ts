import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { WebsocketProvider } from "y-websocket";
// @ts-ignore - zustand-middleware-yjs types issue
import yjs from "zustand-middleware-yjs";
import * as Y from "yjs";

// 공유 Yjs 문서 생성
export const ydoc = new Y.Doc();

// 공유 WebSocket 연결
export const wsProvider = new WebsocketProvider(
  "ws://localhost:1234",
  "test",
  ydoc
);

export const awareness = wsProvider.awareness;

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

export const useCounterStore = create<CounterState>()(
  devtools(
    yjs(
      ydoc,
      "count",
      (set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
        decrement: () => set((state) => ({ count: state.count - 1 })),
        reset: () => set({ count: 0 }),
      }),
      {
        name: "counter-store",
      }
    )
  )
);

// WebSocket 연결 상태 모니터링
export const monitorConnection = () => {
  wsProvider.on("status", (event: { status: string }) => {
    console.log("WebSocket 연결 상태:", event.status);
  });

  wsProvider.on("sync", (isSynced: boolean) => {
    console.log("동기화 상태:", isSynced);
  });
};
