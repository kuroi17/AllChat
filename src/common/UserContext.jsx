import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";

const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // get initial sessuib
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // session?.user means if session exists and has user property
        setUser(session.user);
        await fetchProfile(session.user.id); // fetch profile data if user is logged in
      }
      setLoading(false);
    };
    getUser();

    // listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
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
