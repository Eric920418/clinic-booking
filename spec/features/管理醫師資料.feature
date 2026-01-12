# language: zh-TW
Feature: 管理醫師資料
  作為 管理員
  為了 管理醫師資訊
  我想要 新增、編輯、停用醫師資料

  Rule: 可新增醫師
    
    #TODO

  Rule: 可編輯醫師姓名
    
    #TODO

  Rule: 可設定醫師可看診項目
    
    Example: 為醫師新增可看診項目
      Given 醫師 ID 為 "doctor123"
      And 診療類型 ID 為 "treatment456"
      And 該醫師尚未關聯此診療類型
      When 管理員新增醫師診療項目
      Then 醫師診療項目關聯被建立

    Example: 相同醫師不可重複關聯相同診療項目
      Given 醫師 ID 為 "doctor123"
      And 診療類型 ID 為 "treatment456"
      And 該醫師已關聯此診療類型
      When 管理員新增醫師診療項目
      Then 操作失敗

  Rule: 可停用醫師
    
    Example: 停用醫師後狀態更新
      Given 醫師 ID 為 "doctor123"
      And 醫師狀態為啟用
      When 管理員停用醫師
      Then 醫師狀態為停用

  Rule: 停用醫師時自動取消所有未來預約並通知病患
    
    Example: 停用醫師時取消未來預約
      Given 醫師 ID 為 "doctor123"
      And 該醫師有以下未來預約
        | appointment_id | appointment_date | patient_line_user_id |
        | appt1          | 2026-01-20       | U1111111111111111    |
        | appt2          | 2026-01-25       | U2222222222222222    |
      When 管理員停用醫師
      Then 預約 "appt1" 狀態為 "cancelled"
      And 預約 "appt2" 狀態為 "cancelled"
      And LINE 訊息發送至 "U1111111111111111"
      And LINE 訊息發送至 "U2222222222222222"

    Example: 停用醫師時已完成的預約不受影響
      Given 醫師 ID 為 "doctor123"
      And 該醫師有以下預約
        | appointment_id | appointment_date | status    |
        | appt1          | 2026-01-10       | completed |
        | appt2          | 2026-01-20       | booked    |
      When 管理員停用醫師
      Then 預約 "appt1" 狀態為 "completed"
      And 預約 "appt2" 狀態為 "cancelled"

