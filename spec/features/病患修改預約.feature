# language: zh-TW
Feature: 病患修改預約
  作為 病患
  為了 調整預約時間或內容
  我想要 修改已建立的預約

  Rule: 僅可修改狀態為「已預約」的預約
    
    Example: 已預約狀態可修改
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 病患修改預約
      Then 預約記錄被更新

    Example: 已取消狀態無法修改
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "cancelled"
      When 病患修改預約
      Then 操作失敗

    Example: 已完成狀態無法修改
      Given 預約 ID 為 "appt123"
      And 預約狀態為 "completed"
      When 病患修改預約
      Then 操作失敗

  Rule: 不可修改時段開始前 3 小時內的預約
    
    Example: 時段開始前 3 小時內無法修改
      Given 預約 ID 為 "appt123"
      And 預約時段開始時間為 "2026-01-15 14:00"
      And 當前時間為 "2026-01-15 11:30"
      When 病患修改預約
      Then 操作失敗

    Example: 時段開始前超過 3 小時可修改
      Given 預約 ID 為 "appt123"
      And 預約時段開始時間為 "2026-01-15 14:00"
      And 當前時間為 "2026-01-15 10:00"
      When 病患修改預約
      Then 預約記錄被更新

    Example: 時段開始前剛好 3 小時無法修改
      Given 預約 ID 為 "appt123"
      And 預約時段開始時間為 "2026-01-15 14:00"
      And 當前時間為 "2026-01-15 11:00"
      When 病患修改預約
      Then 操作失敗

  Rule: 修改預約時必須立即釋放原時段分鐘數
    
    Example: 釋放原時段的初診分鐘數
      Given 原預約的時段 ID 為 "slot123"
      And 時段 "slot123" 剩餘分鐘數為 15
      And 原預約的診療類型為 "初診"
      And 初診所需分鐘數為 10
      When 病患修改預約
      Then 時段 "slot123" 剩餘分鐘數為 25

  Rule: 修改預約時必須檢查新時段餘量
    
    Example: 新時段餘量足夠時可修改
      Given 新時段 ID 為 "slot456"
      And 時段 "slot456" 剩餘分鐘數為 10
      And 新診療類型為 "內科"
      And 內科所需分鐘數為 5
      When 病患修改預約
      Then 預約記錄被更新
      And 時段 "slot456" 剩餘分鐘數為 5

    Example: 新時段餘量不足時無法修改
      Given 新時段 ID 為 "slot456"
      And 時段 "slot456" 剩餘分鐘數為 3
      And 新診療類型為 "內科"
      And 內科所需分鐘數為 5
      When 病患修改預約
      Then 操作失敗

  Rule: 修改預約時必須扣除新時段分鐘數
    
    #TODO

  Rule: 修改成功後必須發送 LINE 通知
    
    #TODO

