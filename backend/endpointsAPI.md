MESSAGES:
  GET /api/messages              - Get all global chat messages
  GET /api/messages/:room        - Get messages by room
  POST /api/messages             - Send new message (requires auth)
  DELETE /api/messages/:id       - Delete message (requires auth)

USERS:
  GET /api/users                 - Get all users
  GET /api/users/:userId         - Get user profile
  GET /api/users/me/profile      - Get current user profile (requires auth)
  PUT /api/users/:userId         - Update user profile (requires auth)
  GET /api/users/:userId/followers    - Get user's followers
  GET /api/users/:userId/following    - Get user's following
  POST /api/users/:userId/follow      - Follow user (requires auth)
  DELETE /api/users/:userId/follow    - Unfollow user (requires auth)

DIRECT MESSAGES:
  GET /api/direct-messages/conversations        - Get all conversations (requires auth)
  GET /api/direct-messages/:conversationId      - Get messages in conversation (requires auth)
  POST /api/direct-messages                     - Send DM (requires auth)
  DELETE /api/direct-messages/:messageId        - Delete DM (requires auth)

EVENTS:
  GET /api/events                - Get all upcoming events
  GET /api/events/:eventId       - Get single event
  POST /api/events               - Create event (requires auth)
  PUT /api/events/:eventId       - Update event (requires auth)
  DELETE /api/events/:eventId    - Delete event (requires auth)

ANNOUNCEMENTS:
  GET /api/announcements                      - Get all announcements
  GET /api/announcements/:announcementId      - Get single announcement
  POST /api/announcements                     - Create announcement (requires auth)
  PUT /api/announcements/:announcementId      - Update announcement (requires auth)
  DELETE /api/announcements/:announcementId   - Delete announcement (requires auth)

  