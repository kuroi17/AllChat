# Database Files

## Main Files (Use These)

### `database_setup.sql`

**The main database migration file.** Run this to set up all tables, RLS policies, and indexes.

This file includes:

- Profiles table with `last_seen` column
- Follows table (composite primary key)
- Conversations and conversation_participants tables (composite primary key)
- Direct messages table
- Campus events and announcements tables
- Comprehensive RLS policies
- All necessary indexes

### `database_diagnostic.sql`

**Database inspection tool.** Run this to see:

- All tables and columns
- Foreign key relationships
- RLS policies
- Current indexes

Useful for debugging and understanding the current database state.

### `sample_data.sql`

**Sample data for testing.** Optional file to populate the database with test data.

## How to Setup

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste `database_setup.sql`
3. Run the query
4. (Optional) Run `sample_data.sql` to add test data

## Troubleshooting

If you encounter issues:

1. Run `database_diagnostic.sql` to inspect current state
2. Check the output for missing tables or policies
3. Re-run `database_setup.sql` (it's idempotent with IF NOT EXISTS checks)
