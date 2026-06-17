// Supabase project config for Drawboard.
// Note: createClient wants the bare project URL, not the /rest/v1/ REST path.
const SUPABASE_URL = 'https://hfbcayqiffapympwvfhw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NhZHz92xx9wgKSdplpkApw_wot24Vin';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
