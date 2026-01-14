/**
 * 資料庫 Seed 資料
 * 對應規格：automation-ts.md 第 2.4 節
 */
import { PrismaClient, AppointmentStatus, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, format, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始建立 Seed 資料...');

  // =============================================
  // 1. 診療類型（依規格書第 3.3.4 節）
  // =============================================
  console.log('📋 建立診療類型...');
  const treatmentTypes = await Promise.all([
    prisma.treatmentType.upsert({
      where: { id: 'treat-initial' },
      update: {},
      create: {
        id: 'treat-initial',
        name: '初診',
        durationMinutes: 10,  // 初診：10 分鐘
        sortOrder: 1,
      },
    }),
    prisma.treatmentType.upsert({
      where: { id: 'treat-internal' },
      update: {},
      create: {
        id: 'treat-internal',
        name: '內科',
        durationMinutes: 5,   // 內科：5 分鐘
        sortOrder: 2,
      },
    }),
    prisma.treatmentType.upsert({
      where: { id: 'treat-acupuncture' },
      update: {},
      create: {
        id: 'treat-acupuncture',
        name: '針灸',
        durationMinutes: 5,   // 針灸：5 分鐘
        sortOrder: 3,
      },
    }),
  ]);
  console.log(`  ✓ 建立 ${treatmentTypes.length} 個診療類型`);

  // =============================================
  // 2. 醫師資料（至少 3 位）
  // =============================================
  console.log('👨‍⚕️ 建立醫師資料...');
  const doctors = await Promise.all([
    prisma.doctor.upsert({
      where: { id: 'doctor-wang' },
      update: {},
      create: {
        id: 'doctor-wang',
        name: '王醫師',
        isActive: true,
      },
    }),
    prisma.doctor.upsert({
      where: { id: 'doctor-lee' },
      update: {},
      create: {
        id: 'doctor-lee',
        name: '李醫師',
        isActive: true,
      },
    }),
    prisma.doctor.upsert({
      where: { id: 'doctor-chen' },
      update: {},
      create: {
        id: 'doctor-chen',
        name: '陳醫師',
        isActive: true,
      },
    }),
  ]);
  console.log(`  ✓ 建立 ${doctors.length} 位醫師`);

  // =============================================
  // 3. 醫師可看診項目設定
  // =============================================
  console.log('🔗 建立醫師診療項目關聯...');
  // 王醫師：全部診療項目
  await prisma.doctorTreatment.upsert({
    where: { doctorId_treatmentTypeId: { doctorId: 'doctor-wang', treatmentTypeId: 'treat-initial' } },
    update: {},
    create: { doctorId: 'doctor-wang', treatmentTypeId: 'treat-initial' },
  });
  await prisma.doctorTreatment.upsert({
    where: { doctorId_treatmentTypeId: { doctorId: 'doctor-wang', treatmentTypeId: 'treat-internal' } },
    update: {},
    create: { doctorId: 'doctor-wang', treatmentTypeId: 'treat-internal' },
  });
  await prisma.doctorTreatment.upsert({
    where: { doctorId_treatmentTypeId: { doctorId: 'doctor-wang', treatmentTypeId: 'treat-acupuncture' } },
    update: {},
    create: { doctorId: 'doctor-wang', treatmentTypeId: 'treat-acupuncture' },
  });

  // 李醫師：初診、內科
  await prisma.doctorTreatment.upsert({
    where: { doctorId_treatmentTypeId: { doctorId: 'doctor-lee', treatmentTypeId: 'treat-initial' } },
    update: {},
    create: { doctorId: 'doctor-lee', treatmentTypeId: 'treat-initial' },
  });
  await prisma.doctorTreatment.upsert({
    where: { doctorId_treatmentTypeId: { doctorId: 'doctor-lee', treatmentTypeId: 'treat-internal' } },
    update: {},
    create: { doctorId: 'doctor-lee', treatmentTypeId: 'treat-internal' },
  });

  // 陳醫師：針灸
  await prisma.doctorTreatment.upsert({
    where: { doctorId_treatmentTypeId: { doctorId: 'doctor-chen', treatmentTypeId: 'treat-acupuncture' } },
    update: {},
    create: { doctorId: 'doctor-chen', treatmentTypeId: 'treat-acupuncture' },
  });
  console.log('  ✓ 建立醫師診療項目關聯');

  // =============================================
  // 4. 班表與時段（未來 14 天）
  // =============================================
  console.log('📅 建立班表與時段...');
  const today = new Date();

  // 時段配置（上午 09:00-12:00，下午 14:00-17:00）
  const timeSlotConfigs = [
    { startHour: 9, startMin: 0 },
    { startHour: 9, startMin: 30 },
    { startHour: 10, startMin: 0 },
    { startHour: 10, startMin: 30 },
    { startHour: 11, startMin: 0 },
    { startHour: 11, startMin: 30 },
    { startHour: 14, startMin: 0 },
    { startHour: 14, startMin: 30 },
    { startHour: 15, startMin: 0 },
    { startHour: 15, startMin: 30 },
    { startHour: 16, startMin: 0 },
    { startHour: 16, startMin: 30 },
  ];

  let scheduleCount = 0;
  let timeSlotCount = 0;

  // 使用 transaction 批量處理每一天的資料
  for (let dayOffset = -1; dayOffset < 14; dayOffset++) {
    const date = addDays(today, dayOffset);
    const dateStr = format(date, 'yyyy-MM-dd');

    // 批量建立當天所有醫師的班表
    const scheduleOps = doctors.map((doctor) =>
      prisma.schedule.upsert({
        where: { doctorId_date: { doctorId: doctor.id, date: new Date(dateStr) } },
        update: {},
        create: { doctorId: doctor.id, date: new Date(dateStr), isAvailable: true },
      })
    );
    const schedules = await prisma.$transaction(scheduleOps);
    scheduleCount += schedules.length;

    // 建立時段資料
    const timeSlotData: { id: string; scheduleId: string; startTime: Date; endTime: Date; totalMinutes: number; remainingMinutes: number }[] = [];

    for (const schedule of schedules) {
      const doctor = doctors.find((d) => d.id === schedule.doctorId)!;
      for (const config of timeSlotConfigs) {
        const startTime = setMinutes(setHours(new Date('2000-01-01'), config.startHour), config.startMin);
        const endTime = setMinutes(setHours(new Date('2000-01-01'), config.startHour), config.startMin + 30);
        const slotId = `slot-${doctor.id}-${dateStr}-${format(startTime, 'HHmm')}`;

        timeSlotData.push({
          id: slotId,
          scheduleId: schedule.id,
          startTime,
          endTime,
          totalMinutes: 30,
          remainingMinutes: 30,
        });
      }
    }

    await prisma.timeSlot.createMany({ data: timeSlotData, skipDuplicates: true });
    timeSlotCount += timeSlotData.length;
  }

  console.log(`  ✓ 建立 ${scheduleCount} 筆班表，${timeSlotCount} 個時段`);

  // =============================================
  // 5. 病患資料（至少 5 位，含黑名單病患）
  // =============================================
  console.log('👤 建立病患資料...');
  const patients = await Promise.all([
    prisma.patient.upsert({
      where: { id: 'patient-normal-1' },
      update: {},
      create: {
        id: 'patient-normal-1',
        lineUserId: 'U1234567890abcdef1234567890abcdef',
        name: '張小明',
        phone: '0912345678',
        nationalId: 'A123456789',
        birthDate: new Date('1990-01-15'),
        noShowCount: 0,
        isBlacklisted: false,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-normal-2' },
      update: {},
      create: {
        id: 'patient-normal-2',
        lineUserId: 'U2234567890abcdef1234567890abcdef',
        name: '李小華',
        phone: '0923456789',
        nationalId: 'B223456789',
        birthDate: new Date('1985-06-20'),
        noShowCount: 1,
        isBlacklisted: false,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-normal-3' },
      update: {},
      create: {
        id: 'patient-normal-3',
        lineUserId: 'U3334567890abcdef1234567890abcdef',
        name: '王大衛',
        phone: '0934567890',
        nationalId: 'C123456789',
        birthDate: new Date('1978-12-01'),
        noShowCount: 2,
        isBlacklisted: false,
      },
    }),
    prisma.patient.upsert({
      where: { id: 'patient-normal-4' },
      update: {},
      create: {
        id: 'patient-normal-4',
        lineUserId: 'U4444567890abcdef1234567890abcdef',
        name: '陳美玲',
        phone: '0945678901',
        nationalId: 'D223456789',
        birthDate: new Date('1995-03-25'),
        noShowCount: 0,
        isBlacklisted: false,
      },
    }),
    // 黑名單病患
    prisma.patient.upsert({
      where: { id: 'patient-blacklisted' },
      update: {},
      create: {
        id: 'patient-blacklisted',
        lineUserId: 'U5554567890abcdef1234567890abcdef',
        name: '林問題',
        phone: '0956789012',
        nationalId: 'E123456789',
        birthDate: new Date('1982-08-10'),
        noShowCount: 3,
        isBlacklisted: true,
      },
    }),
  ]);
  console.log(`  ✓ 建立 ${patients.length} 位病患`);

  // 建立黑名單記錄
  await prisma.blacklist.upsert({
    where: { patientId: 'patient-blacklisted' },
    update: {},
    create: {
      patientId: 'patient-blacklisted',
      reason: '未報到累計達 3 次',
    },
  });
  console.log('  ✓ 建立黑名單記錄');

  // =============================================
  // 6. 預約資料（各種狀態）
  // =============================================
  console.log('📝 建立預約資料...');
  const tomorrow = addDays(today, 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
  const dayAfterTomorrow = addDays(today, 2);
  const dayAfterTomorrowStr = format(dayAfterTomorrow, 'yyyy-MM-dd');

  // 取得時段 ID
  const getTimeSlotId = (doctorId: string, dateStr: string, hour: number, min: number) =>
    `slot-${doctorId}-${dateStr}-${hour.toString().padStart(2, '0')}${min.toString().padStart(2, '0')}`;

  const appointments = await Promise.all([
    // 已預約
    prisma.appointment.upsert({
      where: { id: 'appt-booked-1' },
      update: {},
      create: {
        id: 'appt-booked-1',
        patientId: 'patient-normal-1',
        doctorId: 'doctor-wang',
        treatmentTypeId: 'treat-internal',
        timeSlotId: getTimeSlotId('doctor-wang', tomorrowStr, 9, 0),
        appointmentDate: new Date(tomorrowStr),
        status: 'booked' as AppointmentStatus,
      },
    }),
    // 已報到
    prisma.appointment.upsert({
      where: { id: 'appt-checked-in-1' },
      update: {},
      create: {
        id: 'appt-checked-in-1',
        patientId: 'patient-normal-2',
        doctorId: 'doctor-lee',
        treatmentTypeId: 'treat-initial',
        timeSlotId: getTimeSlotId('doctor-lee', format(today, 'yyyy-MM-dd'), 9, 30),
        appointmentDate: today,
        status: 'checked_in' as AppointmentStatus,
      },
    }),
    // 已完成
    prisma.appointment.upsert({
      where: { id: 'appt-completed-1' },
      update: {},
      create: {
        id: 'appt-completed-1',
        patientId: 'patient-normal-3',
        doctorId: 'doctor-chen',
        treatmentTypeId: 'treat-acupuncture',
        timeSlotId: getTimeSlotId('doctor-chen', format(today, 'yyyy-MM-dd'), 10, 0),
        appointmentDate: today,
        status: 'completed' as AppointmentStatus,
      },
    }),
    // 未報到
    prisma.appointment.upsert({
      where: { id: 'appt-no-show-1' },
      update: {},
      create: {
        id: 'appt-no-show-1',
        patientId: 'patient-normal-4',
        doctorId: 'doctor-wang',
        treatmentTypeId: 'treat-internal',
        timeSlotId: getTimeSlotId('doctor-wang', format(addDays(today, -1), 'yyyy-MM-dd'), 14, 0),
        appointmentDate: addDays(today, -1),
        status: 'no_show' as AppointmentStatus,
      },
    }),
    // 已取消
    prisma.appointment.upsert({
      where: { id: 'appt-cancelled-1' },
      update: {},
      create: {
        id: 'appt-cancelled-1',
        patientId: 'patient-normal-1',
        doctorId: 'doctor-lee',
        treatmentTypeId: 'treat-internal',
        timeSlotId: getTimeSlotId('doctor-lee', dayAfterTomorrowStr, 15, 0),
        appointmentDate: new Date(dayAfterTomorrowStr),
        status: 'cancelled' as AppointmentStatus,
        cancelledReason: '病患臨時有事',
      },
    }),
  ]);
  console.log(`  ✓ 建立 ${appointments.length} 筆預約`);

  // 更新對應時段的剩餘分鐘數
  await prisma.timeSlot.update({
    where: { id: getTimeSlotId('doctor-wang', tomorrowStr, 9, 0) },
    data: { remainingMinutes: 25 }, // 30 - 5（內科）
  });
  await prisma.timeSlot.update({
    where: { id: getTimeSlotId('doctor-lee', format(today, 'yyyy-MM-dd'), 9, 30) },
    data: { remainingMinutes: 20 }, // 30 - 10（初診）
  });
  await prisma.timeSlot.update({
    where: { id: getTimeSlotId('doctor-chen', format(today, 'yyyy-MM-dd'), 10, 0) },
    data: { remainingMinutes: 25 }, // 30 - 5（針灸）
  });
  console.log('  ✓ 更新時段剩餘分鐘數');

  // =============================================
  // 7. 管理員帳號
  // =============================================
  console.log('🔐 建立管理員帳號...');
  const passwordHash = await bcrypt.hash('Admin123', 12);
  
  await prisma.adminUser.upsert({
    where: { id: 'admin-super' },
    update: {},
    create: {
      id: 'admin-super',
      email: 'super@clinic.com',
      passwordHash,
      name: '超級管理員',
      role: 'super_admin' as AdminRole,
      isActive: true,
    },
  });
  
  await prisma.adminUser.upsert({
    where: { id: 'admin-normal' },
    update: {},
    create: {
      id: 'admin-normal',
      email: 'admin@clinic.com',
      passwordHash,
      name: '一般管理員',
      role: 'admin' as AdminRole,
      isActive: true,
    },
  });
  console.log('  ✓ 建立 2 個管理員帳號');
  console.log('    - super@clinic.com / Admin123 (超級管理員)');
  console.log('    - admin@clinic.com / Admin123 (一般管理員)');

  console.log('\n✅ Seed 資料建立完成！');
}

main()
  .catch((e) => {
    console.error('❌ Seed 失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

