/**
 * 預約 API
 * 對應規格：spec/features/病患建立預約.feature
 * 
 * GET /api/liff/appointments - 取得我的預約
 * POST /api/liff/appointments - 建立預約
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ERROR_CODES, type ApiResponse } from '@/types';
import { sendAppointmentConfirmation } from '@/lib/line';
import { validateTaiwanNationalId } from '@/lib/validations/patient';
import { format, startOfDay, addHours } from 'date-fns';
import { Prisma } from '@prisma/client';

// =============================================
// GET: 取得我的預約
// =============================================
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lineUserId = searchParams.get('lineUserId');

    if (!lineUserId) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: 'LINE User ID 必填' },
      }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { lineUserId },
    });

    if (!patient) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      select: {
        id: true,
        appointmentDate: true,
        status: true,
        createdAt: true,
        doctor: {
          select: { name: true },
        },
        treatmentType: {
          select: { name: true },
        },
        timeSlot: {
          select: { startTime: true, endTime: true },
        },
      },
      orderBy: { appointmentDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: appointments.map((appt) => ({
        id: appt.id,
        appointmentDate: format(appt.appointmentDate, 'yyyy-MM-dd'),
        startTime: format(addHours(appt.timeSlot.startTime, 8), 'HH:mm'),
        endTime: format(addHours(appt.timeSlot.endTime, 8), 'HH:mm'),
        doctor: appt.doctor.name,
        treatmentType: appt.treatmentType.name,
        status: appt.status,
        createdAt: appt.createdAt.toISOString(),
      })),
    });

  } catch (error) {
    console.error('[GET /api/liff/appointments]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得預約失敗' },
    }, { status: 500 });
  }
}

// =============================================
// POST: 建立預約
// 對應規格：第 3.3.5 節 建立預約
// 
// 處理邏輯：
// 1. 接收預約請求
// 2. 開啟資料庫交易 (Transaction)
// 3. 鎖定該時段記錄 (SELECT FOR UPDATE)
// 4. 檢查剩餘分鐘數 >= 診療所需分鐘數
// 5. 檢查該病患當日是否已有預約
// 6. 若檢查通過：扣除時段分鐘數、建立預約記錄、發送 LINE 通知
// 7. 若檢查失敗：回滾交易、返回錯誤訊息
// =============================================
const createAppointmentSchema = z.object({
  lineUserId: z.string().optional(), // 可選：有則發送 LINE 通知
  patientData: z.object({
    name: z.string().min(2, '姓名至少需要 2 個字').max(20, '姓名最多 20 個字'),
    phone: z.string().regex(/^09\d{8}$/, '請輸入正確的手機號碼格式（09 開頭，共 10 碼）'),
    nationalId: z.string().min(1, '請輸入身分證字號'),
    birthDate: z.string().min(1, '請輸入出生日期'),
  }),
  doctorId: z.string().uuid('醫師 ID 格式不正確'),
  timeSlotId: z.string().uuid('時段 ID 格式不正確'),
  treatmentTypeId: z.string().uuid('診療項目 ID 格式不正確'),
  appointmentDate: z.string().min(1, '請選擇預約日期'),
});

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 });
    }

    const { lineUserId, patientData, doctorId, timeSlotId, treatmentTypeId, appointmentDate } = parsed.data;
    const appointmentDateObj = startOfDay(new Date(appointmentDate));

    // 規則：身分證字號必須符合台灣身分證格式
    // 對應規格：spec/features/病患資料處理.feature
    if (!validateTaiwanNationalId(patientData.nationalId)) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '請輸入有效的台灣身分證字號' },
      }, { status: 400 });
    }

    // 用身分證字號查找病患（身分證字號為唯一識別）
    let patient = await prisma.patient.findUnique({
      where: { nationalId: patientData.nationalId },
    });

    // 規則：病患不可在黑名單中
    // 對應規格：spec/features/病患建立預約.feature - 黑名單病患無法建立預約
    if (patient?.isBlacklisted) {
      return NextResponse.json({
        success: false,
        error: { code: 'E009', message: ERROR_CODES.E009 },
      }, { status: 403 });
    }

    // 如果是新病患，建立資料
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          lineUserId: lineUserId || null,
          name: patientData.name,
          phone: patientData.phone,
          nationalId: patientData.nationalId,
          birthDate: new Date(patientData.birthDate),
        },
      });
    } else {
      // 回診病患：更新資料（如果有提供 lineUserId 則綁定）
      patient = await prisma.patient.update({
        where: { id: patient.id },
        data: {
          name: patientData.name,
          phone: patientData.phone,
          birthDate: new Date(patientData.birthDate),
          // 如果之前沒有綁定 LINE，且這次有提供，則綁定
          ...(lineUserId && !patient.lineUserId ? { lineUserId } : {}),
        },
      });
    }

    // 取得診療類型
    const treatmentType = await prisma.treatmentType.findUnique({
      where: { id: treatmentTypeId },
    });

    if (!treatmentType || !treatmentType.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '診療類型不存在或已停用' },
      }, { status: 400 });
    }

    // =============================================
    // 使用交易處理併發預約
    // 對應規格：spec/features/併發預約控制.feature
    // 規則：使用 Row-Level Lock 鎖定時段記錄
    // =============================================
    try {
      const appointment = await prisma.$transaction(async (tx) => {
        // 規則：鎖定該時段記錄 (SELECT FOR UPDATE)
        // 對應規格：併發衝突處理 - 使用資料庫層級的 Row-Level Lock
        const timeSlots = await tx.$queryRaw<Array<{
          id: string;
          remaining_minutes: number;
          schedule_id: string;
        }>>`
          SELECT id, remaining_minutes, schedule_id 
          FROM time_slots 
          WHERE id = ${timeSlotId}::uuid 
          FOR UPDATE
        `;

        if (timeSlots.length === 0) {
          throw new Error('E003'); // 時段不存在
        }

        const timeSlot = timeSlots[0];

        // 規則：檢查剩餘分鐘數 >= 診療所需分鐘數
        // 對應規格：spec/features/病患建立預約.feature - 時段剩餘分鐘數必須大於等於診療所需分鐘數
        if (timeSlot.remaining_minutes < treatmentType.durationMinutes) {
          throw new Error('E003'); // 時段已滿
        }

        // 規則：病患當日不可有重複預約
        // 對應規格：spec/features/病患建立預約.feature - 病患當日已有預約時無法再次預約
        // 注意：不包含 cancelled、no_show、completed 狀態
        const existingAppointment = await tx.appointment.findFirst({
          where: {
            patientId: patient.id,
            appointmentDate: appointmentDateObj,
            status: {
              notIn: ['cancelled', 'no_show', 'completed'],
            },
          },
        });

        if (existingAppointment) {
          throw new Error('E004'); // 當日已有預約
        }

        // 規則：扣除時段分鐘數
        // 對應規格：spec/features/病患建立預約.feature - 預約成功後必須扣除時段分鐘數
        await tx.timeSlot.update({
          where: { id: timeSlotId },
          data: {
            remainingMinutes: {
              decrement: treatmentType.durationMinutes,
            },
          },
        });

        // 規則：建立預約記錄
        // 對應規格：spec/features/病患建立預約.feature - 預約成功後必須建立預約記錄
        const newAppointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId,
            treatmentTypeId,
            timeSlotId,
            appointmentDate: appointmentDateObj,
            status: 'booked',
          },
          include: {
            doctor: true,
            treatmentType: true,
            timeSlot: true,
          },
        });

        return newAppointment;
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });

      // 規則：發送 LINE 通知
      // 對應規格：spec/features/病患建立預約.feature - 預約成功後必須發送 LINE 通知
      if (patient.lineUserId) {
        await sendAppointmentConfirmation(
          patient.lineUserId,
          format(appointment.appointmentDate, 'yyyy-MM-dd'),
          format(addHours(appointment.timeSlot.startTime, 8), 'HH:mm'),
          appointment.doctor.name,
          appointment.treatmentType.name
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: appointment.id,
          appointmentDate: format(appointment.appointmentDate, 'yyyy-MM-dd'),
          startTime: format(addHours(appointment.timeSlot.startTime, 8), 'HH:mm'),
          endTime: format(addHours(appointment.timeSlot.endTime, 8), 'HH:mm'),
          doctor: appointment.doctor.name,
          treatmentType: appointment.treatmentType.name,
          status: appointment.status,
        },
      });

    } catch (error) {
      // 規則：併發衝突時返回錯誤訊息
      // 對應規格：spec/features/併發預約控制.feature
      const errorMessage = error instanceof Error ? error.message : 'E001';
      
      if (errorMessage === 'E003') {
        // 查詢同一時段其他醫師的可用選項
        const timeSlotInfo = await prisma.timeSlot.findUnique({
          where: { id: timeSlotId },
          include: { schedule: true },
        });

        let alternativeDoctors: Array<{ id: string; name: string }> = [];
        
        if (timeSlotInfo) {
          const alternatives = await prisma.timeSlot.findMany({
            where: {
              startTime: timeSlotInfo.startTime,
              remainingMinutes: { gte: treatmentType.durationMinutes },
              schedule: {
                date: timeSlotInfo.schedule.date,
                isAvailable: true,
                doctor: {
                  isActive: true,
                  id: { not: doctorId },
                },
              },
            },
            include: {
              schedule: {
                include: { doctor: true },
              },
            },
          });

          alternativeDoctors = alternatives.map((alt) => ({
            id: alt.schedule.doctor.id,
            name: alt.schedule.doctor.name,
          }));
        }

        return NextResponse.json({
          success: false,
          error: { code: 'E012', message: ERROR_CODES.E012 },
          data: { alternativeDoctors },
        }, { status: 409 });
      }

      if (errorMessage === 'E004') {
        return NextResponse.json({
          success: false,
          error: { code: 'E004', message: ERROR_CODES.E004 },
        }, { status: 409 });
      }

      throw error;
    }

  } catch (error) {
    console.error('[POST /api/liff/appointments]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '建立預約失敗' },
    }, { status: 500 });
  }
}

