# language: zh-TW
Feature: 管理員登入
  作為 管理員
  為了 使用後台管理系統
  我想要 透過帳號密碼登入

  Rule: 帳號與密碼必須正確
    
    Example: 正確的帳號密碼可登入
      Given 管理員帳號為 "admin@example.com"
      And 密碼為 "Password123"
      And 系統中存在帳號 "admin@example.com"
      And 該帳號的密碼雜湊值匹配 "Password123"
      When 管理員登入
      Then 登入成功
      And Session 建立

    Example: 錯誤的密碼無法登入
      Given 管理員帳號為 "admin@example.com"
      And 密碼為 "WrongPassword"
      And 系統中存在帳號 "admin@example.com"
      And 該帳號的密碼雜湊值不匹配 "WrongPassword"
      When 管理員登入
      Then 操作失敗

  Rule: 帳號必須為啟用狀態
    
    Example: 停用帳號無法登入
      Given 管理員帳號為 "admin@example.com"
      And 密碼為 "Password123"
      And 系統中存在帳號 "admin@example.com"
      And 該帳號狀態為停用
      When 管理員登入
      Then 操作失敗

  Rule: 登入失敗累計 5 次後鎖定 15 分鐘
    
    Example: 登入失敗 4 次後仍可嘗試
      Given 管理員帳號為 "admin@example.com"
      And 該帳號登入失敗次數為 4
      When 管理員使用錯誤密碼登入
      Then 操作失敗
      And 登入失敗次數為 5

    Example: 登入失敗 5 次後帳號被鎖定
      Given 管理員帳號為 "admin@example.com"
      And 該帳號登入失敗次數為 5
      And 當前時間為 "2026-01-15 10:00:00"
      When 管理員登入
      Then 操作失敗
      And 帳號鎖定至 "2026-01-15 10:15:00"

    Example: 鎖定期間內無法登入
      Given 管理員帳號為 "admin@example.com"
      And 帳號鎖定至 "2026-01-15 10:15:00"
      And 當前時間為 "2026-01-15 10:10:00"
      When 管理員使用正確密碼登入
      Then 操作失敗

    Example: 鎖定期滿後可登入
      Given 管理員帳號為 "admin@example.com"
      And 帳號鎖定至 "2026-01-15 10:15:00"
      And 當前時間為 "2026-01-15 10:15:00"
      When 管理員使用正確密碼登入
      Then 登入成功

  Rule: 登入成功時失敗次數重置為 0
    
    Example: 登入成功後失敗次數清零
      Given 管理員帳號為 "admin@example.com"
      And 該帳號登入失敗次數為 4
      And 密碼為 "Password123"
      When 管理員使用正確密碼登入
      Then 登入成功
      And 登入失敗次數為 0

  Rule: Session 有效期為 24 小時
    
    #TODO

