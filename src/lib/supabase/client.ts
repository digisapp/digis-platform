import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return document.cookie.split(';').map(cookie => {
            const [name, ...rest] = cookie.trim().split('=');
            return { name, value: rest.join('=') };
          }).filter(cookie => cookie.name);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Set cookies with explicit SameSite=Lax for better compatibility
            const cookieOptions = {
              ...options,
              sameSite: 'lax' as const,
              secure: window.location.protocol === 'https:',
            };

            let cookieString = `${name}=${value}`;

            if (cookieOptions.maxAge) {
              cookieString += `; Max-Age=${cookieOptions.maxAge}`;
            }
            if (cookieOptions.domain) {
              cookieString += `; Domain=${cookieOptions.domain}`;
            }
            if (cookieOptions.path) {
              cookieString += `; Path=${cookieOptions.path}`;
            }
            if (cookieOptions.sameSite) {
              cookieString += `; SameSite=${cookieOptions.sameSite}`;
            }
            if (cookieOptions.secure) {
              cookieString += `; Secure`;
            }

            document.cookie = cookieString;
          });
        },
      },
    }
  )
}
