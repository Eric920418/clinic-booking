/**
 * 取得可預約日期 API
 * 對應規格：spec/features/病患建立預約.feature
 * 
 * GET /api/liff/available-dates
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type ApiResponse } from '@/types';
import { addDays, format, startOfDay } from 'date-fns';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const doctorId = searchParams.get('doctorId');

    // 規則：不可選擇過去日期
    // 規則：不可選擇超過 30 天後的日期
    // 對應規格：spec/features/病患建立預約.feature
    const today = startOfDay(new Date());
    const maxDate = addDays(today, 30);

    // 查詢可預約的班表
    const schedules = await prisma.schedule.findMany({
      where: {
        date: {
          gte: today,
          lte: maxDate,
        },
        isAvailable: true,
        doctor: {
          isActive: true,
          ...(doctorId ? { id: doctorId } : {}),
        },
      },
      include: {
        doctor: true,
        timeSlots: {
          where: {
            remainingMinutes: { gt: 0 }, // 至少有剩餘分鐘數
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // 過濾出有可用時段的日期
    const availableDates = schedules
      .filter((schedule) => schedule.timeSlots.length > 0)
      .reduce((acc, schedule) => {
        const dateStr = format(schedule.date, 'yyyy-MM-dd');
        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: dateStr,
            doctors: [],
          };
        }
        acc[dateStr].doctors.push({
          id: schedule.doctor.id,
          name: schedule.doctor.name,
        });
        return acc;
      }, {} as Record<string, { date: string; doctors: { id: string; name: string }[] }>);

    return NextResponse.json({
      success: true,
      data: {
        dates: Object.values(availableDates),
        minDate: format(today, 'yyyy-MM-dd'),
        maxDate: format(maxDate, 'yyyy-MM-dd'),
      },
    });

  } catch (error) {
    console.error('[GET /api/liff/available-dates]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得可預約日期失敗' },
    }, { status: 500 });
  }
}

