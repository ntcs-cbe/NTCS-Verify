import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await supabase.auth.getSession();
        const session = res?.data?.session ?? null;
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session ?? null);
    });

    // `data.subscription` may be undefined in some environments; guard cleanup.
    return () => { mounted = false; if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') data.subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);