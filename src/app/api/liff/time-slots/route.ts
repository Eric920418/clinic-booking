/**
 * 取得時段列表 API
 * 對應規格：spec/features/病患建立預約.feature
 * 
 * GET /api/liff/time-slots
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type ApiResponse } from '@/types';
import { startOfDay, format, addHours } from 'date-fns';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const doctorId = searchParams.get('doctorId');

    if (!dateStr || !doctorId) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '日期與醫師 ID 必填' },
      }, { status: 400 });
    }

    const date = startOfDay(new Date(dateStr));

    // 規則：顯示該醫師該日的所有時段
    // 規則：標示各時段剩餘可預約分鐘數
    // 對應規格：第 3.3.3 節 選擇時段
    const schedule = await prisma.schedule.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date,
        },
      },
      include: {
        timeSlots: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!schedule || !schedule.isAvailable) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    return NextResponse.json({
      success: true,
      data: schedule.timeSlots.map((slot) => ({
        id: slot.id,
        startTime: format(addHours(slot.startTime, 8), 'HH:mm'),
        endTime: format(addHours(slot.endTime, 8), 'HH:mm'),
        totalMinutes: slot.totalMinutes,
        remainingMinutes: slot.remainingMinutes,
        // 規則：剩餘分鐘數不足時，該時段不可選
        isAvailable: slot.remainingMinutes > 0,
      })),
    });

  } catch (error) {
    console.error('[GET /api/liff/time-slots]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得時段列表失敗' },
    }, { status: 500 });
  }
}

