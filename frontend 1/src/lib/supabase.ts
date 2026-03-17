// MOCK Supabase Client for Frontend-Only Mode
export const supabase = {
  from: (table: string) => {
    // console.warn(`Supabase Database call to table '${table}' intercepted in frontend-only mode.`);
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          limit: () => ({ data: [], error: null }),
        }),
        in: () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        limit: () => ({ data: [], error: null }),
      }),
      insert: async () => ({ data: { id: 'mock-id-' + Date.now() }, error: null, select: () => ({ single: async () => ({ data: { id: 'mock-id-' + Date.now() }, error: null }) }) }),
    };
  },
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: null }),
    signOut: async () => ({ error: null }),
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: "" } }),
    }),
  },
} as any;