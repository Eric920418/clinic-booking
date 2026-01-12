/**
 * 管理員登出 API
 * 
 * POST /api/admin/auth/logout
 */
import { NextResponse } from 'next/server';
import { clearAuthCookie, getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { type ApiResponse } from '@/types';

export async function POST(): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    
    if (user) {
      // 記錄操作日誌
      await prisma.operationLog.create({
        data: {
          adminUserId: user.userId,
          action: 'LOGOUT',
          targetType: 'admin_user',
          targetId: user.userId,
        },
      });
    }

    await clearAuthCookie();

    return NextResponse.json({
      success: true,
      data: { message: '已登出' },
    });

  } catch (error) {
    console.error('[POST /api/admin/auth/logout]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '登出失敗' },
    }, { status: 500 });
  }
}

