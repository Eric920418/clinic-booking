/**
 * 發送驗證碼 API
 * 對應規格：spec/features/真人驗證.feature
 * 
 * POST /api/liff/verify/send
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { generateVerificationCode } from '@/lib/utils';
import { sendVerificationCode } from '@/lib/line';
import { ERROR_CODES, type ApiResponse } from '@/types';
import { addMinutes, differenceInSeconds } from 'date-fns';

const requestSchema = z.object({
  lineUserId: z.string().min(1, 'LINE User ID 必填'),
});

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 });
    }

    const { lineUserId } = parsed.data;

    // 規則：檢查用戶是否在黑名單中
    // 對應規格：spec/features/LINE入口驗證.feature - 黑名單病患無法進入系統
    const patient = await prisma.patient.findUnique({
      where: { lineUserId },
    });

    if (patient?.isBlacklisted) {
      return NextResponse.json({
        success: false,
        error: { 
          code: 'E009', 
          message: ERROR_CODES.E009,
        },
      }, { status: 403 });
    }

    // 規則：重新發送限制 60 秒內 1 次
    // 對應規格：spec/features/真人驗證.feature - 60 秒內僅能發送一次驗證碼
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        lineUserId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentCode) {
      const secondsSinceCreated = differenceInSeconds(new Date(), recentCode.createdAt);
      if (secondsSinceCreated < 60) {
        return NextResponse.json({
          success: false,
          error: { 
            code: 'E002', 
            message: `請等待 ${60 - secondsSinceCreated} 秒後再重新發送`,
          },
        }, { status: 429 });
      }
    }

    // 規則：產生 6 位數驗證碼
    // 對應規格：驗證碼長度 6 位數字
    const code = generateVerificationCode();

    // 規則：驗證碼有效期 5 分鐘
    // 對應規格：spec/features/真人驗證.feature - 驗證碼有效期 5 分鐘
    const expiresAt = addMinutes(new Date(), 5);

    // 建立驗證碼記錄
    await prisma.verificationCode.create({
      data: {
        lineUserId,
        code,
        expiresAt,
        attempts: 0,
      },
    });

    // 透過 LINE Messaging API 發送驗證碼
    await sendVerificationCode(lineUserId, code);

    return NextResponse.json({
      success: true,
      data: {
        message: '驗證碼已發送',
        expiresAt: expiresAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('[POST /api/liff/verify/send]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '發送驗證碼失敗' },
    }, { status: 500 });
  }
}

