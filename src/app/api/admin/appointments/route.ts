/**
 * 管理後台預約管理 API
 * 對應規格：第 4.3 節 預約管理
 * 
 * GET /api/admin/appointments - 取得預約列表
 * POST /api/admin/appointments - 手動建立預約
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ERROR_CODES, type ApiResponse } from '@/types';
import { sendAppointmentConfirmation } from '@/lib/line';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Prisma } from '@prisma/client';

// =============================================
// GET: 取得預約列表
// 對應規格：第 4.3.1 節 查看所有預約
// =============================================
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const doctorId = searchParams.get('doctorId');
    const treatmentTypeId = searchParams.get('treatmentTypeId');
    const status = searchParams.get('status');

    // 建立查詢條件
    const where: Prisma.AppointmentWhereInput = {};

    // 篩選：日期範圍
    if (dateFrom || dateTo) {
      where.appointmentDate = {};
      if (dateFrom) {
        where.appointmentDate.gte = startOfDay(parseISO(dateFrom));
      }
      if (dateTo) {
        where.appointmentDate.lte = endOfDay(parseISO(dateTo));
      }
    }

    // 篩選：醫師
    if (doctorId) {
      where.doctorId = doctorId;
    }

    // 篩選：診療類型
    if (treatmentTypeId) {
      where.treatmentTypeId = treatmentTypeId;
    }

    // 篩選：狀態
    if (status) {
      where.status = status as Prisma.EnumAppointmentStatusFilter;
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: true,
          doctor: true,
          treatmentType: true,
          timeSlot: true,
        },
        orderBy: { appointmentDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: appointments.map((appt) => ({
          id: appt.id,
          patientName: appt.patient.name,
          patientPhone: appt.patient.phone,
          appointmentDate: format(appt.appointmentDate, 'yyyy-MM-dd'),
          startTime: format(appt.timeSlot.startTime, 'HH:mm'),
          endTime: format(appt.timeSlot.endTime, 'HH:mm'),
          doctor: appt.doctor.name,
          treatmentType: appt.treatmentType.name,
          status: appt.status,
          createdAt: appt.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    console.error('[GET /api/admin/appointments]', error);
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得預約列表失敗' },
    }, { status: 500 });
  }
}

// =============================================
// POST: 手動建立預約
// 對應規格：第 4.3.4 節 手動新增預約
// =============================================
const createAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(),
  patientData: z.object({
    name: z.string().min(2).max(20),
    phone: z.string().regex(/^09\d{8}$/),
    nationalId: z.string(),
    birthDate: z.string(),
  }).optional(),
  doctorId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  treatmentTypeId: z.string().uuid(),
  appointmentDate: z.string(),
});

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createAppointmentSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 });
    }

    const { patientId, patientData, doctorId, timeSlotId, treatmentTypeId, appointmentDate } = parsed.data;
    const appointmentDateObj = startOfDay(new Date(appointmentDate));

    // 取得或建立病患
    let patient;
    if (patientId) {
      patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });
    } else if (patientData) {
      // 檢查是否已存在
      patient = await prisma.patient.findUnique({
        where: { nationalId: patientData.nationalId },
      });
      
      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            name: patientData.name,
            phone: patientData.phone,
            nationalId: patientData.nationalId,
            birthDate: new Date(patientData.birthDate),
          },
        });
      }
    }

    if (!patient) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '請提供病患資料' },
      }, { status: 400 });
    }

    // 規則：黑名單病患無法建立預約
    if (patient.isBlacklisted) {
      return NextResponse.json({
        success: false,
        error: { code: 'E009', message: ERROR_CODES.E009 },
      }, { status: 403 });
    }

    // 取得診療類型
    const treatmentType = await prisma.treatmentType.findUnique({
      where: { id: treatmentTypeId },
    });

    if (!treatmentType || !treatmentType.isActive) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '診療類型不存在或已停用' },
      }, { status: 400 });
    }

    // 使用交易處理
    const appointment = await prisma.$transaction(async (tx) => {
      // 鎖定時段
      const timeSlots = await tx.$queryRaw<Array<{
        id: string;
        remaining_minutes: number;
      }>>`
        SELECT id, remaining_minutes 
        FROM time_slots 
        WHERE id = ${timeSlotId}::uuid 
        FOR UPDATE
      `;

      if (timeSlots.length === 0 || timeSlots[0].remaining_minutes < treatmentType.durationMinutes) {
        throw new Error('E003');
      }

      // 檢查當日是否已有預約
      const existingAppointment = await tx.appointment.findFirst({
        where: {
          patientId: patient.id,
          appointmentDate: appointmentDateObj,
          status: { notIn: ['cancelled', 'no_show', 'completed'] },
        },
      });

      if (existingAppointment) {
        throw new Error('E004');
      }

      // 扣除時段分鐘數
      await tx.timeSlot.update({
        where: { id: timeSlotId },
        data: { remainingMinutes: { decrement: treatmentType.durationMinutes } },
      });

      // 建立預約
      return tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId,
          treatmentTypeId,
          timeSlotId,
          appointmentDate: appointmentDateObj,
          status: 'booked',
        },
        include: {
          patient: true,
          doctor: true,
          treatmentType: true,
          timeSlot: true,
        },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'CREATE_APPOINTMENT',
        targetType: 'appointment',
        targetId: appointment.id,
        details: { patientId: patient.id, doctorId, appointmentDate },
      },
    });

    // 發送通知（若有 LINE 綁定）
    if (appointment.patient.lineUserId) {
      await sendAppointmentConfirmation(
        appointment.patient.lineUserId,
        format(appointment.appointmentDate, 'yyyy-MM-dd'),
        format(appointment.timeSlot.startTime, 'HH:mm'),
        appointment.doctor.name,
        appointment.treatmentType.name
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: appointment.id,
        message: '預約建立成功',
      },
    });

  } catch (error) {
    console.error('[POST /api/admin/appointments]', error);
    
    const errorMessage = error instanceof Error ? error.message : 'E001';
    if (errorMessage === 'E003') {
      return NextResponse.json({
        success: false,
        error: { code: 'E003', message: ERROR_CODES.E003 },
      }, { status: 409 });
    }
    if (errorMessage === 'E004') {
      return NextResponse.json({
        success: false,
        error: { code: 'E004', message: ERROR_CODES.E004 },
      }, { status: 409 });
    }

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '建立預約失敗' },
    }, { status: 500 });
  }
}

