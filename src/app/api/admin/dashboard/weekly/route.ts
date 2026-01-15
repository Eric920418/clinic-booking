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

    // 使用 SQL GROUP BY 直接在數據庫層分組，避免傳輸大量數據到應用層
    const dbResults = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "Appointment"
      WHERE "createdAt" >= ${startOfDay(weekAgo)} AND "createdAt" <= ${endOfDay(today)}
      GROUP BY DATE("createdAt")
      ORDER BY date
    `;

    // 建立日期對應表（確保即使某天沒有預約也會顯示 0）
    const dailyCounts: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(today, 6 - i), 'yyyy-MM-dd');
      dailyCounts[date] = 0;
    }

    // 填入數據庫查詢結果
    dbResults.forEach((row) => {
      const date = format(row.date, 'yyyy-MM-dd');
      if (dailyCounts[date] !== undefined) {
        dailyCounts[date] = Number(row.count);
      }
    });

    const weeklyStats = Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
    }));

    const response = NextResponse.json({
      success: true,
      data: weeklyStats,
    });

    // 緩存 30 秒，週統計數據不需要即時更新
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60');
    return response;

  } catch (error) {
    console.error('[GET /api/admin/dashboard/weekly]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得週統計失敗' },
    }, { status: 500 });
  }
}

