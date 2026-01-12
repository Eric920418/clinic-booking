# language: zh-TW
Feature: 黑名單管理
  作為 管理員/超級管理員
  為了 管理惡意或違規病患
  我想要 將病患加入或移除黑名單

  Rule: 未報到累計達 3 次自動加入黑名單（批次處理）
    
    Example: 批次檢查時未報到次數達 3 次加入黑名單
      Given 病患 ID 為 "patient123"
      And 未報到次數為 3
      And 病患狀態 is_blacklisted 為 false
      When 系統執行每日黑名單批次檢查
      Then 病患狀態 is_blacklisted 為 true
      And 黑名單記錄被建立

    Example: 批次檢查時未報到次數未達 3 次不加入黑名單
      Given 病患 ID 為 "patient123"
      And 未報到次數為 2
      And 病患狀態 is_blacklisted 為 false
      When 系統執行每日黑名單批次檢查
      Then 病患狀態 is_blacklisted 為 false

  Rule: 黑名單病患無法使用預約系統
    
    Example: 黑名單病患無法建立預約
      Given 病患 LINE User ID 為 "U1234567890abcdef"
      And 該病患狀態 is_blacklisted 為 true
      When 病患建立預約
      Then 操作失敗

  Rule: 超級管理員可手動加入黑名單
    
    #TODO

  Rule: 超級管理員可手動移除黑名單
    
    Example: 超級管理員移除黑名單
      Given 病患 ID 為 "patient123"
      And 該病患狀態 is_blacklisted 為 true
      And 管理員角色為 "super_admin"
      When 管理員移除黑名單
      Then 病患狀態 is_blacklisted 為 false
      And 黑名單記錄被刪除

  Rule: 一般管理員無法移除黑名單
    
    Example: 一般管理員無法移除黑名單
      Given 病患 ID 為 "patient123"
      And 該病患狀態 is_blacklisted 為 true
      And 管理員角色為 "admin"
      When 管理員移除黑名單
      Then 操作失敗

  Rule: 黑名單操作必須記錄操作人、時間與原因
    
    #TODO

