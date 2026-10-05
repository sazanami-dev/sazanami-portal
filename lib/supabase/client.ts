import { createBrowserClient } from '@supabase/ssr'

import { supabaseCookieName } from '@/lib/supabase/url'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // サーバー側(server.ts / middleware.ts)と同じ Cookie 名を明示する。
      // 省略しても supabase-js の既定 `sb-${hostname.split('.')[0]}-auth-token`
      // と一致するが、それは upstream の内部既定への暗黙依存になる。
      // サーバー側は SUPABASE_INTERNAL_URL を使う関係で明示が必須なので、
      // 既定式が変わるとサーバー(明示)とブラウザ(既定)だけが食い違い、
      // セッションと PKCE の code_verifier を読めなくなる。両側で固定する。
      cookieOptions: { name: supabaseCookieName() },
    }
  )
}
