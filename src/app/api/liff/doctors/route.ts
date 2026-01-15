/**
 * 取得醫師列表 API
 * 對應規格：spec/features/病患建立預約.feature
 * 
 * GET /api/liff/doctors
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type ApiResponse } from '@/types';
import { startOfDay } from 'date-fns';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const treatmentTypeId = searchParams.get('treatmentTypeId');

    // 規則：僅顯示該日有值班的醫師
    // 規則：顯示醫師姓名與專長項目
    // 規則：依診療項目篩選可看診醫師
    // 對應規格：第 3.3.2 節 選擇醫師

    const whereClause: Record<string, unknown> = {
      isActive: true,
    };

    // 如果指定日期，篩選當日有值班的醫師
    if (dateStr) {
      const date = startOfDay(new Date(dateStr));
      whereClause.schedules = {
        some: {
          date,
          isAvailable: true,
          timeSlots: {
            some: {
              remainingMinutes: { gt: 0 },
            },
          },
        },
      };
    }

    // 如果指定診療類型，篩選可看診的醫師
    if (treatmentTypeId) {
      whereClause.doctorTreatments = {
        some: {
          treatmentTypeId,
        },
      };
    }

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        doctorTreatments: {
          include: {
            treatmentType: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const response = NextResponse.json({
      success: true,
      data: doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        isActive: doctor.isActive,
        treatmentTypes: doctor.doctorTreatments.map((dt) => dt.treatmentType),
      })),
    });

    // 緩存 60 秒，stale-while-revalidate 120 秒
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;

  } catch (error) {
    console.error('[GET /api/liff/doctors]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得醫師列表失敗' },
    }, { status: 500 });
  }
}

