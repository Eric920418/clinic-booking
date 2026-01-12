# language: zh-TW
Feature: 管理帳號
  作為 超級管理員
  為了 管理後台使用者
  我想要 新增、編輯、停用管理員帳號

  Rule: 僅超級管理員可管理帳號
    
    Example: 一般管理員無法新增帳號
      Given 管理員角色為 "admin"
      When 管理員新增帳號
      Then 操作失敗

    Example: 超級管理員可新增帳號
      Given 管理員角色為 "super_admin"
      When 管理員新增帳號
      Then 帳號記錄被建立

  Rule: 帳號必須使用 Email 格式
    
    #TODO

  Rule: Email 必須唯一
    
    Example: 重複的 Email 無法新增
      Given 系統中已存在帳號 "admin@example.com"
      And 新帳號 Email 為 "admin@example.com"
      When 超級管理員新增帳號
      Then 操作失敗

  Rule: 密碼最小長度為 8 字元
    
    Example: 密碼少於 8 字元無效
      Given 密碼為 "Pass123"
      When 超級管理員新增帳號
      Then 操作失敗

    Example: 密碼 8 字元有效
      Given 密碼為 "Pass1234"
      When 超級管理員新增帳號
      Then 帳號記錄被建立

  Rule: 密碼必須包含大寫、小寫、數字
    
    Example: 密碼缺少大寫無效
      Given 密碼為 "password123"
      When 超級管理員新增帳號
      Then 操作失敗

    Example: 密碼缺少小寫無效
      Given 密碼為 "PASSWORD123"
      When 超級管理員新增帳號
      Then 操作失敗

    Example: 密碼缺少數字無效
      Given 密碼為 "Password"
      When 超級管理員新增帳號
      Then 操作失敗

    Example: 密碼包含大寫、小寫、數字有效
      Given 密碼為 "Password123"
      When 超級管理員新增帳號
      Then 帳號記錄被建立

  Rule: 可停用帳號
    
    Example: 停用帳號後狀態更新
      Given 帳號 ID 為 "admin123"
      And 帳號狀態為啟用
      When 超級管理員停用帳號
      Then 帳號狀態為停用

  Rule: 可重設密碼
    
    #TODO

