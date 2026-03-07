-- ============================================
-- DATABASE DIAGNOSTIC QUERY - COMBINED VERSION
-- Run this in Supabase SQL Editor to see current state
-- ============================================

-- Single query that shows EVERYTHING
SELECT 
  '1. TABLE LIST' as section,
  table_name as name,
  '' as type,
  '' as nullable,
  '' as references
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  '2. FOLLOWS COLUMNS',
  column_name,
  data_type,
  is_nullable,
  ''
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'follows'

UNION ALL

SELECT 
  '3. CONVERSATION_PARTICIPANTS COLUMNS',
  column_name,
  data_type,
  is_nullable,
  ''
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversation_participants'

UNION ALL

SELECT 
  '4. CONVERSATIONS COLUMNS',
  column_name,
  data_type,
  is_nullable,
  ''
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'conversations'

UNION ALL

SELECT 
  '5. DIRECT_MESSAGES COLUMNS',
  column_name,
  data_type,
  is_nullable,
  ''
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'direct_messages'

UNION ALL

SELECT 
  '6. PROFILES COLUMNS',
  column_name,
  data_type,
  is_nullable,
  ''
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'

UNION ALL

SELECT 
  '7. FOREIGN KEYS',
  tc.table_name || '.' || kcu.column_name,
  '→',
  ccu.table_name || '.' || ccu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'

UNION ALL

SELECT 
  '8. RLS POLICIES',
  tablename || '.' || policyname,
  cmd::text,
  permissive,
  COALESCE(qual, 'no qual')
FROM pg_policies
WHERE schemaname = 'public'

ORDER BY section, name;

-- ============================================
-- Copy ALL the output and send it to me!
-- ============================================
