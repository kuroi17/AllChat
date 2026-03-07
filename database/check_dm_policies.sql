-- Check current RLS policies on direct_messages table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'direct_messages'
ORDER BY policyname;
