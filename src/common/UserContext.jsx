import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // get initial session
    const getUser = async () => {
      console.log("[UserContext] Fetching user...");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log(
          "[UserContext] Session:",
          session?.user ? "Found user" : "No user",
        );

        if (isMounted) {
          setUser(session?.user ?? null);
          // Set loading false IMMEDIATELY - don't wait for profile
          setLoading(false);
          console.log("[UserContext] Loading complete");

          // Fetch profile in background (non-blocking)
          if (session?.user) {
            console.log(
              "[UserContext] Fetching profile for user:",
              session.user.id,
            );
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
      console.log("[UserContext] Auth changed:", event);
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

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data);
    } else if (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (data) {
      setProfile(data);
      return { success: true };
    } else {
      return {
        success: false,
        error,
      };
    }
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
