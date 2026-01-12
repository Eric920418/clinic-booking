# language: zh-TW
Feature: 併發預約控制
  作為 系統
  為了 防止時段超額預約
  我想要 使用資料庫層級鎖定處理併發請求

  Rule: 使用 Row-Level Lock 鎖定時段記錄
    
    #TODO

  Rule: 先取得鎖定者預約成功
    
    Example: 第一位用戶取得鎖定成功預約
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 5
      And 診療類型為 "內科"
      And 內科所需分鐘數為 5
      And 病患 A 與病患 B 同時發送預約請求
      And 病患 A 先取得時段鎖定
      When 病患 A 建立預約
      Then 病患 A 預約成功
      And 時段剩餘分鐘數為 0

  Rule: 後取得鎖定者檢查時段餘量不足則失敗
    
    Example: 第二位用戶因餘量不足失敗
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 5
      And 診療類型為 "內科"
      And 內科所需分鐘數為 5
      And 病患 A 與病患 B 同時發送預約請求
      And 病患 A 先取得時段鎖定並預約成功
      And 時段剩餘分鐘數已更新為 0
      When 病患 B 取得鎖定並檢查餘量
      Then 病患 B 預約失敗

  Rule: 交易失敗時必須回滾所有變更
    
    #TODO

  Rule: 時段餘量不足時返回錯誤訊息與替代選項
    
    Example: 衝突時提供同一時段其他醫師的可用選項
      Given 時段 ID 為 "slot123"
      And 時段剩餘分鐘數為 5
      And 醫師 A 的時段 "slot123"
      And 同一時段醫師 B 的時段 "slot456" 剩餘分鐘數為 10
      And 診療類型為 "內科"
      And 內科所需分鐘數為 5
      And 病患發送預約請求到醫師 A
      When 預約因餘量不足失敗
      Then 返回錯誤訊息 "時段已滿"
      And 返回替代選項包含醫師 B 的時段 "slot456"
