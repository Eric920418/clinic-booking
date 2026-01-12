# language: zh-TW
Feature: 管理員更新預約狀態
  作為 管理員
  為了 記錄病患的報到與看診狀態
  我想要 更新預約狀態

  Rule: 已預約狀態可更新為已報到
    
    Example: 更新為已報到
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 管理員更新預約狀態為 "checked_in"
      Then 預約狀態為 "checked_in"

  Rule: 已報到狀態可更新為已完成
    
    Example: 更新為已完成
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "checked_in"
      When 管理員更新預約狀態為 "completed"
      Then 預約狀態為 "completed"

  Rule: 已預約狀態不可直接更新為已完成
    
    Example: 未報到直接完成應失敗
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 管理員更新預約狀態為 "completed"
      Then 操作失敗

  Rule: 已完成狀態不可變更
    
    Example: 已完成預約無法變更狀態
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "completed"
      When 管理員更新預約狀態為 "booked"
      Then 操作失敗

  Rule: 已取消狀態不可變更
    
    Example: 已取消預約無法變更狀態
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "cancelled"
      When 管理員更新預約狀態為 "booked"
      Then 操作失敗

  Rule: 未報到狀態可改為已報到（補報到）
    
    Example: 未報到可補改為已報到
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "no_show"
      When 管理員更新預約狀態為 "checked_in"
      Then 預約狀態為 "checked_in"

    Example: 未報到無法改為已預約
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "no_show"
      When 管理員更新預約狀態為 "booked"
      Then 操作失敗

    Example: 未報到無法改為已完成
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "no_show"
      When 管理員更新預約狀態為 "completed"
      Then 操作失敗

