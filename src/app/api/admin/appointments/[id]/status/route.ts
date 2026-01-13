/**
 * 更新預約狀態 API
 * 對應規格：spec/features/管理員更新預約狀態.feature
 * 
 * PUT /api/admin/appointments/:id/status
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ERROR_CODES, type ApiResponse } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateStatusSchema = z.object({
  status: z.enum(['booked', 'checked_in', 'completed', 'no_show', 'cancelled']),
  cancelledReason: z.string().optional(),
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
    const parsed = updateStatusSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 });
    }

    const { status, cancelledReason } = parsed.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        treatmentType: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({
        success: false,
        error: { code: 'E007', message: ERROR_CODES.E007 },
      }, { status: 404 });
    }

    // 規則：已完成和已取消狀態不可變更
    // 對應規格：spec/features/管理員更新預約狀態.feature
    if (appointment.status === 'completed') {
      return NextResponse.json({
        success: false,
        error: { code: 'E008', message: '已完成的預約不可變更狀態' },
      }, { status: 400 });
    }

    if (appointment.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        error: { code: 'E008', message: '已取消的預約不可變更狀態' },
      }, { status: 400 });
    }

    // 規則：未報到狀態可由管理員改為已報到（補報到）
    // 對應規格：spec/features/管理員更新預約狀態.feature - 未報到狀態可由管理員改為已報到
    // 允許的狀態轉換已在此處理

    const updateData: {
      status: typeof status;
      cancelledReason?: string;
      cancelledBy?: string;
    } = { status };

    // 如果是取消，需要釋放時段並記錄原因
    if (status === 'cancelled') {
      updateData.cancelledReason = cancelledReason || '管理員取消';
      updateData.cancelledBy = user.userId;

      // 釋放時段分鐘數（僅從 booked 或 checked_in 狀態取消時）
      if (appointment.status === 'booked' || appointment.status === 'checked_in') {
        await prisma.timeSlot.update({
          where: { id: appointment.timeSlotId },
          data: {
            remainingMinutes: {
              increment: appointment.treatmentType.durationMinutes,
            },
          },
        });
      }
    }

    // 規則：未報到時累計 no_show_count
    // 對應規格：spec/features/預約狀態自動更新.feature
    if (status === 'no_show' && appointment.status !== 'no_show') {
      // 規則：未報到次數達到 3 次後停止累計
      if (appointment.patient.noShowCount < 3) {
        await prisma.patient.update({
          where: { id: appointment.patientId },
          data: {
            noShowCount: { increment: 1 },
          },
        });
      }
    }

    // 更新預約狀態
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
    });

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'UPDATE_APPOINTMENT_STATUS',
        targetType: 'appointment',
        targetId: id,
        details: {
          previousStatus: appointment.status,
          newStatus: status,
          cancelledReason,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        message: '狀態更新成功',
      },
    });

  } catch (error) {
    console.error('[PUT /api/admin/appointments/:id/status]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新狀態失敗' },
    }, { status: 500 });
  }
}

