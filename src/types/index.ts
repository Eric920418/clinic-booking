/**
 * 中醫診所 LINE 預約系統 - 類型定義
 * 對應規格：clinic-booking-spec.md
 */

// =============================================
// 附錄 A：狀態碼對照表
// =============================================
export type AppointmentStatus = 
  | 'booked'     // 已預約
  | 'checked_in' // 已報到
  | 'completed'  // 已完成
  | 'no_show'    // 未報到
  | 'cancelled'; // 已取消

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  booked: '已預約',
  checked_in: '已報到',
  completed: '已完成',
  no_show: '未報到',
  cancelled: '已取消',
};

// =============================================
// 附錄 B：錯誤代碼
// =============================================
export const ERROR_CODES = {
  E001: '驗證碼錯誤',
  E002: '驗證碼過期',
  E003: '時段已滿',
  E004: '您今日已有預約，同一天只能預約一次',
  E005: '帳號已被停權',
  E006: '登入失敗次數過多',
  E007: '無此預約',
  E008: '無法修改已完成的預約',
  E009: '您已被停權，無法使用預約服務，請聯絡診所電話',
  E010: '驗證碼錯誤次數過多，請重新發送',
  E011: '時段開始前 3 小時內不可修改預約',
  E012: '時段已滿，請選擇其他可用時段或同一時段其他醫師的選項',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// =============================================
// API 回應類型
// =============================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
  };
}

// =============================================
// 管理員角色
// 對應規格：第 4.6.2 節 權限設定
// =============================================
export type AdminRole = 'admin' | 'super_admin';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  admin: '管理員',
  super_admin: '超級管理員',
};

// =============================================
// 病患資料類型
// =============================================
export interface Patient {
  id: string;
  lineUserId: string | null;
  name: string;
  phone: string;
  nationalId: string;
  birthDate: Date;
  notes: string | null;
  noShowCount: number;
  isBlacklisted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// 醫師資料類型
// =============================================
export interface Doctor {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  treatmentTypes?: TreatmentType[];
}

// =============================================
// 診療類型
// 對應規格：第 3.3.4 節
// =============================================
export interface TreatmentType {
  id: string;
  name: string;
  durationMinutes: number; // 扣除分鐘數
  isActive: boolean;
  sortOrder: number;
}

// =============================================
// 班表類型
// =============================================
export interface Schedule {
  id: string;
  doctorId: string;
  date: Date;
  isAvailable: boolean;
  doctor?: Doctor;
  timeSlots?: TimeSlot[];
}

// =============================================
// 時段類型
// 對應規格：第 3.3.3 節
// =============================================
export interface TimeSlot {
  id: string;
  scheduleId: string;
  startTime: Date;
  endTime: Date;
  totalMinutes: number;
  remainingMinutes: number;
  schedule?: Schedule;
}

// =============================================
// 預約類型
// =============================================
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  treatmentTypeId: string;
  timeSlotId: string;
  appointmentDate: Date;
  status: AppointmentStatus;
  cancelledReason: string | null;
  cancelledBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: Patient;
  doctor?: Doctor;
  treatmentType?: TreatmentType;
  timeSlot?: TimeSlot;
}

// =============================================
// 管理員類型
// =============================================
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  language: string;
  timezone: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
}

// =============================================
// 驗證碼類型
// 對應規格：第 3.1.2 節
// =============================================
export interface VerificationCode {
  id: string;
  lineUserId: string;
  code: string;
  attempts: number;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

// =============================================
// Dashboard 類型
// 對應規格：第 4.2 節
// =============================================
export interface DashboardSummary {
  todayTotal: number;
  todayBooked: number;
  todayCheckedIn: number;
  todayCompleted: number;
  todayNoShow: number;
  todayCancelled: number;
  doctorsOnDuty: number;
  availableSlots: number;
}

export interface WeeklyStats {
  date: string;
  count: number;
}

export interface Alert {
  type: 'full_slot' | 'same_day_cancel' | 'high_no_show';
  message: string;
  createdAt: Date;
}

