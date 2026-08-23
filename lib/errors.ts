/**
 * catch で受け取った値からメッセージを取り出す。
 *
 * catch の型は unknown であり Error とは限らない（throw は任意の値を
 * 投げられる）ため、絞り込みをここに集約する。
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}
