# language: zh-TW
Feature: 管理員取消預約
  作為 管理員
  為了 處理取消預約需求
  我想要 取消病患的預約

  Rule: 取消預約時必須更新預約狀態為「已取消」
    
    Example: 取消預約後狀態變更
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 管理員取消預約
      Then 預約狀態為 "cancelled"

  Rule: 取消預約時必須釋放時段分鐘數
    
    Example: 取消針灸預約釋放 5 分鐘
      Given 預約 ID 為 "appt123"
      And 預約的時段 ID 為 "slot123"
      And 時段 "slot123" 剩餘分鐘數為 10
      And 預約的診療類型為 "針灸"
      And 針灸所需分鐘數為 5
      When 管理員取消預約
      Then 時段 "slot123" 剩餘分鐘數為 15

  Rule: 取消成功後必須發送 LINE 通知
    
    Example: 病患有 LINE User ID 時發送取消通知
      Given 預約 ID 為 "appt123"
      And 病患 LINE User ID 為 "U1234567890abcdef"
      When 管理員取消預約
      Then LINE 訊息發送至 "U1234567890abcdef"

  Rule: 可記錄取消原因
    
    #TODO

