// tests/e2e/helpers/db.ts
// E2E 測試用 Prisma Client

import { PrismaClient } from '@prisma/client'

// 使用 DIRECT_URL 避免 pgbouncer 連接池問題
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
})

// 確保測試結束後關閉連線
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

/**
 * 等待條件成立的工具函式
 * 用於處理 API 寫入和測試查詢之間的時序問題
 */
export async function waitFor<T>(
  fn: () => Promise<T>,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 5000, interval = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const result = await fn()
    if (result) {
      return result
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}
