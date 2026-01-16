/**
 * 清理假資料腳本
 * 刪除所有醫師、病患、預約記錄
 *
 * 執行方式：pnpm tsx prisma/clean-fake-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 開始清理假資料...\n');

  // 1. 刪除所有預約
  const appointmentCount = await prisma.appointment.count();
  await prisma.appointment.deleteMany();
  console.log(`✓ 刪除 ${appointmentCount} 筆預約記錄`);

  // 2. 刪除所有黑名單記錄
  const blacklistCount = await prisma.blacklist.count();
  await prisma.blacklist.deleteMany();
  console.log(`✓ 刪除 ${blacklistCount} 筆黑名單記錄`);

  // 3. 刪除所有驗證碼
  const verificationCodeCount = await prisma.verificationCode.count();
  await prisma.verificationCode.deleteMany();
  console.log(`✓ 刪除 ${verificationCodeCount} 筆驗證碼記錄`);

  // 4. 刪除所有病患
  const patientCount = await prisma.patient.count();
  await prisma.patient.deleteMany();
  console.log(`✓ 刪除 ${patientCount} 筆病患資料`);

  // 5. 刪除所有醫師診療項目關聯
  const doctorTreatmentCount = await prisma.doctorTreatment.count();
  await prisma.doctorTreatment.deleteMany();
  console.log(`✓ 刪除 ${doctorTreatmentCount} 筆醫師診療項目關聯`);

  // 6. 刪除所有時段（會連帶刪除班表因為 cascade）
  const timeSlotCount = await prisma.timeSlot.count();
  await prisma.timeSlot.deleteMany();
  console.log(`✓ 刪除 ${timeSlotCount} 筆時段記錄`);

  // 7. 刪除所有班表
  const scheduleCount = await prisma.schedule.count();
  await prisma.schedule.deleteMany();
  console.log(`✓ 刪除 ${scheduleCount} 筆班表記錄`);

  // 8. 刪除所有醫師
  const doctorCount = await prisma.doctor.count();
  await prisma.doctor.deleteMany();
  console.log(`✓ 刪除 ${doctorCount} 筆醫師資料`);

  console.log('\n✅ 假資料清理完成！');
  console.log('\n📌 保留的資料：');
  console.log('   - 診療類型（初診、內科、針灸）');
  console.log('   - 管理員帳號');
}

main()
  .catch((e) => {
    console.error('❌ 清理失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
