/**
 * Settings 合併 API
 * 一次返回所有 Settings 需要的資料
 *
 * GET /api/admin/settings
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { type ApiResponse } from '@/types';

export async function GET(): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    // 並行查詢所有資料
    const [doctors, treatmentTypes, accounts] = await Promise.all([
      // 1. 醫師列表
      prisma.doctor.findMany({
        select: { id: true, name: true, isActive: true },
        orderBy: { name: 'asc' },
      }),

      // 2. 診療項目列表
      prisma.treatmentType.findMany({
        select: { id: true, name: true, durationMinutes: true, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),

      // 3. 管理員帳號列表（僅超級管理員可見）
      user.role === 'super_admin'
        ? prisma.adminUser.findMany({
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
            orderBy: { createdAt: 'asc' },
          })
        : [],
    ]);

    return NextResponse.json({
      success: true,
      data: {
        doctors,
        treatmentTypes,
        accounts,
      },
    });

  } catch (error) {
    console.error('[GET /api/admin/settings]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得設定資料失敗' },
    }, { status: 500 });
  }
}
