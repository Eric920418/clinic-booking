/**
 * 病患資料處理 API
 * Feature: 病患資料處理.feature
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { patientProfileSchema, patientProfileQuerySchema } from '@/lib/validations/patient-profile'
import { ZodError } from 'zod'
import type { Patient } from '@prisma/client'

// ============================================
// Response Types
// ============================================

interface PatientProfileResponse {
  id: string
  lineUserId: string | null
  name: string
  phone: string
  nationalId: string
  birthDate: string
}

interface ApiSuccessResponse<T> {
  success: true
  data: T
}

interface ApiErrorResponse {
  success: false
  error: string
  message: string
  details?: Array<{ field: string; message: string }>
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================
// Helper Functions
// ============================================

/**
 * 將 Patient entity 轉換為 API response 格式
 */
function toPatientProfileResponse(patient: Patient): PatientProfileResponse {
  return {
    id: patient.id,
    lineUserId: patient.lineUserId,
    name: patient.name,
    phone: patient.phone,
    nationalId: patient.nationalId,
    birthDate: patient.birthDate.toISOString().split('T')[0],
  }
}

/**
 * 處理 Zod 驗證錯誤
 */
function handleZodError(error: ZodError): NextResponse<ApiErrorResponse> {
  const issues = error.issues || []
  return NextResponse.json(
    {
      success: false as const,
      error: '驗證失敗',
      message: issues[0]?.message || '輸入資料格式錯誤',
      details: issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    },
    { status: 400 }
  )
}

// ============================================
// API Route Handlers
// ============================================

/**
 * GET /api/patient/profile
 * 病患進入個人資料頁面（取得歷史資料）
 *
 * Query Parameters:
 * - lineUserId: LINE User ID (required)
 * - nationalId: 身分證字號 (optional)
 *
 * Response:
 * - 200: 找到病患資料
 * - 400: 驗證失敗
 * - 404: 無歷史資料
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PatientProfileResponse>>> {
  try {
    const searchParams = request.nextUrl.searchParams
    const lineUserId = searchParams.get('lineUserId')
    const nationalId = searchParams.get('nationalId')

    // 驗證必填參數
    const validated = patientProfileQuerySchema.parse({ lineUserId, nationalId })

    // 查詢病患資料
    const patient = await prisma.patient.findFirst({
      where: {
        lineUserId: validated.lineUserId,
        ...(validated.nationalId ? { nationalId: validated.nationalId } : {}),
      },
    })

    if (!patient) {
      return NextResponse.json(
        {
          success: false as const,
          error: '無歷史資料',
          message: '找不到該病患資料',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true as const,
      data: toPatientProfileResponse(patient),
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error)
    }

    console.error('GET /api/patient/profile error:', error)
    return NextResponse.json(
      {
        success: false as const,
        error: '伺服器錯誤',
        message: '處理請求時發生錯誤',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/patient/profile
 * 病患提交個人資料
 *
 * Request Body:
 * - lineUserId: LINE User ID
 * - name: 姓名（2-20 字元）
 * - phone: 電話（台灣手機格式 09xxxxxxxx）
 * - nationalId: 身分證字號（台灣身分證格式）
 * - birthDate: 出生年月日（不可為未來日期）
 *
 * Response:
 * - 200: 更新既有病患資料
 * - 201: 建立新病患記錄
 * - 400: 驗證失敗
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<PatientProfileResponse>>> {
  try {
    const body = await request.json()

    // 使用 Zod 驗證輸入
    const validated = patientProfileSchema.parse(body)

    // 檢查是否已存在該身分證字號的病患
    const existingPatient = await prisma.patient.findUnique({
      where: { nationalId: validated.nationalId },
    })

    if (existingPatient) {
      // 更新既有病患資料
      const updatedPatient = await prisma.patient.update({
        where: { id: existingPatient.id },
        data: {
          lineUserId: validated.lineUserId,
          name: validated.name,
          phone: validated.phone,
          birthDate: new Date(validated.birthDate),
        },
      })

      return NextResponse.json({
        success: true as const,
        data: toPatientProfileResponse(updatedPatient),
      })
    }

    // 建立新病患記錄
    const newPatient = await prisma.patient.create({
      data: {
        lineUserId: validated.lineUserId,
        name: validated.name,
        phone: validated.phone,
        nationalId: validated.nationalId,
        birthDate: new Date(validated.birthDate),
      },
    })

    return NextResponse.json(
      {
        success: true as const,
        data: toPatientProfileResponse(newPatient),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error)
    }

    // 處理其他類型的錯誤
    if (error instanceof Error) {
      console.error('POST /api/patient/profile error:', error.message)
      return NextResponse.json(
        {
          success: false as const,
          error: '驗證失敗',
          message: error.message,
        },
        { status: 400 }
      )
    }

    console.error('POST /api/patient/profile error:', error)
    return NextResponse.json(
      {
        success: false as const,
        error: '伺服器錯誤',
        message: '處理請求時發生錯誤',
      },
      { status: 500 }
    )
  }
}
