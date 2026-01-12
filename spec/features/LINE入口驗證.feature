# language: zh-TW
Feature: LINE 入口驗證
  作為 病患
  為了 進入預約系統
  我想要 透過 LINE LIFF 進行身分驗證

  Rule: LIFF 初始化後必須取得 LINE User ID
    
    #TODO

  Rule: 必須檢查用戶是否在黑名單中
    
    Example: 黑名單用戶無法進入系統並顯示停權原因與申訴管道
      Given LINE User ID 為 "U1234567890abcdef"
      And 該 LINE User ID 對應的病患在黑名單中
      And 停權原因為 "累計未報到 3 次"
      When 用戶透過 LINE LIFF 進入系統
      Then 操作失敗
      And 顯示訊息 "您已被停權，無法使用預約服務"
      And 顯示停權原因 "累計未報到 3 次"
      And 顯示申訴管道資訊

    Example: 非黑名單用戶可進入驗證流程
      Given LINE User ID 為 "U1234567890abcdef"
      And 該 LINE User ID 對應的病患不在黑名單中
      When 用戶透過 LINE LIFF 進入系統
      Then 進入真人驗證流程

