import { useEffect, useState } from "react";
import { monitorConnection, useCounterStore } from "./store/store";
import { useLocalMediaTrackStore } from "./store/localMediaTrackStore";
import { useAuthStore } from "./store/authStore";
import { RoomContext } from "@livekit/components-react";
import { Room } from "livekit-client";
import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import MyBooth from "./MyBooth";

const { VITE_LIVEKIT_URL, VITE_LIVEKIT_API_KEY, VITE_LIVEKIT_API_SECRET } =
  import.meta.env;

export default function App() {
  const { count, decrement, increment, reset } = useCounterStore();
  const [room] = useState(() => new Room({}));
  const { accessToken, setAccessToken } = useAuthStore();

  const generateToken = async () => {
    const roomName = "test-room";
    const participantName = "test-participant";
    const at = new AccessToken(VITE_LIVEKIT_API_KEY, VITE_LIVEKIT_API_SECRET, {
      identity: participantName,
    });

    const videoGrant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    };

    at.addGrant(videoGrant);

    const token = await at.toJwt();
    console.log("access token", token);
    setAccessToken(token);
    return token;
  };

  const { createLocalMediaTrack, applyVirtualBackground } =
    useLocalMediaTrackStore();

  useEffect(() => {
    const init = async () => {
      createLocalMediaTrack();
      // applyVirtualBackground();
    };

    monitorConnection();
    init();
  }, []);

  // You can manage room connection lifecycle here
  useEffect(() => {
    const connectToRoom = async () => {
      let token = accessToken;

      if (!token) {
        token = await generateToken();
      }

      if (token) {
        room.connect(VITE_LIVEKIT_URL, token);
      }
    };

    connectToRoom();

    return () => {
      room.disconnect();
    };
  }, [room]);

  return (
    <RoomContext.Provider value={room}>
      <MyBooth />
    </RoomContext.Provider>
  );
}
