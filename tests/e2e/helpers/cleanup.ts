// tests/e2e/helpers/cleanup.ts
// 資料庫清理函式，確保測試隔離

import { prisma } from './db'

/**
 * 清空資料庫所有資料
 * 按照外鍵依賴順序刪除（子表先刪）
 */
export async function cleanupDatabase() {
  // 1. 先刪除有外鍵依賴的子表
  await prisma.operationLog.deleteMany()
  await prisma.appointment.deleteMany()
  await prisma.blacklist.deleteMany()
  await prisma.timeSlot.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.doctorTreatment.deleteMany()

  // 2. 刪除獨立表
  await prisma.verificationCode.deleteMany()

  // 3. 刪除主表
  await prisma.treatmentType.deleteMany()
  await prisma.doctor.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.adminUser.deleteMany()
}

/**
 * 只清空驗證碼相關資料
 */
export async function cleanupVerificationCodes() {
  await prisma.verificationCode.deleteMany()
}
