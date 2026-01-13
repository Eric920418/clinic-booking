/**
 * 病患端預約 API 驗證
 * 對應測試：tests/e2e/liff/patient-create-appointment.spec.ts
 */
import { z } from 'zod'

/**
 * 病患建立預約 Schema
 * 使用 LINE User ID 識別病患
 */
export const patientCreateAppointmentSchema = z.object({
  // LINE User ID - 用於識別病患
  lineUserId: z.string().min(1, '缺少 LINE User ID'),

  // 時段 ID
  slotId: z.string().uuid('請選擇時段'),

  // 診療類型 ID
  treatmentId: z.string().uuid('請選擇診療類型'),
})

export type PatientCreateAppointmentInput = z.infer<typeof patientCreateAppointmentSchema>

/**
 * 病患修改預約 Schema
 */
export const patientUpdateAppointmentSchema = z.object({
  // 新時段 ID（可選）
  timeSlotId: z.string().uuid('請選擇時段').optional(),

  // 新診療類型 ID（可選）
  treatmentTypeId: z.string().uuid('請選擇診療類型').optional(),
})

export type PatientUpdateAppointmentInput = z.infer<typeof patientUpdateAppointmentSchema>
