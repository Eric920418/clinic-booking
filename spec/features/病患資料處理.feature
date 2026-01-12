# language: zh-TW
Feature: 病患資料處理
  作為 病患
  為了 完成預約
  我想要 輸入或更新個人資料

  Rule: 姓名必須為 2-20 字元
    
    Example: 1 字元姓名無效
      Given 姓名為 "王"
      When 病患提交個人資料
      Then 操作失敗

    Example: 2 字元姓名有效
      Given 姓名為 "王明"
      When 病患提交個人資料
      Then 個人資料被儲存

    Example: 20 字元姓名有效
      Given 姓名為 "王明德王明德王明德王明德王明德"
      When 病患提交個人資料
      Then 個人資料被儲存

    Example: 21 字元姓名無效
      Given 姓名為 "王明德王明德王明德王明德王明德王"
      When 病患提交個人資料
      Then 操作失敗

  Rule: 電話必須為台灣手機格式
    
    Example: 正確的台灣手機格式
      Given 電話為 "0912345678"
      When 病患提交個人資料
      Then 個人資料被儲存

    Example: 不符合台灣手機格式
      Given 電話為 "0212345678"
      When 病患提交個人資料
      Then 操作失敗

  Rule: 身分證字號必須符合台灣身分證格式
    
    Example: 正確的身分證格式（格式+檢查碼+縣市+性別）
      Given 身分證字號為 "A123456789"
      When 病患提交個人資料
      Then 個人資料被儲存

    Example: 格式錯誤（非1個英文+9個數字）
      Given 身分證字號為 "AB12345678"
      When 病患提交個人資料
      Then 操作失敗

    Example: 首字母非有效縣市代碼
      Given 身分證字號為 "X123456789"
      When 病患提交個人資料
      Then 操作失敗

    Example: 性別碼錯誤（第2碼非1或2）
      Given 身分證字號為 "A323456789"
      When 病患提交個人資料
      Then 操作失敗

    Example: 檢查碼錯誤
      Given 身分證字號為 "A123456788"
      When 病患提交個人資料
      Then 操作失敗

  Rule: 出生年月日不可為未來日期
    
    Example: 未來日期無效
      Given 出生年月日為 "2027-01-01"
      And 當前日期為 "2026-01-15"
      When 病患提交個人資料
      Then 操作失敗

    Example: 過去日期有效
      Given 出生年月日為 "1990-01-01"
      And 當前日期為 "2026-01-15"
      When 病患提交個人資料
      Then 個人資料被儲存

  Rule: 以 LINE User ID + 身分證字號作為唯一識別
    
    Example: 首次預約建立新病患資料
      Given LINE User ID 為 "U1234567890abcdef"
      And 身分證字號為 "A123456789"
      And 系統中不存在該 LINE User ID 與身分證字號組合
      When 病患提交個人資料
      Then 建立新病患記錄

    Example: 回診自動帶入歷史資料
      Given LINE User ID 為 "U1234567890abcdef"
      And 身分證字號為 "A123456789"
      And 系統中存在該 LINE User ID 與身分證字號組合
      And 歷史姓名為 "王明德"
      And 歷史電話為 "0912345678"
      When 病患進入個人資料頁面
      Then 姓名欄位預填 "王明德"
      And 電話欄位預填 "0912345678"

