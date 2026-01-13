// tests/e2e/system/blacklist-batch.spec.ts
// Feature: 黑名單管理
// 測試系統批次處理相關功能

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { createPatient } from '../factories'
import { prisma } from '../helpers/db'

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe('未報到累計達 3 次自動加入黑名單（批次處理）', () => {
  /**
   * Rule: 未報到累計達 3 次自動加入黑名單（批次處理）
   */

  test('批次檢查時未報到次數達 3 次加入黑名單', async ({ request }) => {
    // Given 病患未報到次數為 3 且尚未被列入黑名單
    const patient = await createPatient({
      noShowCount: 3,
      isBlacklisted: false,
    })

    // When 系統執行每日黑名單批次檢查
    const response = await request.post('/api/system/blacklist-check')

    // Then 批次處理成功執行
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.processedCount).toBeGreaterThanOrEqual(1)

    // And 病患狀態變更為黑名單
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    })
    expect(updatedPatient?.isBlacklisted).toBe(true)

    // And 黑名單記錄被建立
    const blacklistRecord = await prisma.blacklist.findUnique({
      where: { patientId: patient.id },
    })
    expect(blacklistRecord).not.toBeNull()
    expect(blacklistRecord?.reason).toContain('未報到')
  })

  test('批次檢查時未報到次數未達 3 次不加入黑名單', async ({ request }) => {
    // Given 病患未報到次數為 2（未達門檻）
    const patient = await createPatient({
      noShowCount: 2,
      isBlacklisted: false,
    })

    // When 系統執行每日黑名單批次檢查
    const response = await request.post('/api/system/blacklist-check')

    // Then 批次處理成功但病患未被列入黑名單
    expect(response.ok()).toBeTruthy()

    const updatedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    })
    expect(updatedPatient?.isBlacklisted).toBe(false)

    const blacklistRecord = await prisma.blacklist.findUnique({
      where: { patientId: patient.id },
    })
    expect(blacklistRecord).toBeNull()
  })
})
