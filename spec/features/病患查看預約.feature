# language: zh-TW
Feature: 病患查看預約
  作為 病患
  為了 了解我的預約資訊
  我想要 查看預約詳情

  Rule: 系統必須顯示預約日期與時段
    
    #TODO

  Rule: 系統必須顯示醫師姓名
    
    #TODO

  Rule: 系統必須顯示診療類型
    
    #TODO

  Rule: 系統必須顯示預約狀態
    
    Example: 顯示各種預約狀態
      Given 病患有以下預約
        | appointment_date | status      |
        | 2026-01-15       | booked      |
        | 2026-01-16       | checked_in  |
        | 2026-01-17       | completed   |
        | 2026-01-18       | no_show     |
        | 2026-01-19       | cancelled   |
      When 病患查看預約列表
      Then 顯示預約狀態如下
        | appointment_date | status      | status_label |
        | 2026-01-15       | booked      | 已預約       |
        | 2026-01-16       | checked_in  | 已報到       |
        | 2026-01-17       | completed   | 已完成       |
        | 2026-01-18       | no_show     | 未報到       |
        | 2026-01-19       | cancelled   | 已取消       |

  Rule: 系統必須顯示預約建立時間
    
    #TODO

