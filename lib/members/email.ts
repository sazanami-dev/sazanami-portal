/** 学内メール想定: ローカル部が it + 数字のみ（例: it123456@...） */
export function isItSchoolEmail(email: string): boolean {
  const local = email.split('@')[0] ?? ''
  return /^it\d+$/i.test(local)
}

/** CSV 抽出用: ローカル部が it + 6桁数字で始まる（例: it123456@...） */
export function hasItSixDigitPrefix(email: string): boolean {
  const local = email.split('@')[0] ?? ''
  return /^it\d{6}/i.test(local)
}
