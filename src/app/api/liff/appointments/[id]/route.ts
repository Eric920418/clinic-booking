/**
 * 單一預約操作 API
 * 對應規格：spec/features/病患修改預約.feature, spec/features/病患取消預約.feature
 * 
 * GET /api/liff/appointments/:id - 取得預約詳情
 * PUT /api/liff/appointments/:id - 修改預約
 * DELETE /api/liff/appointments/:id - 取消預約
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ERROR_CODES, type ApiResponse } from '@/types';
import { sendAppointmentModification, sendAppointmentCancellation } from '@/lib/line';
import { format, startOfDay, addHours, isBefore } from 'date-fns';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================
// GET: 取得預約詳情
// =============================================
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        treatmentType: true,
        timeSlot: {
          include: { schedule: true },
        },
      },
    });

    if (!appointment) {
      return NextResponse.json({
        success: false,
        error: { code: 'E007', message: ERROR_CODES.E007 },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: appointment.id,
        appointmentDate: format(appointment.appointmentDate, 'yyyy-MM-dd'),
        startTime: format(appointment.timeSlot.startTime, 'HH:mm'),
        endTime: format(appointment.timeSlot.endTime, 'HH:mm'),
        doctor: {
          id: appointment.doctor.id,
          name: appointment.doctor.name,
        },
        treatmentType: {
          id: appointment.treatmentType.id,
          name: appointment.treatmentType.name,
          durationMinutes: appointment.treatmentType.durationMinutes,
        },
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('[GET /api/liff/appointments/:id]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得預約詳情失敗' },
    }, { status: 500 });
  }
}

// =============================================
// PUT: 修改預約
// 對應規格：spec/features/病患修改預約.feature
// 
// 處理邏輯：
// 1. 接收修改請求
// 2. 開啟資料庫交易
// 3. 釋放原時段分鐘數（立即）
// 4. 鎖定新時段
// 5. 檢查新時段餘量
// 6. 更新預約記錄
// 7. 提交交易
// =============================================
const updateAppointmentSchema = z.object({
  doctorId: z.string().uuid().optional(),
  timeSlotId: z.string().uuid().optional(),
  treatmentTypeId: z.string().uuid().optional(),
  appointmentDate: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAppointmentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.errors[0].message },
      }, { status: 400 });
    }

    const updates = parsed.data;

    // 取得原預約
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        treatmentType: true,
        timeSlot: {
          include: { schedule: true },
        },
      },
    });

    if (!existingAppointment) {
      return NextResponse.json({
        success: false,
        error: { code: 'E007', message: ERROR_CODES.E007 },
      }, { status: 404 });
    }

    // 規則：僅可修改「已預約」狀態的預約
    // 對應規格：spec/features/病患修改預約.feature - 僅限已預約狀態可修改
    if (existingAppointment.status !== 'booked') {
      return NextResponse.json({
        success: false,
        error: { code: 'E008', message: ERROR_CODES.E008 },
      }, { status: 400 });
    }

    // 規則：時段開始前 3 小時內不可修改預約
    // 對應規格：spec/features/病患修改預約.feature - 時段開始前 3 小時內不可修改預約
    const appointmentDateTime = new Date(existingAppointment.timeSlot.schedule.date);
    const [hours, minutes] = format(existingAppointment.timeSlot.startTime, 'HH:mm').split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    const threeHoursBefore = addHours(appointmentDateTime, -3);
    if (isBefore(threeHoursBefore, new Date())) {
      return NextResponse.json({
        success: false,
        error: { code: 'E011', message: ERROR_CODES.E011 },
      }, { status: 400 });
    }

    // 取得新的診療類型（如果有變更）
    const newTreatmentTypeId = updates.treatmentTypeId || existingAppointment.treatmentTypeId;
    const newTreatmentType = await prisma.treatmentType.findUnique({
      where: { id: newTreatmentTypeId },
    });

    if (!newTreatmentType || !newTreatmentType.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '診療類型不存在或已停用' },
      }, { status: 400 });
    }

    // 如果時段有變更，執行交易處理
    const newTimeSlotId = updates.timeSlotId || existingAppointment.timeSlotId;
    const isTimeSlotChanged = newTimeSlotId !== existingAppointment.timeSlotId;

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      if (isTimeSlotChanged) {
        // 規則：釋放原時段分鐘數（立即）
        // 對應規格：spec/features/病患修改預約.feature
        await tx.timeSlot.update({
          where: { id: existingAppointment.timeSlotId },
          data: {
            remainingMinutes: {
              increment: existingAppointment.treatmentType.durationMinutes,
            },
          },
        });

        // 鎖定新時段
        const timeSlots = await tx.$queryRaw<Array<{
          id: string;
          remaining_minutes: number;
        }>>`
          SELECT id, remaining_minutes 
          FROM time_slots 
          WHERE id = ${newTimeSlotId}::uuid 
          FOR UPDATE
        `;

        if (timeSlots.length === 0) {
          throw new Error('E003');
        }

        const newTimeSlot = timeSlots[0];

        // 檢查新時段餘量
        if (newTimeSlot.remaining_minutes < newTreatmentType.durationMinutes) {
          throw new Error('E003');
        }

        // 扣除新時段分鐘數
        await tx.timeSlot.update({
          where: { id: newTimeSlotId },
          data: {
            remainingMinutes: {
              decrement: newTreatmentType.durationMinutes,
            },
          },
        });
      } else if (updates.treatmentTypeId && updates.treatmentTypeId !== existingAppointment.treatmentTypeId) {
        // 如果只變更診療類型，調整時段餘量
        const minutesDiff = newTreatmentType.durationMinutes - existingAppointment.treatmentType.durationMinutes;
        
        // 檢查是否有足夠餘量
        const currentTimeSlot = await tx.timeSlot.findUnique({
          where: { id: existingAppointment.timeSlotId },
        });

        if (currentTimeSlot && currentTimeSlot.remainingMinutes < minutesDiff) {
          throw new Error('E003');
        }

        await tx.timeSlot.update({
          where: { id: existingAppointment.timeSlotId },
          data: {
            remainingMinutes: {
              decrement: minutesDiff,
            },
          },
        });
      }

      // 更新預約記錄
      const appointment = await tx.appointment.update({
        where: { id },
        data: {
          doctorId: updates.doctorId || existingAppointment.doctorId,
          timeSlotId: newTimeSlotId,
          treatmentTypeId: newTreatmentTypeId,
          appointmentDate: updates.appointmentDate 
            ? startOfDay(new Date(updates.appointmentDate))
            : existingAppointment.appointmentDate,
        },
        include: {
          patient: true,
          doctor: true,
          treatmentType: true,
          timeSlot: {
            include: { schedule: true },
          },
        },
      });

      return appointment;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    // 規則：發送修改通知
    // 對應規格：spec/features/病患修改預約.feature - 修改成功後必須發送 LINE 通知
    if (updatedAppointment.patient.lineUserId) {
      await sendAppointmentModification(
        updatedAppointment.patient.lineUserId,
        format(updatedAppointment.appointmentDate, 'yyyy-MM-dd'),
        format(updatedAppointment.timeSlot.startTime, 'HH:mm')
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAppointment.id,
        appointmentDate: format(updatedAppointment.appointmentDate, 'yyyy-MM-dd'),
        startTime: format(updatedAppointment.timeSlot.startTime, 'HH:mm'),
        endTime: format(updatedAppointment.timeSlot.endTime, 'HH:mm'),
        doctor: updatedAppointment.doctor.name,
        treatmentType: updatedAppointment.treatmentType.name,
        status: updatedAppointment.status,
      },
    });

  } catch (error) {
    console.error('[PUT /api/liff/appointments/:id]', error);
    
    const errorMessage = error instanceof Error ? error.message : 'E001';
    if (errorMessage === 'E003') {
      return NextResponse.json({
        success: false,
        error: { code: 'E003', message: ERROR_CODES.E003 },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '修改預約失敗' },
    }, { status: 500 });
  }
}

// =============================================
// DELETE: 取消預約
// 對應規格：spec/features/病患取消預約.feature
// 
// 處理邏輯：
// 1. 更新預約狀態為「已取消」
// 2. 釋放時段分鐘數
// 3. 發送 LINE 取消通知
// =============================================
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const { id } = await params;

    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        treatmentType: true,
      },
    });

    if (!existingAppointment) {
      return NextResponse.json({
        success: false,
        error: { code: 'E007', message: ERROR_CODES.E007 },
      }, { status: 404 });
    }

    // 規則：僅可取消「已預約」狀態的預約
    // 對應規格：spec/features/病患取消預約.feature - 僅限已預約狀態可取消
    if (existingAppointment.status !== 'booked') {
      return NextResponse.json({
        success: false,
        error: { code: 'E008', message: '無法取消此預約' },
      }, { status: 400 });
    }

    await prisma.$transaction([
      // 規則：更新預約狀態為「已取消」
      prisma.appointment.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledReason: '病患自行取消',
        },
      }),
      // 規則：釋放時段分鐘數
      // 對應規格：spec/features/病患取消預約.feature - 取消預約後必須釋放時段分鐘數
      prisma.timeSlot.update({
        where: { id: existingAppointment.timeSlotId },
        data: {
          remainingMinutes: {
            increment: existingAppointment.treatmentType.durationMinutes,
          },
        },
      }),
    ]);

    // 規則：發送 LINE 取消通知
    // 對應規格：spec/features/病患取消預約.feature - 取消成功後必須發送 LINE 通知
    if (existingAppointment.patient.lineUserId) {
      await sendAppointmentCancellation(existingAppointment.patient.lineUserId);
    }

    return NextResponse.json({
      success: true,
      data: { message: '預約已取消' },
    });

  } catch (error) {
    console.error('[DELETE /api/liff/appointments/:id]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取消預約失敗' },
    }, { status: 500 });
  }
}

