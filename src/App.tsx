import { useEffect, useState } from "react";
import { monitorConnection, useCounterStore } from "./store/store";
import { useLocalMediaTrackStore } from "./store/localMediaTrackStore";
import { RoomContext } from "@livekit/components-react";
import { Room } from "livekit-client";

export default function App() {
  const { count, decrement, increment, reset } = useCounterStore();
  const [room] = useState(() => new Room({}));

  const { createLocalMediaTrack } = useLocalMediaTrackStore();

  useEffect(() => {
    monitorConnection();
    createLocalMediaTrack();
  }, []);

  // You can manage room connection lifecycle here
  useEffect(() => {
    room.connect("your-server-url", "your-token");
    return () => {
      room.disconnect();
    };
  }, [room]);

  return (
    <RoomContext.Provider value={room}>
      {" "}
      <main>
        <h1>hello world</h1>
        <div>{count}</div>
        <div>
          <button onClick={increment}>+</button>
          <button onClick={decrement}>-</button>
          <button onClick={reset}>reset</button>
        </div>
      </main>
    </RoomContext.Provider>
  );
}
