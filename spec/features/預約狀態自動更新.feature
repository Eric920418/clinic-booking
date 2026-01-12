# language: zh-TW
Feature: 預約狀態自動更新
  作為 系統
  為了 自動管理預約狀態
  我想要 在時段結束後自動將未報到的預約更新狀態

  Rule: 當日預約時段結束後「已預約」狀態自動改為「未報到」
    
    Example: 時段結束後未報到自動更新狀態
      Given 預約 ID 為 "appt123"
      And 預約日期為 "2026-01-15"
      And 預約時段結束時間為 "10:00"
      And 預約狀態為 "booked"
      And 當前時間為 "2026-01-15 10:01"
      When 系統執行自動狀態更新
      Then 預約狀態為 "no_show"

    Example: 已報到狀態不會被更新為未報到
      Given 預約 ID 為 "appt123"
      And 預約日期為 "2026-01-15"
      And 預約時段結束時間為 "10:00"
      And 預約狀態為 "checked_in"
      And 當前時間為 "2026-01-15 10:01"
      When 系統執行自動狀態更新
      Then 預約狀態為 "checked_in"

  Rule: 未報到時病患的未報到次數加 1
    
    Example: 狀態改為未報到時累計次數
      Given 病患 ID 為 "patient123"
      And 未報到次數為 1
      And 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 系統自動將預約狀態更新為 "no_show"
      Then 未報到次數為 2

  Rule: 未報到次數達到 3 次後停止累計
    
    Example: 未報到次數達到 3 次後不再增加
      Given 病患 ID 為 "patient123"
      And 未報到次數為 3
      And 預約 ID 為 "appt456"
      And 預約狀態為 "booked"
      When 系統自動將預約狀態更新為 "no_show"
      Then 未報到次數為 3

  Rule: 黑名單狀態由批次任務檢查更新
    
    Example: 未報到次數更新後不立即設定黑名單
      Given 病患 ID 為 "patient123"
      And 未報到次數為 2
      And 預約 ID 為 "appt123"
      And 預約狀態為 "booked"
      When 系統自動將預約狀態更新為 "no_show"
      Then 未報到次數為 3
      And 病患狀態 is_blacklisted 為 false
