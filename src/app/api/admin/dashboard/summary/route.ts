/**
 * Dashboard 今日摘要 API
 * 對應規格：第 4.2 節 Dashboard
 * 
 * GET /api/admin/dashboard/summary
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { type ApiResponse } from '@/types';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // 4.2.1 今日總預約（含各狀態）
    const todayAppointments = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        appointmentDate: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      _count: true,
    });

    const statusCounts = todayAppointments.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    const todayTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

    // 4.2.2 今日已取消總覽
    const todayCancelled = statusCounts['cancelled'] || 0;

    // 4.2.3 醫師值班總覽
    const doctorsOnDuty = await prisma.schedule.count({
      where: {
        date: todayStart,
        isAvailable: true,
        doctor: { isActive: true },
      },
    });

    // 4.2.4 剩餘可預約時段
    const availableSlots = await prisma.timeSlot.count({
      where: {
        remainingMinutes: { gt: 0 },
        schedule: {
          date: todayStart,
          isAvailable: true,
          doctor: { isActive: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        todayTotal,
        todayBooked: statusCounts['booked'] || 0,
        todayCheckedIn: statusCounts['checked_in'] || 0,
        todayCompleted: statusCounts['completed'] || 0,
        todayNoShow: statusCounts['no_show'] || 0,
        todayCancelled,
        doctorsOnDuty,
        availableSlots,
      },
    });

  } catch (error) {
    console.error('[GET /api/admin/dashboard/summary]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得摘要失敗' },
    }, { status: 500 });
  }
}

