// src/app/api/admin/patients/route.ts
// Feature: 管理病患資料
// API: 取得所有患者列表

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'

// =============================================
// GET: 取得所有患者列表
// =============================================
const querySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 50,
    })

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { search, page, limit } = parsed.data
    const skip = (page - 1) * limit

    // 建立搜尋條件
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        { nationalId: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}

    // 查詢患者列表和總數
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          nationalId: true,
          birthDate: true,
          notes: true,
          noShowCount: true,
          isBlacklisted: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { appointments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patient.count({ where }),
    ])

    // 格式化資料
    const items = patients.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      nationalId: p.nationalId,
      birthDate: p.birthDate.toISOString().split('T')[0],
      notes: p.notes,
      noShowCount: p.noShowCount,
      isBlacklisted: p.isBlacklisted,
      appointmentCount: p._count.appointments,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })

  } catch (error) {
    console.error('[GET /api/admin/patients]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得患者列表失敗' },
    }, { status: 500 })
  }
}
