-- Test if you're properly authenticated in Supabase
-- Run this to see what auth.uid() returns
SELECT 
  auth.uid() as my_user_id,
  auth.role() as my_role,
  current_user as pg_user;
