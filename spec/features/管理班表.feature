# language: zh-TW
Feature: 管理班表
  作為 管理員
  為了 設定醫師的看診時間
  我想要 管理醫師的班表與時段

  Rule: 同一醫師在同一日期只能有一筆班表
    
    Example: 相同醫師相同日期無法重複建立班表
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-15"
      And 該醫師在 "2026-01-15" 已有班表
      When 管理員建立班表
      Then 操作失敗

    Example: 相同醫師不同日期可建立班表
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-16"
      And 該醫師在 "2026-01-16" 無班表
      When 管理員建立班表
      Then 班表記錄被建立

  Rule: 時段總分鐘數預設為 30 分鐘
    
    Example: 建立時段時預設總分鐘數與剩餘分鐘數
      Given 班表 ID 為 "schedule123"
      And 時段開始時間為 "09:00"
      And 時段結束時間為 "09:30"
      When 管理員建立時段
      Then 時段總分鐘數為 30
      And 時段剩餘分鐘數為 30

  Rule: 可手動調整時段剩餘分鐘數
    
    Example: 調整特定時段的剩餘分鐘數
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 30
      And 管理員輸入新餘量為 20
      When 管理員調整時段餘量
      Then 時段剩餘分鐘數為 20

  Rule: 剩餘分鐘數為 0 時不可手動調整
    
    Example: 餘量為 0 時無法調整
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 0
      And 管理員輸入新餘量為 10
      When 管理員調整時段餘量
      Then 操作失敗

    Example: 餘量大於 0 時可調整
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 5
      And 管理員輸入新餘量為 15
      When 管理員調整時段餘量
      Then 時段剩餘分鐘數為 15

  Rule: 標記停診時已預約者必須發送通知
    
    Example: 停診時發送通知給所有已預約病患
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-15"
      And 該日有以下已預約記錄
        | appointment_id | patient_line_user_id |
        | appt1          | U1111111111111111    |
        | appt2          | U2222222222222222    |
      When 管理員標記停診
      Then LINE 訊息發送至 "U1111111111111111"
      And LINE 訊息發送至 "U2222222222222222"

  Rule: 標記停診時必須將班表設為不可預約
    
    Example: 停診後班表狀態更新
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-15"
      And 該班表 is_available 為 true
      When 管理員標記停診
      Then 該班表 is_available 為 false

  Rule: 停診恢復僅限未來日期
    
    Example: 未來日期的停診可恢復
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-20"
      And 當前日期為 "2026-01-15"
      And 該班表 is_available 為 false
      When 管理員恢復班表為可預約
      Then 該班表 is_available 為 true

    Example: 過去或當日的停診無法恢復
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-15"
      And 當前日期為 "2026-01-15"
      And 該班表 is_available 為 false
      When 管理員恢復班表為可預約
      Then 操作失敗

  Rule: 可為醫師新增額外時段（加診）
    
    Example: 新增加診時段
      Given 醫師 ID 為 "doctor123"
      And 日期為 "2026-01-15"
      And 該醫師在 "2026-01-15" 已有班表
      And 時段開始時間為 "18:00"
      And 時段結束時間為 "18:30"
      When 管理員新增加診時段
      Then 時段記錄被建立

  Rule: 可設定週期性班表
    
    #TODO

  Rule: 可設定可預約日
    
    #TODO
