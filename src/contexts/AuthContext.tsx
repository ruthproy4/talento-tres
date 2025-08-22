import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  role: 'developer' | 'company';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, role: 'developer' | 'company') => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      console.log('Profile fetched from DB:', data);
      setProfile(data as Profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Resolve user role when it's missing from metadata by inferring from existing rows
  // and ensure a profiles row exists for the user (respects RLS)
  const resolveAndEnsureProfile = async (userId: string) => {
    try {
      // 1) Try to read existing profile
      const { data: existingProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log('Existing profile found, using it');
        setProfile(existingProfile as Profile);
        return;
      }

      // 2) Infer role by checking developers/companies tables (both are publicly readable)
      const [devRes, compRes] = await Promise.all([
        supabase.from('developers').select('id').eq('id', userId).maybeSingle(),
        supabase.from('companies').select('id').eq('id', userId).maybeSingle(),
      ]);

      let inferredRole: 'developer' | 'company' | null = null;
      if (devRes.data) inferredRole = 'developer';
      else if (compRes.data) inferredRole = 'company';

      if (inferredRole) {
        console.log('Inferred role from existing tables:', inferredRole);
        // Update UI immediately for redirects
        setProfile({ id: userId, role: inferredRole, created_at: '', updated_at: '' });
        // 3) Ensure profiles row exists (upsert id+role)
        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert({ id: userId, role: inferredRole }, { onConflict: 'id' });
        if (upsertErr) {
          console.warn('Upsert profiles error (will continue with inferred role):', upsertErr);
        }
      } else {
        console.warn('No role could be inferred for user. User may need to complete onboarding.');
      }
    } catch (e) {
      console.error('Error resolving/ensuring profile:', e);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, 'Session:', !!session, 'User:', !!session?.user);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Create temporary profile from user_metadata while DB profile loads
          const userRole = session.user.user_metadata?.role as 'developer' | 'company';
          console.log('User role from metadata:', userRole);
          if (userRole) {
          const tempProfile = {
            id: session.user.id,
            role: userRole,
            created_at: '',
            updated_at: ''
          };
            console.log('Setting temporary profile:', tempProfile);
            setProfile(tempProfile);
          }
          if (!userRole) {
            setTimeout(() => {
              resolveAndEnsureProfile(session.user.id);
            }, 0);
          }
          
          // Defer profile fetch to avoid auth state listener issues
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Create temporary profile from user_metadata while DB profile loads
        const userRole = session.user.user_metadata?.role as 'developer' | 'company';
        if (userRole) {
          setProfile({
            id: session.user.id,
            role: userRole,
            created_at: '',
            updated_at: ''
          });
        } else {
          setTimeout(() => {
            resolveAndEnsureProfile(session.user.id);
          }, 0);
        }
        
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, role: 'developer' | 'company') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role
        }
      }
    });

    if (error) {
      toast({
        title: "Error en el registro",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "¡Registro exitoso!",
        description: "Revisa tu email para confirmar tu cuenta.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Error en el login",
        description: error.message,
        variant: "destructive"
      });
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}