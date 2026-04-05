import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { updatePresence } from "../utils/social";
import { defaultSettings, subscribeChatSettings } from "../utils/settings";
import {
  API_BASE_URL,
  PRESENCE_UPDATE_INTERVAL_MS,
} from "../utils/runtimeConfig";

const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(
    defaultSettings.showOnlineStatus,
  );

  useEffect(() => {
    let isMounted = true;

    // get initial session
    const getUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (isMounted) {
          setUser(session?.user ?? null);
          // Set loading false IMMEDIATELY - don't wait for profile
          setLoading(false);

          // Fetch profile in background (non-blocking)
          if (session?.user) {
            fetchProfile(session.user.id).catch((err) => {
              console.error("[UserContext] Profile fetch failed:", err);
            });
          }
        }
      } catch (error) {
        console.error("[UserContext] Error:", error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    getUser();

    // listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id).catch((err) => {
            console.error("[UserContext] Profile fetch failed:", err);
          });
        } else {
          setProfile(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeChatSettings((settings) => {
      setShowOnlineStatus(settings.showOnlineStatus);
    });

    return unsubscribe;
  }, []);

  // Track user presence with throttled activity updates.
  useEffect(() => {
    if (!user?.id) return;

    if (!showOnlineStatus) {
      supabase
        .from("profiles")
        .update({ last_seen: null })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) {
            console.error("[Presence] Failed to hide online status:", error);
          }
        });
      return;
    }

    // Update presence immediately on mount.
    updatePresence(user.id, { force: true });

    // Update presence on a fixed interval.
    const interval = setInterval(() => {
      updatePresence(user.id);
    }, PRESENCE_UPDATE_INTERVAL_MS);

    // Trigger updates only when tab becomes active to reduce write load.
    const handleFocus = () => {
      updatePresence(user.id, { force: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence(user.id, { force: true });
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user?.id, showOnlineStatus]);

  const fetchProfile = async (userId) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (token) {
        const response = await fetch(`${API_BASE_URL}/api/users/me/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profileFromApi = await response.json();
          setProfile(profileFromApi);
          return;
        }
      }
    } catch (err) {
      console.error("[UserContext] Backend profile fetch failed:", err);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    } else if (error) {
      console.error("[UserContext] Error fetching profile:", error);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: { message: "No user found" } };

    // Use upsert to insert if not exists, or update if exists
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating profile:", error);
      return {
        success: false,
        error,
      };
    }

    if (data) {
      setProfile(data);
      return { success: true };
    }

    return { success: false, error: { message: "Unknown error" } };
  };

  return (
    // userContext.Provider means we are providing the user context to all children components, so they can access user, profile, loading and updateProfile function
    <UserContext.Provider value={{ user, profile, loading, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
