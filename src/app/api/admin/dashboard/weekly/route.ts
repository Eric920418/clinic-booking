/**
 * Dashboard 週統計 API
 * 對應規格：第 4.2.5 節 每週預約流量總覽
 * 
 * GET /api/admin/dashboard/weekly
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { type ApiResponse } from '@/types';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

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
    const weekAgo = subDays(today, 6);

    // 過去 7 天預約趨勢
    const appointments = await prisma.appointment.findMany({
      where: {
        createdAt: {
          gte: startOfDay(weekAgo),
          lte: endOfDay(today),
        },
      },
      select: {
        createdAt: true,
      },
    });

    // 按日期分組統計
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(today, 6 - i), 'yyyy-MM-dd');
      dailyCounts[date] = 0;
    }

    appointments.forEach((appt) => {
      const date = format(appt.createdAt, 'yyyy-MM-dd');
      if (dailyCounts[date] !== undefined) {
        dailyCounts[date]++;
      }
    });

    const weeklyStats = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
    }));

    return NextResponse.json({
      success: true,
      data: weeklyStats,
    });

  } catch (error) {
    console.error('[GET /api/admin/dashboard/weekly]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得週統計失敗' },
    }, { status: 500 });
  }
}

