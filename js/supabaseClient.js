// Supabase project config for Drawboard.
// Note: createClient wants the bare project URL, not the /rest/v1/ REST path.
const SUPABASE_URL = 'https://hfbcayqiffapympwvfhw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NhZHz92xx9wgKSdplpkApw_wot24Vin';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Pulls the storage-relative path (e.g. "<thread_id>/<file>.png") back out of
// a public URL, since deleting from storage needs the path, not the URL.
function storagePathFromUrl(url) {
  const marker = '/storage/v1/object/public/drawings/';
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}
