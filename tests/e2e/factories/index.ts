// tests/e2e/factories/index.ts
// 測試資料工廠匯出

// 驗證碼
export {
  createVerificationCode,
  createExpiredVerificationCode,
  createMaxAttemptsVerificationCode,
} from './verification-code'

// 管理員
export {
  createAdminUser,
  createLockedAdminUser,
  createInactiveAdminUser,
  createSuperAdminUser,
} from './admin-user'

// 病患
export { createPatient, createBlacklistedPatient } from './patient'

// 醫師
export { createDoctor, createInactiveDoctor } from './doctor'

// 醫師診療項目關聯
export { createDoctorTreatment, createDoctorTreatments } from './doctor-treatment'

// 診療類型
export {
  createTreatmentType,
  createFirstVisitTreatment,
  createInternalMedicineTreatment,
  createAcupunctureTreatment,
} from './treatment-type'

// 班表
export { createSchedule, createSuspendedSchedule } from './schedule'

// 時段
export { createTimeSlot, createFullTimeSlot, createTimeSlots } from './time-slot'

// 黑名單
export { createBlacklist, addPatientToBlacklist } from './blacklist'

// 預約
export {
  createAppointment,
  createCheckedInAppointment,
  createCompletedAppointment,
  createNoShowAppointment,
  createCancelledAppointment,
} from './appointment'
