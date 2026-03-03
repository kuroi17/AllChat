-- Sample Data for Testing Dynamic Features
-- Run this in Supabase SQL Editor AFTER running database_migration.sql

-- 1. Insert sample campus events
INSERT INTO campus_events (title, description, event_date, location) VALUES
('Hackathon 2024', 'Join us for 48 hours of building, learning, and free snacks! Teams will compete for amazing prizes.', '2026-03-15 09:00:00+00', 'Engineering Building - Main Hall'),
('Career Fair Spring 2026', 'Meet with top companies and explore internship opportunities', '2026-03-20 10:00:00+00', 'Student Center'),
('Tech Talk: AI in Education', 'Guest speaker from Google discussing the future of AI', '2026-03-25 14:00:00+00', 'Auditorium A');

-- 2. Insert sample announcements
INSERT INTO announcements (title, content) VALUES
('New Coffee Shop Opening', 'A new coffee shop is opening in the Engineering wing next Monday! Grand opening discounts available.'),
('Library Hours Extended', 'The library will now stay open until midnight during finals week. Extra study rooms available.'),
('Campus WiFi Maintenance', 'Campus WiFi will be down for maintenance on Saturday, March 8th from 2-4 AM.');

-- 3. Update some profiles to show "online" status (optional - for testing)
-- Replace USER_ID_HERE with actual user IDs from your profiles table
UPDATE profiles 
SET last_seen = NOW() 
WHERE id IN (
  SELECT id FROM profiles LIMIT 3
);

-- 4. To test following: Follow some users (run after replacing with real user IDs)
-- Get your user ID from Authentication > Users in Supabase Dashboard
-- Example:
-- INSERT INTO follows (follower_id, following_id) VALUES
-- ('your-user-id-here', 'other-user-id-here');

-- 5. Check what data you have
SELECT 'Campus Events' as table_name, COUNT(*) as count FROM campus_events
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcements
UNION ALL
SELECT 'Online Users (last 5 min)', COUNT(*) FROM profiles WHERE last_seen > NOW() - INTERVAL '5 minutes'
UNION ALL
SELECT 'Total Profiles', COUNT(*) FROM profiles;

-- DONE! Your database now has sample data for testing.
