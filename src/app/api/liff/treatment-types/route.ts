/**
 * 取得診療類型 API
 * 對應規格：spec/features/病患建立預約.feature
 * 
 * GET /api/liff/treatment-types
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const doctorId = searchParams.get('doctorId');

    // 規則：項目清單依醫師可看診項目動態顯示
    // 對應規格：第 3.3.4 節 選擇診療類型
    let treatmentTypes;

    if (doctorId) {
      // 取得指定醫師可看診的項目
      const doctorTreatments = await prisma.doctorTreatment.findMany({
        where: {
          doctorId,
          treatmentType: {
            isActive: true,
          },
        },
        include: {
          treatmentType: true,
        },
        orderBy: {
          treatmentType: {
            sortOrder: 'asc',
          },
        },
      });

      treatmentTypes = doctorTreatments.map((dt) => dt.treatmentType);
    } else {
      // 取得所有啟用的診療類型
      treatmentTypes = await prisma.treatmentType.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    const response = NextResponse.json({
      success: true,
      data: treatmentTypes.map((tt) => ({
        id: tt.id,
        name: tt.name,
        durationMinutes: tt.durationMinutes,
      })),
    });

    // 緩存 60 秒，stale-while-revalidate 120 秒
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response;

  } catch (error) {
    console.error('[GET /api/liff/treatment-types]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得診療類型失敗' },
    }, { status: 500 });
  }
}

