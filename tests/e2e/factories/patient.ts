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

/**
 * 創建測試病患
 */
export async function createPatient(data: PatientData = {}) {
  const timestamp = Date.now()

  return prisma.patient.create({
    data: {
      name: data.name ?? '測試病患',
      phone: data.phone ?? `09${String(timestamp).slice(-8)}`,
      nationalId: data.nationalId ?? `A${String(timestamp).slice(-9)}`,
      lineUserId: data.lineUserId ?? `U${timestamp}`,
      birthDate: data.birthDate ?? new Date('1990-01-01'),
      notes: data.notes ?? null,
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
