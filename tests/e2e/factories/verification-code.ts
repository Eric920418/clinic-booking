// tests/e2e/factories/verification-code.ts
// VerificationCode 測試資料工廠

import { prisma } from '../helpers/db'

interface VerificationCodeData {
  lineUserId?: string
  code?: string
  attempts?: number
  expiresAt?: Date
  usedAt?: Date | null
  createdAt?: Date
}

/**
 * 產生 6 位數隨機驗證碼
 */
function generateRandomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * 建立 VerificationCode 測試資料
 *
 * @param data - 可選的自訂資料
 * @returns 建立的 VerificationCode 記錄
 *
 * @example
 * // 建立預設驗證碼（未過期、0 次嘗試）
 * const code = await createVerificationCode({ lineUserId: 'U123' })
 *
 * @example
 * // 建立已過期的驗證碼
 * const expiredCode = await createVerificationCode({
 *   lineUserId: 'U123',
 *   expiresAt: new Date('2020-01-01')
 * })
 *
 * @example
 * // 建立已達錯誤上限的驗證碼
 * const maxAttemptsCode = await createVerificationCode({
 *   lineUserId: 'U123',
 *   attempts: 5
 * })
 */
export async function createVerificationCode(data: VerificationCodeData = {}) {
  const now = new Date()
  const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000)

  return prisma.verificationCode.create({
    data: {
      lineUserId: data.lineUserId ?? `U${Date.now()}`,
      code: data.code ?? generateRandomCode(),
      attempts: data.attempts ?? 0,
      expiresAt: data.expiresAt ?? fiveMinutesLater,
      usedAt: data.usedAt ?? null,
      createdAt: data.createdAt ?? now,
    },
  })
}

/**
 * 建立已過期的驗證碼
 */
export async function createExpiredVerificationCode(data: VerificationCodeData = {}) {
  const pastTime = new Date(Date.now() - 10 * 60 * 1000) // 10 分鐘前

  return createVerificationCode({
    ...data,
    expiresAt: pastTime,
  })
}

/**
 * 建立已達錯誤上限的驗證碼
 */
export async function createMaxAttemptsVerificationCode(data: VerificationCodeData = {}) {
  return createVerificationCode({
    ...data,
    attempts: 5,
  })
}
