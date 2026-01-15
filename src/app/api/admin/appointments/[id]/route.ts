/**
 * 管理員編輯預約 API
 * 對應規格：spec/features/管理員編輯預約.feature
 *
 * GET /api/admin/appointments/:id - 取得預約詳情
 * PUT /api/admin/appointments/:id - 編輯預約
 * DELETE /api/admin/appointments/:id - 取消預約
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ERROR_CODES, type ApiResponse } from '@/types';
import { Prisma } from '@prisma/client';
import { sendAppointmentCancellation } from '@/lib/line';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================
// GET: 取得預約詳情
// =============================================
export async function GET(
  _request: NextRequest,
  { params: _params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '未登入' },
    }, { status: 401 });
  }

  // TODO: 實作取得預約詳情
  return NextResponse.json({
    success: false,
    error: { code: 'E001', message: 'Not implemented' },
  }, { status: 501 });
}

// =============================================
// PUT: 編輯預約
// 對應規格：
// - Rule: 修改預約時必須立即釋放原時段分鐘數
// - Rule: 修改預約時必須檢查新時段餘量
// - Rule: 修改預約時必須扣除新時段分鐘數
// - Rule: 修改記錄必須包含操作人與操作時間
// =============================================
const updateAppointmentSchema = z.object({
  // 方式一：直接指定 timeSlotId
  timeSlotId: z.string().uuid().optional(),
  // 方式二：使用 date + time + doctorId 查找 timeSlotId
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  doctorId: z.string().uuid().optional(),
  // 診療類型
  treatmentTypeId: z.string().uuid().optional(),
  treatmentType: z.enum(['first_visit', 'internal', 'acupuncture']).optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 });
    }

    const { timeSlotId: newTimeSlotId, treatmentTypeId: newTreatmentTypeId, date, time, doctorId, treatmentType } = parsed.data;

    // 使用交易處理，確保資料一致性
    const result = await prisma.$transaction(async (tx) => {
      // 查詢原預約（包含原時段和原診療類型）
      const originalAppointment = await tx.appointment.findUnique({
        where: { id },
        include: {
          timeSlot: {
            include: { schedule: true },
          },
          treatmentType: true,
        },
      });

      if (!originalAppointment) {
        throw new Error('E007'); // 無此預約
      }

      // 決定最終的 timeSlotId
      let finalTimeSlotId = newTimeSlotId || originalAppointment.timeSlotId;

      // 如果提供了 date、time、doctorId，則查找對應的 timeSlotId
      if (date && time && doctorId) {
        const targetDate = new Date(date);
        const schedule = await tx.schedule.findUnique({
          where: {
            doctorId_date: {
              doctorId,
              date: targetDate,
            },
          },
        });

        if (!schedule) {
          throw new Error('E001_NO_SCHEDULE'); // 該日期無班表
        }

        const timeSlot = await tx.timeSlot.findFirst({
          where: {
            scheduleId: schedule.id,
            startTime: time,
          },
        });

        if (!timeSlot) {
          throw new Error('E001_NO_TIMESLOT'); // 該時段不存在
        }

        finalTimeSlotId = timeSlot.id;
      }

      // 決定最終的診療類型 ID
      let finalTreatmentTypeId = newTreatmentTypeId || originalAppointment.treatmentTypeId;

      // 如果提供了 treatmentType 名稱，則查找對應的 ID
      if (treatmentType) {
        const treatmentTypeMap: Record<string, string> = {
          first_visit: '初診',
          internal: '內科',
          acupuncture: '針灸',
        };
        const treatmentTypeRecord = await tx.treatmentType.findFirst({
          where: { name: treatmentTypeMap[treatmentType] },
        });
        if (treatmentTypeRecord) {
          finalTreatmentTypeId = treatmentTypeRecord.id;
        }
      }

      // 如果沒有任何變更，直接返回
      if (finalTimeSlotId === originalAppointment.timeSlotId && finalTreatmentTypeId === originalAppointment.treatmentTypeId) {
        return originalAppointment;
      }

      // 取得最終的診療類型（用於計算分鐘數）
      const finalTreatmentType = finalTreatmentTypeId !== originalAppointment.treatmentTypeId
        ? await tx.treatmentType.findUnique({ where: { id: finalTreatmentTypeId } })
        : originalAppointment.treatmentType;

      if (!finalTreatmentType) {
        throw new Error('E001'); // 診療類型不存在
      }

      // Rule 1: 修改預約時必須立即釋放原時段分鐘數
      // 釋放原時段的分鐘數（加回原診療類型所需的分鐘數）
      await tx.timeSlot.update({
        where: { id: originalAppointment.timeSlotId },
        data: {
          remainingMinutes: {
            increment: originalAppointment.treatmentType.durationMinutes,
          },
        },
      });

      // Rule 2: 修改預約時必須檢查新時段餘量
      // 使用 Serializable transaction isolation level 確保資料一致性
      const newTimeSlot = await tx.timeSlot.findUnique({
        where: { id: finalTimeSlotId },
      });

      if (!newTimeSlot) {
        throw new Error('E001'); // 時段不存在
      }

      if (newTimeSlot.remainingMinutes < finalTreatmentType.durationMinutes) {
        throw new Error('E003'); // 時段餘量不足
      }

      // Rule 3: 修改預約時必須扣除新時段分鐘數
      await tx.timeSlot.update({
        where: { id: finalTimeSlotId },
        data: {
          remainingMinutes: {
            decrement: finalTreatmentType.durationMinutes,
          },
        },
      });

      // 更新預約記錄
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          timeSlotId: finalTimeSlotId,
          treatmentTypeId: finalTreatmentTypeId,
        },
        include: {
          patient: true,
          doctor: true,
          treatmentType: true,
          timeSlot: true,
        },
      });

      // Rule 4: 修改記錄必須包含操作人與操作時間
      await tx.operationLog.create({
        data: {
          adminUserId: user.userId,
          action: 'UPDATE_APPOINTMENT',
          targetType: 'appointment',
          targetId: id,
          details: {
            previousTimeSlotId: originalAppointment.timeSlotId,
            previousTreatmentTypeId: originalAppointment.treatmentTypeId,
            newTimeSlotId: finalTimeSlotId,
            newTreatmentTypeId: finalTreatmentTypeId,
          },
        },
      });

      return updatedAppointment;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        message: '預約修改成功',
      },
    });

  } catch (error) {
    console.error('[PUT /api/admin/appointments/:id]', error);

    const errorMessage = error instanceof Error ? error.message : 'E001';

    if (errorMessage === 'E003') {
      return NextResponse.json({
        success: false,
        error: { code: 'E003', message: ERROR_CODES.E003 },
      }, { status: 400 });
    }

    if (errorMessage === 'E007') {
      return NextResponse.json({
        success: false,
        error: { code: 'E007', message: ERROR_CODES.E007 },
      }, { status: 404 });
    }

    if (errorMessage === 'E001_NO_SCHEDULE') {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '該日期無班表' },
      }, { status: 400 });
    }

    if (errorMessage === 'E001_NO_TIMESLOT') {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '該時段不存在' },
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '修改預約失敗' },
    }, { status: 500 });
  }
}

// =============================================
// DELETE: 取消預約
// 對應規格：spec/features/管理員取消預約.feature
// - Rule: 取消預約時必須更新預約狀態為「已取消」
// - Rule: 取消預約時必須釋放時段分鐘數
// - Rule: 取消成功後必須發送 LINE 通知
// =============================================
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    const { id } = await params;

    // 使用交易處理，確保資料一致性
    const result = await prisma.$transaction(async (tx) => {
      // 查詢預約（包含病患、時段和診療類型）
      const appointment = await tx.appointment.findUnique({
        where: { id },
        include: {
          patient: true,
          timeSlot: true,
          treatmentType: true,
        },
      });

      if (!appointment) {
        throw new Error('E007'); // 無此預約
      }

      // Rule 1: 取消預約時必須更新預約狀態為「已取消」
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          status: 'cancelled',
        },
      });

      // Rule 2: 取消預約時必須釋放時段分鐘數
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: {
          remainingMinutes: {
            increment: appointment.treatmentType.durationMinutes,
          },
        },
      });

      return {
        appointment: updatedAppointment,
        lineUserId: appointment.patient.lineUserId,
        previousStatus: appointment.status,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    // Rule 3: 取消成功後發送 LINE 通知（在 transaction 外執行）
    let lineNotificationSent = false;
    const lineUserId = result.lineUserId;

    if (lineUserId) {
      // 發送 LINE 通知（在開發環境會自動 mock）
      lineNotificationSent = await sendAppointmentCancellation(lineUserId);
    }

    // 記錄操作日誌（在 transaction 外執行）
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'CANCEL_APPOINTMENT',
        targetType: 'appointment',
        targetId: id,
        details: {
          previousStatus: result.previousStatus,
          newStatus: 'cancelled',
          lineUserId: lineUserId || null,
          lineNotificationSent,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.appointment.id,
        status: result.appointment.status,
        lineNotificationSent,
        message: '預約已取消',
      },
    });

  } catch (error) {
    console.error('[DELETE /api/admin/appointments/:id]', error);

    const errorMessage = error instanceof Error ? error.message : 'E001';

    if (errorMessage === 'E007') {
      return NextResponse.json({
        success: false,
        error: { code: 'E007', message: ERROR_CODES.E007 },
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取消預約失敗' },
    }, { status: 500 });
  }
}
