"use strict";
let sb;
function initSupabase() {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return sb;
}
