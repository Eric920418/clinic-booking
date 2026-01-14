// tests/e2e/factories/patient.ts
// 病患測試資料工廠

import { prisma } from '../helpers/db'

interface PatientData {
  name?: string
  phone?: string
  nationalId?: string
  lineUserId?: string | null
  birthDate?: Date
  notes?: string | null
  noShowCount?: number
  isBlacklisted?: boolean
}

// 全域計數器，確保每次創建的病患都有唯一的身分證字號
let patientCounter = 0

/**
 * 創建測試病患
 */
export async function createPatient(data: PatientData = {}) {
  const timestamp = Date.now()
  const uniqueId = `${timestamp}${++patientCounter}${Math.random().toString(36).slice(2, 6)}`

  return prisma.patient.create({
    data: {
      name: data.name ?? '測試病患',
      phone: data.phone ?? `09${uniqueId.slice(-8)}`,
      nationalId: data.nationalId ?? `A${uniqueId.slice(-9)}`,
      // 明確處理 null：只有 undefined 時才使用默認值
      lineUserId: data.lineUserId === undefined ? `U${uniqueId}` : data.lineUserId,
      birthDate: data.birthDate ?? new Date('1990-01-01'),
      notes: data.notes === undefined ? null : data.notes,
      noShowCount: data.noShowCount ?? 0,
      isBlacklisted: data.isBlacklisted ?? false,
    },
  })
}

/**
 * 創建黑名單病患
 */
export async function createBlacklistedPatient(data: PatientData = {}) {
  return createPatient({
    ...data,
    isBlacklisted: true,
  })
}
