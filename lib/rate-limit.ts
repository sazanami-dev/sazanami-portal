/**
 * プロセス内の固定ウィンドウ・レート制限。
 *
 * 単一プロセスで動かす前提の軽量な実装で、外部ストアを必要としない。
 * プロセスを跨いだ集計や再起動をまたぐ保持はしないため、厳密な上限ではなく
 * 「同一プロセスから短時間に大量の試行を通さない」ことを目的とする。
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Map が無制限に増えないよう、参照時に期限切れを間引く */
function sweep(now: number) {
  if (buckets.size < 1000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export type RateLimitResult = {
  allowed: boolean
  /** 拒否したときに次に試せるまでの秒数 */
  retryAfterSeconds: number
}

/**
 * key ごとに windowSeconds 内 limit 回までを許可する。
 * 呼び出しごとに 1 回消費する。
 */
export function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  bucket.count += 1
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

/** テスト用。全バケットを破棄する。 */
export function resetRateLimits() {
  buckets.clear()
}

/**
 * リクエスト元の識別子。
 *
 * 逆プロキシ配下では接続元が常にプロキシになるため転送ヘッダを見る。
 * ヘッダが無い場合は識別できないので、まとめて 1 つのキーに寄せる
 * （その分だけ上限が共有される）。
 */
export function clientKey(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
