# language: zh-TW
Feature: 即時更新時段餘量
  作為 病患
  為了 看到最新的時段可預約狀態
  我想要 訂閱時段餘量的即時更新

  Rule: 訂閱 Supabase Realtime 監聽時段變更
    
    #TODO

  Rule: 新預約時即時廣播時段剩餘分鐘數減少
    
    Example: 病患 A 預約成功後病患 B 看到餘量更新
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 10
      And 病患 B 正在查看該時段
      And 病患 A 建立預約並扣除 5 分鐘
      When 時段餘量變更廣播
      Then 病患 B 看到時段剩餘分鐘數為 5

  Rule: 取消預約時即時廣播時段剩餘分鐘數增加
    
    Example: 病患 A 取消預約後病患 B 看到餘量更新
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 5
      And 病患 B 正在查看該時段
      And 病患 A 取消預約並釋放 5 分鐘
      When 時段餘量變更廣播
      Then 病患 B 看到時段剩餘分鐘數為 10

  Rule: 修改預約時即時廣播原時段釋放與新時段扣除
    
    Example: 病患 A 修改預約後病患 B 看到兩個時段餘量更新
      Given 原時段 ID 為 "slot123"
      And 原時段剩餘分鐘數為 15
      And 新時段 ID 為 "slot456"
      And 新時段剩餘分鐘數為 20
      And 病患 B 正在查看這兩個時段
      And 病患 A 修改預約從 "slot123" 到 "slot456"
      And 原預約扣除 5 分鐘，新預約扣除 5 分鐘
      When 時段餘量變更廣播
      Then 病患 B 看到時段 "slot123" 剩餘分鐘數為 20
      And 病患 B 看到時段 "slot456" 剩餘分鐘數為 15

