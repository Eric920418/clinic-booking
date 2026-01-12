/**
 * 預約相關驗證
 * 對應規格：spec/features/病患建立預約.feature
 */
import { z } from 'zod';

/**
 * 建立預約 Schema
 * 對應規格：第 3.3.5 節 建立預約
 */
export const createAppointmentSchema = z.object({
  // 病患 ID（若為新病患則為空）
  patientId: z.string().uuid().optional(),
  
  // 病患資料（若為新病患）
  patientData: z.object({
    name: z.string().min(2).max(20),
    phone: z.string().regex(/^09\d{8}$/),
    nationalId: z.string(),
    birthDate: z.string().or(z.date()),
  }).optional(),
  
  // 醫師 ID
  doctorId: z.string().uuid('請選擇醫師'),
  
  // 時段 ID
  timeSlotId: z.string().uuid('請選擇時段'),
  
  // 診療類型 ID
  treatmentTypeId: z.string().uuid('請選擇診療類型'),
  
  // 預約日期
  appointmentDate: z.string().or(z.date()),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * 修改預約 Schema
 * 對應規格：第 3.4.2 節 編輯預約
 */
export const updateAppointmentSchema = z.object({
  // 新醫師 ID
  doctorId: z.string().uuid().optional(),
  
  // 新時段 ID
  timeSlotId: z.string().uuid().optional(),
  
  // 新診療類型 ID
  treatmentTypeId: z.string().uuid().optional(),
  
  // 新預約日期
  appointmentDate: z.string().or(z.date()).optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

/**
 * 更新預約狀態 Schema
 * 對應規格：第 4.3.5 節 預約狀態管理
 */
export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['booked', 'checked_in', 'completed', 'no_show', 'cancelled']),
  cancelledReason: z.string().optional(),
});

export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;

