// tests/e2e/factories/treatment-type.ts
// 診療類型測試資料工廠

import { prisma } from '../helpers/db'

interface TreatmentTypeData {
  name?: string
  durationMinutes?: number
  isActive?: boolean
  sortOrder?: number
}

/**
 * 創建測試診療類型
 */
export async function createTreatmentType(data: TreatmentTypeData = {}) {
  return prisma.treatmentType.create({
    data: {
      name: data.name ?? '測試診療',
      durationMinutes: data.durationMinutes ?? 5,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  })
}

/**
 * 創建初診類型（10 分鐘）
 */
export async function createFirstVisitTreatment(data: TreatmentTypeData = {}) {
  return createTreatmentType({
    name: '初診',
    durationMinutes: 10,
    ...data,
  })
}

/**
 * 創建內科類型（5 分鐘）
 */
export async function createInternalMedicineTreatment(data: TreatmentTypeData = {}) {
  return createTreatmentType({
    name: '內科',
    durationMinutes: 5,
    ...data,
  })
}

/**
 * 創建針灸類型（5 分鐘）
 */
export async function createAcupunctureTreatment(data: TreatmentTypeData = {}) {
  return createTreatmentType({
    name: '針灸',
    durationMinutes: 5,
    ...data,
  })
}
