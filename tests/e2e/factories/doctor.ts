// tests/e2e/factories/doctor.ts
// 醫師測試資料工廠

import { prisma } from '../helpers/db'

interface DoctorData {
  name?: string
  isActive?: boolean
}

/**
 * 創建測試醫師
 */
export async function createDoctor(data: DoctorData = {}) {
  return prisma.doctor.create({
    data: {
      name: data.name ?? '測試醫師',
      isActive: data.isActive ?? true,
    },
  })
}

/**
 * 創建停用的醫師
 */
export async function createInactiveDoctor(data: DoctorData = {}) {
  return createDoctor({
    ...data,
    isActive: false,
  })
}
