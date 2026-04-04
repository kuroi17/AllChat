import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOnlineUsers } from "../utils/social";
import { ONLINE_USERS_REFETCH_INTERVAL_MS } from "../utils/runtimeConfig";

const PresenceContext = createContext({
  onlineUsers: [],
  onlineCount: 0,
  isFetching: false,
  refetch: () => {},
});

export default function PresenceProvider({ children }) {
  const {
    data: onlineUsers = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["presence", "onlineUsers", "global"],
    queryFn: () => fetchOnlineUsers(100),
    staleTime: ONLINE_USERS_REFETCH_INTERVAL_MS,
    refetchInterval: ONLINE_USERS_REFETCH_INTERVAL_MS,
  });

  const value = {
    onlineUsers,
    onlineCount: Array.isArray(onlineUsers) ? onlineUsers.length : 0,
    isFetching,
    refetch,
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
