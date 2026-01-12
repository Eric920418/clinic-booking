# language: zh-TW
Feature: 管理員編輯預約
  作為 管理員
  為了 調整預約資訊
  我想要 修改預約的內容

  Rule: 修改預約時必須立即釋放原時段分鐘數
    
    Example: 釋放原時段的內科分鐘數
      Given 原預約的時段 ID 為 "slot123"
      And 時段 "slot123" 剩餘分鐘數為 20
      And 原預約的診療類型為 "內科"
      And 內科所需分鐘數為 5
      When 管理員編輯預約
      Then 時段 "slot123" 剩餘分鐘數為 25

  Rule: 修改預約時必須檢查新時段餘量
    
    Example: 新時段餘量足夠時可修改
      Given 新時段 ID 為 "slot456"
      And 時段 "slot456" 剩餘分鐘數為 10
      And 新診療類型為 "針灸"
      And 針灸所需分鐘數為 5
      When 管理員編輯預約
      Then 預約記錄被更新
      And 時段 "slot456" 剩餘分鐘數為 5

    Example: 新時段餘量不足時無法修改
      Given 新時段 ID 為 "slot456"
      And 時段 "slot456" 剩餘分鐘數為 3
      And 新診療類型為 "針灸"
      And 針灸所需分鐘數為 5
      When 管理員編輯預約
      Then 操作失敗

  Rule: 修改預約時必須扣除新時段分鐘數
    
    #TODO

  Rule: 修改記錄必須包含操作人與操作時間
    
    #TODO

