/**
 * サーバー側（Server Component / Route Handler / proxy）から Supabase へ
 * 接続する際の URL。
 *
 * Portal と Supabase が同一ネットワーク内にある場合、SUPABASE_INTERNAL_URL に
 * 内部アドレス（例: http://10.0.0.x:8000）を設定すると Cloudflare 往復を回避できる。
 * 未設定なら公開URLへフォールバックするため、手元のデバッグ環境では何も
 * 設定しなくてよい。
 *
 * NOTE: このファイルは proxy(Edge Runtime) からも import されるため、
 *       next/headers など Server Component 専用 API を持ち込まないこと。
 *       ブラウザ用クライアント(lib/supabase/client.ts)では使わない
 *       —— NEXT_PUBLIC_SUPABASE_URL は外部ユーザーのブラウザが解決するため。
 */
export function supabaseServerUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
}

/**
 * 認証 Cookie（PKCE の code-verifier / セッション）のストレージキー名。
 *
 * supabase-js は既定でストレージキーを接続先 URL のホスト名から導出する
 * （`sb-${hostname.split('.')[0]}-auth-token`）。サーバー側で
 * SUPABASE_INTERNAL_URL（例: http://192.168.x.x:8000）を使うと、ブラウザ側が
 * NEXT_PUBLIC_SUPABASE_URL から導出した Cookie 名と食い違い、code-verifier を
 * 読めず exchangeCodeForSession が失敗する。
 *
 * そのため Cookie 名は接続先に関わらず常に公開 URL から導出して統一する。
 */
export function supabaseCookieName(): string {
  const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
  return `sb-${host.split('.')[0]}-auth-token`
}
