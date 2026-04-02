# API Client Usage Guide

## Setup

1. Add `VITE_API_URL` to your `.env.local` file:

```
VITE_API_URL=https://allchatbackendservice.onrender.com
```

2. For production, use:
   ```
   VITE_API_URL=https://your-backend-deployed-url.com
   ```

## Usage Examples

### Fetch Global Chat Messages

```jsx
import { useEffect, useState } from "react";
import { fetchMessages } from "../utils/apiClient";

export default function GlobalChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await fetchMessages("general"); // room name
        setMessages(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, []);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        messages.map((msg) => <div key={msg.id}>{msg.content}</div>)
      )}
    </div>
  );
}
```

### Send Message

```jsx
import { sendMessage } from "../utils/apiClient";

async function handleSendMessage(content) {
  try {
    const newMessage = await sendMessage(content, "general");
    console.log("Message sent:", newMessage);
  } catch (error) {
    console.error("Failed to send message:", error);
  }
}
```

### Fetch User Profile

```jsx
import { fetchUserProfile } from "../utils/apiClient";

useEffect(() => {
  async function loadProfile() {
    try {
      const profile = await fetchUserProfile(userId);
      setProfile(profile);
    } catch (error) {
      console.error(error);
    }
  }

  loadProfile();
}, [userId]);
```

### Follow User

```jsx
import { followUser } from "../utils/apiClient";

async function handleFollow(userIdToFollow) {
  try {
    await followUser(userIdToFollow);
    console.log("Followed!");
  } catch (error) {
    console.error("Failed to follow:", error);
  }
}
```

### Create Event

```jsx
import { createEvent } from "../utils/apiClient";

async function handleCreateEvent(eventData) {
  try {
    const newEvent = await createEvent({
      title: "Campus Meetup",
      description: "Join us for...",
      eventDate: "2026-03-20T10:00:00Z",
      location: "Student Center",
    });
    console.log("Event created:", newEvent);
  } catch (error) {
    console.error("Failed to create event:", error);
  }
}
```

### Fetch Direct Messages

```jsx
import { fetchDMMessages } from "../utils/apiClient";

useEffect(() => {
  async function loadDMs() {
    try {
      const messages = await fetchDMMessages(conversationId);
      setDMMessages(messages);
    } catch (error) {
      console.error(error);
    }
  }

  loadDMs();
}, [conversationId]);
```

## Error Handling

All API calls throw errors if the request fails. Always wrap them in try-catch:

```jsx
try {
  const data = await fetchMessages("general");
  // handle success
} catch (error) {
  console.error("API Error:", error.message);
  // handle error, show user message, etc.
}
```

## Authentication

The `apiClient` automatically adds the Supabase auth token to all requests that require authentication (marked with `verifyToken` in the backend).

Make sure your Supabase session is active before making authenticated requests.
