# language: zh-TW
Feature: 管理員手動新增預約
  作為 管理員
  為了 處理電話預約
  我想要 手動為病患建立預約

  Rule: 時段剩餘分鐘數必須大於等於診療所需分鐘數
    
    Example: 時段剩餘分鐘數足夠時可新增預約
      Given 時段剩餘分鐘數為 10
      And 診療類型為 "初診"
      And 初診所需分鐘數為 10
      When 管理員新增預約
      Then 預約記錄被建立
      And 時段剩餘分鐘數為 0

    Example: 時段剩餘分鐘數不足時無法新增預約
      Given 時段剩餘分鐘數為 5
      And 診療類型為 "初診"
      And 初診所需分鐘數為 10
      When 管理員新增預約
      Then 操作失敗

  Rule: 病患當日不可有重複預約
    
    Example: 病患當日已有預約時無法再次新增
      Given 病患 ID 為 "patient123"
      And 預約日期為 "2026-01-15"
      And 該病患在 "2026-01-15" 已有狀態為 "booked" 的預約
      When 管理員新增預約於 "2026-01-15"
      Then 操作失敗

  Rule: 預約成功後必須扣除時段分鐘數
    
    #TODO

  Rule: 預約成功後必須建立預約記錄
    
    #TODO

  Rule: 若病患有綁定 LINE 則發送通知
    
    Example: 病患有 LINE User ID 時發送通知
      Given 病患 ID 為 "patient123"
      And 病患 LINE User ID 為 "U1234567890abcdef"
      When 管理員新增預約
      Then LINE 訊息發送至 "U1234567890abcdef"

    Example: 病患無 LINE User ID 時不發送通知
      Given 病患 ID 為 "patient123"
      And 病患 LINE User ID 為 null
      When 管理員新增預約
      Then 預約記錄被建立

