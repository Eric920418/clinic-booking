// tests/e2e/factories/blacklist.ts
// 黑名單測試資料工廠

import { prisma } from '../helpers/db'

interface BlacklistData {
  patientId: string
  reason?: string | null
  createdBy?: string | null
}

/**
 * 創建黑名單記錄
 */
export async function createBlacklist(data: BlacklistData) {
  return prisma.blacklist.create({
    data: {
      patientId: data.patientId,
      reason: data.reason ?? '累計未報到 3 次',
      createdBy: data.createdBy ?? null,
    },
  })
}

/**
 * 將病患加入黑名單（同時更新 Patient.isBlacklisted）
 */
export async function addPatientToBlacklist(patientId: string, reason?: string) {
  // 先更新病患的黑名單狀態
  await prisma.patient.update({
    where: { id: patientId },
    data: { isBlacklisted: true },
  })

  // 建立黑名單記錄
  return createBlacklist({
    patientId,
    reason: reason ?? '累計未報到 3 次',
  })
}
