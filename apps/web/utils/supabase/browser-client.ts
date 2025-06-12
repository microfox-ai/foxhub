import { createBrowserClient } from "@supabase/ssr";

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            credentials: "include",
            mode: "cors",
            headers: {
              ...options?.headers,
              "Cross-Origin-Resource-Policy": "cross-origin",
            },
          });
        },
      },
    }
  );
};
