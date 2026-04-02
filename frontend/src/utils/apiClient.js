import { supabase } from "./supabase";
import { API_BASE_URL } from "./runtimeConfig";

// API client for backend communication
// Helper function to get auth token
const getToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token;
};

// Fetch messages
export async function fetchMessages(room = "general") {
  const response = await fetch(`${API_BASE_URL}/api/messages/${room}`);
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
}

// Send message
export async function sendMessage(content, room = "general") {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, room }),
  });
  if (!response.ok) throw new Error("Failed to send message");
  return response.json();
}

// Fetch all users
export async function fetchUsers() {
  const response = await fetch(`${API_BASE_URL}/api/users`);
  if (!response.ok) throw new Error("Failed to fetch users");
  return response.json();
}

// Fetch user profile
export async function fetchUserProfile(userId) {
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
  if (!response.ok) throw new Error("Failed to fetch user profile");
  return response.json();
}

// Update user profile
export async function updateUserProfile(userId, updates) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
}

// Follow user
export async function followUser(userId) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to follow user");
  return response.json();
}

// Unfollow user
export async function unfollowUser(userId) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/users/${userId}/follow`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error("Failed to unfollow user");
  return response.json();
}

// Fetch events
export async function fetchEvents() {
  const response = await fetch(`${API_BASE_URL}/api/events`);
  if (!response.ok) throw new Error("Failed to fetch events");
  return response.json();
}

// Create event
export async function createEvent(eventData) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });
  if (!response.ok) throw new Error("Failed to create event");
  return response.json();
}

// Fetch announcements
export async function fetchAnnouncements() {
  const response = await fetch(`${API_BASE_URL}/api/announcements`);
  if (!response.ok) throw new Error("Failed to fetch announcements");
  return response.json();
}

// Create announcement
export async function createAnnouncement(announcementData) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/announcements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(announcementData),
  });
  if (!response.ok) throw new Error("Failed to create announcement");
  return response.json();
}

// Fetch DM conversations
export async function fetchDMConversations() {
  const token = await getToken();
  const response = await fetch(
    `${API_BASE_URL}/api/direct-messages/conversations`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) throw new Error("Failed to fetch conversations");
  return response.json();
}

// Fetch DM messages in conversation
export async function fetchDMMessages(conversationId) {
  const token = await getToken();
  const response = await fetch(
    `${API_BASE_URL}/api/direct-messages/${conversationId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!response.ok) throw new Error("Failed to fetch DM messages");
  return response.json();
}

// Send DM
export async function sendDirectMessage(
  conversationId,
  content,
  imageUrl = null,
) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/api/direct-messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      conversationId,
      content,
      imageUrl,
    }),
  });
  if (!response.ok) throw new Error("Failed to send DM");
  return response.json();
}
