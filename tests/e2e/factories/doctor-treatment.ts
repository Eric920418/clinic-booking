// tests/e2e/factories/doctor-treatment.ts
// 醫師診療項目關聯測試資料工廠

import { prisma } from '../helpers/db'

interface DoctorTreatmentData {
  doctorId: string
  treatmentTypeId: string
}

/**
 * 創建醫師診療項目關聯
 */
export async function createDoctorTreatment(data: DoctorTreatmentData) {
  return prisma.doctorTreatment.create({
    data: {
      doctorId: data.doctorId,
      treatmentTypeId: data.treatmentTypeId,
    },
  })
}

/**
 * 批量創建醫師診療項目關聯
 */
export async function createDoctorTreatments(
  doctorId: string,
  treatmentTypeIds: string[]
) {
  return Promise.all(
    treatmentTypeIds.map((treatmentTypeId) =>
      createDoctorTreatment({ doctorId, treatmentTypeId })
    )
  )
}
