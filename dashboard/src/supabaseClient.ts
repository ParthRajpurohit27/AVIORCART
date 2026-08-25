/* supabase client */

let sb: SupabaseClientLike;

function initSupabase(): SupabaseClientLike {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}
