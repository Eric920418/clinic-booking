# language: zh-TW
Feature: 病患建立預約
  作為 病患
  為了 預約看診
  我想要 選擇日期、醫師、時段、診療類型並建立預約

  Rule: 病患不可在黑名單中
    
    Example: 黑名單病患無法建立預約
      Given 病患 LINE User ID 為 "U1234567890abcdef"
      And 該病患在黑名單中
      When 病患建立預約
      Then 操作失敗

  Rule: 時段剩餘分鐘數必須大於等於診療所需分鐘數
    
    Example: 時段剩餘分鐘數足夠時可預約
      Given 時段剩餘分鐘數為 10
      And 診療類型為 "初診"
      And 初診所需分鐘數為 10
      When 病患建立預約
      Then 預約記錄被建立
      And 時段剩餘分鐘數為 0

    Example: 時段剩餘分鐘數不足時無法預約並建議其他時段
      Given 時段剩餘分鐘數為 5
      And 診療類型為 "初診"
      And 初診所需分鐘數為 10
      And 同一醫師有其他可用時段
      When 病患建立預約
      Then 操作失敗
      And 返回錯誤訊息 "時段已滿"
      And 返回其他可用時段建議

  Rule: 病患當日不可有重複預約
    
    Example: 病患當日已有預約時無法再次預約
      Given 病患 ID 為 "patient123"
      And 預約日期為 "2026-01-15"
      And 該病患在 "2026-01-15" 已有狀態為 "booked" 的預約
      When 病患建立預約於 "2026-01-15"
      Then 操作失敗

    Example: 病患當日無預約時可建立預約
      Given 病患 ID 為 "patient123"
      And 預約日期為 "2026-01-15"
      And 該病患在 "2026-01-15" 無預約
      When 病患建立預約於 "2026-01-15"
      Then 預約記錄被建立

  Rule: 預約成功後必須扣除時段分鐘數
    
    Example: 預約初診扣除 10 分鐘
      Given 時段剩餘分鐘數為 30
      And 診療類型為 "初診"
      And 初診所需分鐘數為 10
      When 病患建立預約
      Then 時段剩餘分鐘數為 20

    Example: 預約內科扣除 5 分鐘
      Given 時段剩餘分鐘數為 30
      And 診療類型為 "內科"
      And 內科所需分鐘數為 5
      When 病患建立預約
      Then 時段剩餘分鐘數為 25

  Rule: 預約成功後必須建立預約記錄
    
    #TODO

  Rule: 預約成功後必須發送 LINE 通知
    
    Example: 預約成功發送通知訊息
      Given 病患 LINE User ID 為 "U1234567890abcdef"
      And 預約日期為 "2026-01-15"
      And 預約時段為 "09:00-09:30"
      And 醫師姓名為 "王醫師"
      And 診療類型為 "初診"
      When 病患建立預約
      Then LINE 訊息發送至 "U1234567890abcdef"

  Rule: 不可選擇過去日期
    
    Example: 選擇過去日期無法建立預約
      Given 當前日期為 "2026-01-15"
      And 預約日期為 "2026-01-14"
      When 病患建立預約
      Then 操作失敗

  Rule: 不可選擇超過 30 天後的日期
    
    Example: 選擇 31 天後的日期無法建立預約
      Given 當前日期為 "2026-01-15"
      And 預約日期為 "2026-02-16"
      When 病患建立預約
      Then 操作失敗

    Example: 選擇 30 天後的日期可建立預約
      Given 當前日期為 "2026-01-15"
      And 預約日期為 "2026-02-14"
      And 時段剩餘分鐘數足夠
      And 病患當日無預約
      When 病患建立預約
      Then 預約記錄被建立

  Rule: 每次預約僅能選擇一個診療項目
    
    #TODO

