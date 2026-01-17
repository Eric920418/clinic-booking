/**
 * Dashboard 合併 API
 * 一次返回所有 Dashboard 需要的資料
 *
 * GET /api/admin/dashboard?doctorId=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { type ApiResponse } from '@/types';
import { startOfDay, endOfDay, format, addHours } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedDoctorId = searchParams.get('doctorId');

    // 使用台灣時區計算今日日期
    const taiwanTz = 'Asia/Taipei';
    const nowInTaiwan = toZonedTime(new Date(), taiwanTz);
    const todayStart = startOfDay(nowInTaiwan);
    const todayEnd = endOfDay(nowInTaiwan);

    // 先查詢醫師列表（需要用來決定預設醫師）
    const doctors = await prisma.doctor.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // 如果沒有指定醫師，自動使用第一個醫師（消除前端瀑布式請求）
    const doctorId = requestedDoctorId || (doctors.length > 0 ? doctors[0].id : null);

    // 並行查詢其他資料
    const [
      todayAppointmentsGrouped,
      todayAppointments,
    ] = await Promise.all([
      // 1. 今日統計（按狀態分組）
      prisma.appointment.groupBy({
        by: ['status'],
        where: {
          appointmentDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        _count: true,
      }),

      // 2. 今日預約列表（使用 select 而非 include 減少數據傳輸）
      prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          ...(doctorId ? { doctorId } : {}),
        },
        select: {
          id: true,
          doctorId: true,
          treatmentTypeId: true,
          appointmentDate: true,
          status: true,
          patient: {
            select: {
              name: true,
              phone: true,
              nationalId: true,
              birthDate: true,
              notes: true,
            },
          },
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
        orderBy: [
          { timeSlot: { startTime: 'asc' } },
          { createdAt: 'asc' },
        ],
      }),
    ]);

    // 計算統計數據
    const statusCounts = todayAppointmentsGrouped.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // 格式化預約列表
    const appointments = todayAppointments.map((apt) => ({
      id: apt.id,
      patientName: apt.patient.name,
      patientPhone: apt.patient.phone,
      patientNationalId: apt.patient.nationalId,
      patientBirthDate: apt.patient.birthDate ? format(apt.patient.birthDate, 'yyyy-MM-dd') : '',
      patientNotes: apt.patient.notes || '',
      doctor: apt.doctor.name,
      doctorId: apt.doctorId,
      treatmentType: apt.treatmentType.name,
      treatmentTypeId: apt.treatmentTypeId,
      appointmentDate: format(apt.appointmentDate, 'yyyy-MM-dd'),
      startTime: apt.timeSlot.startTime ? format(addHours(apt.timeSlot.startTime, 8), 'HH:mm') : '',
      endTime: apt.timeSlot.endTime ? format(addHours(apt.timeSlot.endTime, 8), 'HH:mm') : '',
      status: apt.status,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        summary: {
          todayBooked: statusCounts['booked'] || 0,
          todayCheckedIn: statusCounts['checked_in'] || 0,
          todayCompleted: statusCounts['completed'] || 0,
          todayNoShow: statusCounts['no_show'] || 0,
          todayCancelled: statusCounts['cancelled'] || 0,
        },
        doctors,
        appointments,
        selectedDoctorId: doctorId, // 返回實際使用的醫師 ID，讓前端同步
      },
    });

    // 短期緩存 15 秒，stale-while-revalidate 30 秒
    response.headers.set('Cache-Control', 'private, s-maxage=15, stale-while-revalidate=30');
    return response;

  } catch (error) {
    console.error('[GET /api/admin/dashboard]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得 Dashboard 資料失敗' },
    }, { status: 500 });
  }
}
