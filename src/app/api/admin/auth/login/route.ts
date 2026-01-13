/**
 * 管理員登入 API
 * 對應規格：spec/features/管理員登入.feature
 * 
 * POST /api/admin/auth/login
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/admin';
import { ERROR_CODES, type ApiResponse } from '@/types';
import { addMinutes, isBefore } from 'date-fns';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 });
    }

    const { email, password } = parsed.data;

    // 查詢管理員帳號
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '帳號或密碼錯誤' },
      }, { status: 401 });
    }

    // 規則：帳號必須為啟用狀態
    // 對應規格：spec/features/管理員登入.feature - 帳號狀態必須為啟用
    if (!admin.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'E005', message: ERROR_CODES.E005 },
      }, { status: 403 });
    }

    // 規則：登入失敗 5 次鎖定 15 分鐘
    // 對應規格：spec/features/管理員登入.feature - 登入失敗 5 次需等待 15 分鐘
    if (admin.lockedUntil && isBefore(new Date(), admin.lockedUntil)) {
      const remainingMinutes = Math.ceil(
        (admin.lockedUntil.getTime() - Date.now()) / 1000 / 60
      );
      return NextResponse.json({
        success: false,
        error: { 
          code: 'E006', 
          message: `${ERROR_CODES.E006}，請等待 ${remainingMinutes} 分鐘後再試`,
        },
      }, { status: 403 });
    }

    // 驗證密碼
    const isValid = await verifyPassword(password, admin.passwordHash);

    if (!isValid) {
      // 規則：累計登入失敗次數
      const newFailedCount = admin.failedLoginCount + 1;
      const updateData: {
        failedLoginCount: number;
        lockedUntil?: Date;
      } = {
        failedLoginCount: newFailedCount,
      };

      // 規則：失敗 5 次則鎖定 15 分鐘
      if (newFailedCount >= 5) {
        updateData.lockedUntil = addMinutes(new Date(), 15);
      }

      await prisma.adminUser.update({
        where: { id: admin.id },
        data: updateData,
      });

      const remainingAttempts = 5 - newFailedCount;
      return NextResponse.json({
        success: false,
        error: { 
          code: 'E001', 
          message: remainingAttempts > 0 
            ? `帳號或密碼錯誤，剩餘 ${remainingAttempts} 次嘗試機會`
            : ERROR_CODES.E006,
        },
      }, { status: 401 });
    }

    // 規則：登入成功時重置登入失敗次數
    // 對應規格：spec/features/管理員登入.feature - 登入成功時重置登入失敗次數
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // 建立 JWT Token
    const token = await createToken({
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    // 設定認證 Cookie
    await setAuthCookie(token);

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: admin.id,
        action: 'LOGIN',
        targetType: 'admin_user',
        targetId: admin.id,
        details: { ip: request.headers.get('x-forwarded-for') || 'unknown' },
      },
    });

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
    console.error('[POST /api/admin/auth/login]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '登入失敗' },
    }, { status: 500 });
  }
}

