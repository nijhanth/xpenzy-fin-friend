import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const isDevelopment = import.meta.env.DEV;
const liveSupabaseUrl = 'https://vlafgohsqzhzqtcmlapt.supabase.co';
const useLiveSupabaseInDevelopment = import.meta.env.VITE_DEV_USE_LIVE_SUPABASE === 'true';
const devSupabaseKey = import.meta.env.VITE_DEV_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_DEV_SUPABASE_ANON_KEY;
const configuredDevUrl = import.meta.env.VITE_DEV_SUPABASE_URL;
const devPointsAtLiveProject = Boolean(configuredDevUrl?.includes(new URL(liveSupabaseUrl).hostname));

// Development stays on a separate backend by default. Set
// VITE_DEV_USE_LIVE_SUPABASE=true to explicitly use the live project while developing.
export const SUPABASE_URL = isDevelopment
  ? (useLiveSupabaseInDevelopment
    ? (import.meta.env.VITE_SUPABASE_URL || liveSupabaseUrl)
    : (configuredDevUrl && !devPointsAtLiveProject ? configuredDevUrl : 'http://127.0.0.1:54321'))
  : (import.meta.env.VITE_SUPABASE_URL || liveSupabaseUrl);
export const SUPABASE_PUBLISHABLE_KEY = isDevelopment
  ? (useLiveSupabaseInDevelopment
    ? (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_A5cdyOopLgqfSVDTibrXvg_EeWqrCUP')
    : (devSupabaseKey || 'local-development-no-key'))
  : (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_A5cdyOopLgqfSVDTibrXvg_EeWqrCUP');
const clientUrl = SUPABASE_URL || 'https://supabase-not-configured.invalid';
const clientKey = SUPABASE_PUBLISHABLE_KEY || 'preview-only-key';

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) && (!isDevelopment || useLiveSupabaseInDevelopment || (Boolean(devSupabaseKey) && !devPointsAtLiveProject));

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(clientUrl, clientKey, {
  global: {
    fetch: createSupabaseFetch(clientKey),
  },
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});
