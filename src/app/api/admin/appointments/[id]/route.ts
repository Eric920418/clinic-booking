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
  timeSlotId: z.string().uuid().optional(),
  treatmentTypeId: z.string().uuid().optional(),
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

    const { timeSlotId: newTimeSlotId, treatmentTypeId: newTreatmentTypeId } = parsed.data;

    // 如果沒有任何要更新的欄位，直接返回
    if (!newTimeSlotId && !newTreatmentTypeId) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '沒有要更新的欄位' },
      }, { status: 400 });
    }

    // 使用交易處理，確保資料一致性
    const result = await prisma.$transaction(async (tx) => {
      // 查詢原預約（包含原時段和原診療類型）
      const originalAppointment = await tx.appointment.findUnique({
        where: { id },
        include: {
          timeSlot: true,
          treatmentType: true,
        },
      });

      if (!originalAppointment) {
        throw new Error('E007'); // 無此預約
      }

      // 決定最終的時段和診療類型
      const finalTimeSlotId = newTimeSlotId || originalAppointment.timeSlotId;
      const finalTreatmentTypeId = newTreatmentTypeId || originalAppointment.treatmentTypeId;

      // 取得最終的診療類型（用於計算分鐘數）
      const finalTreatmentType = newTreatmentTypeId
        ? await tx.treatmentType.findUnique({ where: { id: newTreatmentTypeId } })
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

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '修改預約失敗' },
    }, { status: 500 });
  }
}

// =============================================
// DELETE: 取消預約
// 對應規格：spec/features/管理員取消預約.feature
// =============================================
export async function DELETE(
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

  // TODO: 實作取消預約
  return NextResponse.json({
    success: false,
    error: { code: 'E001', message: 'Not implemented' },
  }, { status: 501 });
}
