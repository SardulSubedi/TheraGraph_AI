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

export async function signUp(email: string, password: string, name?: string) {
  const supabase = getBrowserClient();
  if (!supabase) {
    return { error: "Supabase is not configured", needsConfirmation: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: name ? { data: { name, role: "clinician" } } : undefined,
  });
  if (error) {
    return { error: error.message, needsConfirmation: false };
  }

  // If no session is returned, Supabase is enforcing email confirmation.
  const needsConfirmation = !data.session;
  return { error: null, needsConfirmation };
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
