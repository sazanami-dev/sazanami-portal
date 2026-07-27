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
