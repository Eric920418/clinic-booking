/**
 * 預約相關常數
 * 對應規格：spec/features/預約狀態自動更新.feature
 */

export const APPOINTMENT_CONSTANTS = {
  /** 未報到次數上限（達到後停止累計） */
  MAX_NO_SHOW_COUNT: 3,

  /** 每個時段的預設總分鐘數 */
  DEFAULT_SLOT_MINUTES: 30,

  /** 預約可提前修改的最小時數 */
  MIN_HOURS_BEFORE_MODIFICATION: 3,

  /** 預約可提前預約的最大天數 */
  MAX_BOOKING_DAYS_AHEAD: 30,
} as const

export type AppointmentConstants = typeof APPOINTMENT_CONSTANTS
