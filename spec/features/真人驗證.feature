# language: zh-TW
Feature: 真人驗證
  作為 病患
  為了 防止機器人濫用預約系統
  我想要 透過驗證碼進行真人驗證

  Rule: 系統必須產生 6 位數驗證碼
    
    Example: 產生驗證碼並發送至 LINE
      Given LINE User ID 為 "U1234567890abcdef"
      When 病患請求發送驗證碼
      Then 系統產生 6 位數驗證碼
      And 驗證碼透過 LINE Messaging API 發送至該用戶

  Rule: 驗證碼有效期為 5 分鐘
    
    Example: 驗證碼在有效期內可使用
      Given 驗證碼為 "123456"
      And 驗證碼建立時間為 "2026-01-10 10:00:00"
      And 當前時間為 "2026-01-10 10:04:00"
      When 病患輸入驗證碼 "123456"
      Then 驗證成功

    Example: 驗證碼超過 5 分鐘後失效
      Given 驗證碼為 "123456"
      And 驗證碼建立時間為 "2026-01-10 10:00:00"
      And 當前時間為 "2026-01-10 10:06:00"
      When 病患輸入驗證碼 "123456"
      Then 操作失敗

  Rule: 驗證錯誤上限為 5 次
    
    Example: 驗證錯誤未達 5 次可繼續嘗試
      Given 驗證碼為 "123456"
      And 錯誤嘗試次數為 4
      When 病患輸入驗證碼 "000000"
      Then 操作失敗
      And 錯誤嘗試次數為 5

    Example: 驗證錯誤達 5 次後需重新發送
      Given 驗證碼為 "123456"
      And 錯誤嘗試次數為 5
      When 病患輸入驗證碼 "123456"
      Then 操作失敗

  Rule: 驗證錯誤達 5 次後驗證碼記錄標記為失效
    
    Example: 達到 5 次錯誤後記錄保留但失效
      Given 驗證碼 ID 為 "code123"
      And 錯誤嘗試次數為 4
      When 病患輸入錯誤驗證碼
      Then 錯誤嘗試次數為 5
      And 驗證碼記錄保留
      And 後續嘗試該驗證碼均失敗

  Rule: 重新發送驗證碼限制為 60 秒內 1 次
    
    Example: 距離上次發送未滿 60 秒無法重新發送
      Given LINE User ID 為 "U1234567890abcdef"
      And 上次發送驗證碼時間為 "2026-01-10 10:00:00"
      And 當前時間為 "2026-01-10 10:00:30"
      When 病患請求發送驗證碼
      Then 操作失敗

    Example: 距離上次發送已滿 60 秒可重新發送
      Given LINE User ID 為 "U1234567890abcdef"
      And 上次發送驗證碼時間為 "2026-01-10 10:00:00"
      And 當前時間為 "2026-01-10 10:01:00"
      When 病患請求發送驗證碼
      Then 系統產生 6 位數驗證碼
      And 驗證碼透過 LINE Messaging API 發送至該用戶

