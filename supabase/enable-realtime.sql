-- =============================================
-- Supabase Realtime 啟用腳本
-- 在 Supabase SQL Editor 中執行此腳本
-- =============================================

-- 1. 設置 appointments 表的 Replica Identity
-- 這是 Realtime 監聽變更所必需的
ALTER TABLE appointments REPLICA IDENTITY FULL;

-- 2. 設置 time_slots 表的 Replica Identity（用於前台即時顯示時段餘量）
ALTER TABLE time_slots REPLICA IDENTITY FULL;

-- 3. 啟用 Realtime 訂閱（在 Supabase 控制台中也可以手動啟用）
-- 注意：這個操作也可以在 Supabase Dashboard > Database > Replication 中手動完成

-- 為 appointments 表啟用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- 為 time_slots 表啟用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE time_slots;

-- =============================================
-- 驗證設置
-- =============================================

-- 檢查 Replica Identity 設置
SELECT
  c.relname AS table_name,
  CASE c.relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('appointments', 'time_slots');

-- 檢查 Publication 設置
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
