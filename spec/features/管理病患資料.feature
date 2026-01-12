# language: zh-TW
Feature: 管理病患資料
  作為 管理員
  為了 管理病患的基本資料與內部註記
  我想要 查看與編輯病患資料

  Rule: 可依姓名/電話/身分證搜尋病患
    
    #TODO

  Rule: 可依黑名單狀態篩選病患
    
    #TODO

  Rule: 可依 LINE 綁定狀態篩選病患
    
    #TODO

  Rule: 可編輯病患備註
    
    Example: 新增病患備註
      Given 病患 ID 為 "patient123"
      And 病患備註為 null
      And 管理員輸入備註為 "對止痛藥過敏"
      When 管理員編輯病患備註
      Then 病患備註為 "對止痛藥過敏"

    Example: 修改病患備註
      Given 病患 ID 為 "patient123"
      And 病患備註為 "對止痛藥過敏"
      And 管理員輸入備註為 "對止痛藥過敏、行動不便需協助"
      When 管理員編輯病患備註
      Then 病患備註為 "對止痛藥過敏、行動不便需協助"

  Rule: 病患備註為內部註記，病患不可見
    
    #TODO

  Rule: 可查看病患的所有預約紀錄
    
    #TODO

