# language: zh-TW
Feature: 管理診療類型
  作為 管理員
  為了 管理診療項目
  我想要 新增、修改、停用診療類型

  Rule: 可新增診療類型
    
    #TODO

  Rule: 可修改診療類型的扣除分鐘數
    
    Example: 修改初診所需分鐘數
      Given 診療類型 ID 為 "treatment123"
      And 診療類型名稱為 "初診"
      And 原扣除分鐘數為 10
      And 管理員輸入新扣除分鐘數為 15
      When 管理員修改診療類型
      Then 診療類型的扣除分鐘數為 15

  Rule: 扣除分鐘數必須大於 0
    
    Example: 扣除分鐘數為 0 無效
      Given 診療類型 ID 為 "treatment123"
      And 管理員輸入新扣除分鐘數為 0
      When 管理員修改診療類型
      Then 操作失敗

    Example: 扣除分鐘數為負數無效
      Given 診療類型 ID 為 "treatment123"
      And 管理員輸入新扣除分鐘數為 -5
      When 管理員修改診療類型
      Then 操作失敗

  Rule: 扣除分鐘數不可超過 30 分鐘（單一時段長度）
    
    Example: 扣除分鐘數為 30 分鐘有效
      Given 診療類型 ID 為 "treatment123"
      And 管理員輸入新扣除分鐘數為 30
      When 管理員修改診療類型
      Then 診療類型的扣除分鐘數為 30

    Example: 扣除分鐘數超過 30 分鐘無效
      Given 診療類型 ID 為 "treatment123"
      And 管理員輸入新扣除分鐘數為 35
      When 管理員修改診療類型
      Then 操作失敗

  Rule: 可停用診療類型
    
    Example: 停用診療類型後狀態更新
      Given 診療類型 ID 為 "treatment123"
      And 診療類型狀態為啟用
      When 管理員停用診療類型
      Then 診療類型狀態為停用

  Rule: 停用診療類型時自動取消所有使用此類型的未來預約並通知病患
    
    Example: 停用診療類型時取消相關未來預約
      Given 診療類型 ID 為 "treatment123"
      And 使用此診療類型的未來預約有
        | appointment_id | appointment_date | patient_line_user_id |
        | appt1          | 2026-01-20       | U1111111111111111    |
        | appt2          | 2026-01-25       | U2222222222222222    |
      When 管理員停用診療類型
      Then 預約 "appt1" 狀態為 "cancelled"
      And 預約 "appt2" 狀態為 "cancelled"
      And LINE 訊息發送至 "U1111111111111111"
      And LINE 訊息發送至 "U2222222222222222"

    Example: 停用診療類型時已完成的預約不受影響
      Given 診療類型 ID 為 "treatment123"
      And 使用此診療類型的預約有
        | appointment_id | appointment_date | status    |
        | appt1          | 2026-01-10       | completed |
        | appt2          | 2026-01-20       | booked    |
      When 管理員停用診療類型
      Then 預約 "appt1" 狀態為 "completed"
      And 預約 "appt2" 狀態為 "cancelled"

