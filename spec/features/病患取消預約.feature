# language: zh-TW
Feature: 病患取消預約
  作為 病患
  為了 取消不需要的預約
  我想要 取消已建立的預約

  Rule: 取消預約時必須更新預約狀態為「已取消」
    
    Example: 取消預約後狀態變更
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 病患取消預約
      Then 預約狀態為 "cancelled"

  Rule: 取消預約時必須釋放時段分鐘數
    
    Example: 取消初診預約釋放 10 分鐘
      Given 預約 ID 為 "appt123"
      And 預約的時段 ID 為 "slot123"
      And 時段 "slot123" 剩餘分鐘數為 15
      And 預約的診療類型為 "初診"
      And 初診所需分鐘數為 10
      When 病患取消預約
      Then 時段 "slot123" 剩餘分鐘數為 25

    Example: 取消內科預約釋放 5 分鐘
      Given 預約 ID 為 "appt123"
      And 預約的時段 ID 為 "slot123"
      And 時段 "slot123" 剩餘分鐘數為 20
      And 預約的診療類型為 "內科"
      And 內科所需分鐘數為 5
      When 病患取消預約
      Then 時段 "slot123" 剩餘分鐘數為 25

  Rule: 取消成功後必須發送 LINE 通知
    
    Example: 取消預約發送通知訊息
      Given 預約 ID 為 "appt123"
      And 病患 LINE User ID 為 "U1234567890abcdef"
      When 病患取消預約
      Then LINE 訊息發送至 "U1234567890abcdef"

