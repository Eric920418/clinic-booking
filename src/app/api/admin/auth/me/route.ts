/**
 * 取得當前用戶 API
 * 
 * GET /api/admin/auth/me
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
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

    // 從資料庫取得最新資料
    const admin = await prisma.adminUser.findUnique({
      where: { id: user.userId },
    });

    if (!admin || !admin.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'E005', message: '帳號已被停用' },
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        language: admin.language,
        timezone: admin.timezone,
      },
    });

  } catch (error) {
    console.error('[GET /api/admin/auth/me]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得用戶資料失敗' },
    }, { status: 500 });
  }
}

