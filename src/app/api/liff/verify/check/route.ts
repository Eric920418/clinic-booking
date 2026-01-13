/**
 * 驗證碼校驗 API
 * 對應規格：spec/features/真人驗證.feature
 * 
 * POST /api/liff/verify/check
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { ERROR_CODES, type ApiResponse } from '@/types';

const requestSchema = z.object({
  lineUserId: z.string().min(1, 'LINE User ID 必填'),
  code: z.string().length(6, '驗證碼必須為 6 位數字'),
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

    const { lineUserId, code } = parsed.data;

    // 取得最新的有效驗證碼
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        lineUserId,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationCode) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: ERROR_CODES.E001 },
      }, { status: 400 });
    }

    // 規則：驗證碼過期檢查（5 分鐘）
    // 對應規格：spec/features/真人驗證.feature - 驗證碼過期後驗證失敗
    if (new Date() > verificationCode.expiresAt) {
      return NextResponse.json({
        success: false,
        error: { code: 'E002', message: ERROR_CODES.E002 },
      }, { status: 400 });
    }

    // 規則：驗證錯誤達 5 次後該驗證碼失效
    // 對應規格：spec/features/真人驗證.feature - 錯誤上限 5 次
    if (verificationCode.attempts >= 5) {
      return NextResponse.json({
        success: false,
        error: { code: 'E010', message: ERROR_CODES.E010 },
      }, { status: 400 });
    }

    // 驗證碼比對
    if (verificationCode.code !== code) {
      // 增加嘗試次數
      await prisma.verificationCode.update({
        where: { id: verificationCode.id },
        data: { attempts: { increment: 1 } },
      });

      const remainingAttempts = 5 - verificationCode.attempts - 1;
      return NextResponse.json({
        success: false,
        error: { 
          code: 'E001', 
          message: `${ERROR_CODES.E001}，剩餘 ${remainingAttempts} 次嘗試機會`,
        },
      }, { status: 400 });
    }

    // 驗證成功，標記為已使用
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });

    // 檢查是否為新病患
    const patient = await prisma.patient.findUnique({
      where: { lineUserId },
    });

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        isNewPatient: !patient,
        patient: patient ? {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          nationalId: patient.nationalId,
          birthDate: patient.birthDate,
        } : null,
      },
    });

  } catch (error) {
    console.error('[POST /api/liff/verify/check]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '驗證失敗' },
    }, { status: 500 });
  }
}

