import { getBrowserClient } from "@/app/lib/supabase-browser";

export async function signIn(email: string, password: string) {
  const supabase = getBrowserClient();
  if (!supabase) {
    return { error: "Supabase is not configured" };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function signOut() {
  const supabase = getBrowserClient();
  if (!supabase) {
    return { error: "Supabase is not configured" };
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function getSession() {
  const supabase = getBrowserClient();
  if (!supabase) {
    return { session: null, error: "Supabase is not configured" };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { session: null, error: error.message };
  }

  return { session: data.session, error: null };
}
