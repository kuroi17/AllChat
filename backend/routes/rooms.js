const express = require("express");
const { supabase, createUserScopedClient } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");
const crypto = require("crypto");

const router = express.Router();

function parseLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

const ROOM_SELECT =
  "id,title,description,location,creator_id,is_public,capacity,participant_count,status,last_updated,created_at,avatar_url,profiles:creator_id(username, avatar_url)";

async function postRoomJoinMessage({
  db,
  io,
  roomId,
  userId,
  joinerName,
  isPublic,
  invitedByName,
}) {
  const safeJoiner = joinerName || "User";
  const safeInviter = invitedByName || "";
  const inviteSuffix =
    !isPublic && safeInviter ? ` Invited by ${safeInviter}.` : "";
  const content = `${safeJoiner} joined the ${isPublic ? "room chat" : "chat"}.${inviteSuffix}`;

  const { data: inserted, error } = await db
    .from("messages")
    .insert([
      {
        user_id: userId,
        content,
        room: `room:${roomId}`,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  if (io && inserted) {
    io.to(`room:room:${roomId}`).emit("message:new", inserted);
  }
}

async function resolveOptionalAuth(req) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    const err = new Error("Invalid token");
    err.status = 401;
    throw err;
  }

  return {
    userId: user.id,
    userClient: createUserScopedClient(token),
  };
}

// GET public rooms (limited)
router.get("/", async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit, 20, 200);
    const authContext = await resolveOptionalAuth(req);
    const db = authContext?.userClient || supabase;

    const { data, error } = await db
      .from("public_rooms")
      .select(ROOM_SELECT)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const rooms = Array.isArray(data) ? data : [];

    if (!authContext?.userId) {
      return res.json(rooms);
    }

    const { data: memberships, error: membershipError } = await db
      .from("room_members")
      .select("room_id")
      .eq("user_id", authContext.userId);

    if (membershipError) throw membershipError;

    const joinedIds = new Set(
      (Array.isArray(memberships) ? memberships : []).map(
        (item) => item.room_id,
      ),
    );

    const enriched = rooms.map((room) => ({
      ...room,
      is_member:
        joinedIds.has(room.id) || room.creator_id === authContext.userId,
    }));

    res.json(enriched);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// GET rooms joined by current user
router.get("/joined", verifyToken, async (req, res) => {
  try {
    const db = req.supabase || supabase;

    const { data, error } = await db
      .from("room_members")
      .select(`room:room_id(${ROOM_SELECT})`)
      .eq("user_id", req.userId)
      .order("joined_at", { ascending: false });

    if (error) throw error;

    const rooms = (Array.isArray(data) ? data : [])
      .map((row) => row.room)
      .filter(Boolean)
      .map((room) => ({ ...room, is_member: true }));

    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET invite preview (limited info)
router.get("/invites/:token/preview", async (req, res) => {
  try {
    const { token } = req.params;
    const authContext = await resolveOptionalAuth(req);

    let preview = null;

    try {
      const { data, error } = await supabase.rpc("get_room_invite_preview", {
        p_token: token,
      });
      if (!error) {
        preview = Array.isArray(data) ? data[0] : data;
      }
    } catch (rpcError) {
      // Fallback to direct lookup when RPC is unavailable.
    }

    if (preview) {
      let isMember = false;
      if (authContext?.userId && preview.room_id) {
        const { data: membership } = await authContext.userClient
          .from("room_members")
          .select("room_id")
          .eq("room_id", preview.room_id)
          .eq("user_id", authContext.userId)
          .maybeSingle();
        isMember = !!membership;
      }

      return res.json({
        id: preview.room_id,
        title: preview.title,
        description: preview.description,
        is_public: preview.is_public,
        participant_count: preview.participant_count,
        capacity: preview.capacity,
        avatar_url: preview.avatar_url,
        invite_token: preview.token,
        is_member: isMember,
      });
    }

    const { data: invite, error: inviteError } = await supabase
      .from("room_invites")
      .select("room_id, revoked")
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !invite || invite.revoked) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const { data: room, error: roomError } = await supabase
      .from("public_rooms")
      .select(
        "id,title,description,is_public,participant_count,capacity,avatar_url",
      )
      .eq("id", invite.room_id)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const limitedDescription = room.is_public ? room.description : null;
    let isMember = false;
    if (authContext?.userId) {
      const { data: membership } = await authContext.userClient
        .from("room_members")
        .select("room_id")
        .eq("room_id", room.id)
        .eq("user_id", authContext.userId)
        .maybeSingle();
      isMember = !!membership;
    }

    res.json({
      ...room,
      description: limitedDescription,
      invite_token: token,
      is_member: isMember,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a room via invite token
router.post("/invites/:token/join", verifyToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;
    let inviteRoomId = null;
    let invitedByName = "";

    try {
      const { data, error } = await supabase.rpc("get_room_invite_preview", {
        p_token: token,
      });
      if (!error) {
        const preview = Array.isArray(data) ? data[0] : data;
        if (preview?.room_id) {
          inviteRoomId = preview.room_id;
        }
        if (preview?.invited_by_username) {
          invitedByName = preview.invited_by_username;
        }
      }
    } catch (rpcError) {
      // Fallback to direct lookup when RPC is unavailable.
    }

    if (!inviteRoomId) {
      const { data: invite, error: inviteError } = await supabase
        .from("room_invites")
        .select("room_id, revoked")
        .eq("token", token)
        .maybeSingle();

      if (inviteError || !invite || invite.revoked) {
        return res.status(404).json({ error: "Invite not found" });
      }

      inviteRoomId = invite.room_id;
    }

    const { data: room, error: roomError } = await supabase
      .from("public_rooms")
      .select("id,capacity,participant_count,creator_id")
      .eq("id", inviteRoomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const { data: existingMember, error: memberError } = await db
      .from("room_members")
      .select("room_id")
      .eq("room_id", inviteRoomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) throw memberError;

    if (existingMember || room.creator_id === userId) {
      return res.json({
        participantCount: room.participant_count,
        alreadyMember: true,
        roomId: inviteRoomId,
      });
    }

    if (room.capacity && room.participant_count >= room.capacity) {
      return res.status(409).json({ error: "Room is full" });
    }

    const { error: insertError } = await db.from("room_members").insert([
      {
        room_id: inviteRoomId,
        user_id: userId,
      },
    ]);

    if (insertError) throw insertError;

    const { data: updatedRoom, error: countError } = await supabase
      .from("public_rooms")
      .select("participant_count")
      .eq("id", inviteRoomId)
      .single();

    if (countError) throw countError;

    const participantCount = updatedRoom?.participant_count ?? null;

    try {
      const { data: joinerProfile } = await db
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      const io = req.app.get("io");
      await postRoomJoinMessage({
        db,
        io,
        roomId: inviteRoomId,
        userId,
        joinerName: joinerProfile?.username || "User",
        isPublic: false,
        invitedByName,
      });
    } catch (messageError) {
      // Do not block join on message failures
      console.error("[Rooms] Failed to post join message:", messageError);
    }

    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("rooms:updated", {
          roomId: inviteRoomId,
          participantCount,
        });
      }
    } catch (e) {
      // ignore socket errors
    }

    res.json({
      participantCount,
      alreadyMember: false,
      roomId: inviteRoomId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create or fetch an invite token for a room
router.post("/:roomId/invites", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    const { data: membership, error: membershipError } = await db
      .from("room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    if (!membership) {
      return res.status(403).json({ error: "Not a room member" });
    }

    const { data: existingInvite, error: inviteError } = await db
      .from("room_invites")
      .select("token, revoked")
      .eq("room_id", roomId)
      .eq("revoked", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inviteError) throw inviteError;

    if (existingInvite?.token) {
      return res.json({ token: existingInvite.token, roomId });
    }

    const token = crypto.randomUUID();

    const { data, error } = await db
      .from("room_invites")
      .insert([
        {
          token,
          room_id: roomId,
          created_by: userId,
        },
      ])
      .select("token")
      .single();

    if (error) throw error;

    res.json({ token: data.token, roomId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET room preview (limited info)
router.get("/:roomId/preview", async (req, res) => {
  try {
    const { roomId } = req.params;
    const authContext = await resolveOptionalAuth(req);
    const db = authContext?.userClient || supabase;

    const { data: room, error } = await db
      .from("public_rooms")
      .select(
        "id,title,description,is_public,participant_count,capacity,avatar_url,creator_id",
      )
      .eq("id", roomId)
      .single();

    if (error || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    let isMember = false;

    if (authContext?.userId) {
      const { data: membership } = await db
        .from("room_members")
        .select("room_id")
        .eq("room_id", roomId)
        .eq("user_id", authContext.userId)
        .maybeSingle();
      isMember = !!membership || room.creator_id === authContext.userId;
    }

    const canShowDetails = room.is_public || isMember;

    res.json({
      id: room.id,
      title: room.title,
      description: canShowDetails ? room.description : null,
      is_public: room.is_public,
      participant_count: room.participant_count,
      capacity: room.capacity,
      avatar_url: room.avatar_url,
      is_member: isMember,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single room (authenticated)
router.get("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const db = req.supabase || supabase;

    const { data, error } = await db
      .from("public_rooms")
      .select(ROOM_SELECT)
      .eq("id", roomId)
      .single();

    if (error) throw error;

    const { data: membership, error: membershipError } = await db
      .from("room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("user_id", req.userId)
      .maybeSingle();

    if (membershipError) throw membershipError;

    res.json({
      ...data,
      is_member: !!membership || data.creator_id === req.userId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a room (authenticated users)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      isPublic = true,
      capacity,
    } = req.body;
    const createdBy = req.userId;
    const db = req.supabase || supabase;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const { data, error } = await db
      .from("public_rooms")
      .insert([
        {
          title,
          description,
          location,
          is_public: !!isPublic,
          capacity: capacity || null,
          creator_id: createdBy,
        },
      ])
      .select(ROOM_SELECT);

    if (error) throw error;

    const room = data && data[0] ? data[0] : null;

    if (room) {
      try {
        await db.from("room_members").insert([
          {
            room_id: room.id,
            user_id: createdBy,
          },
        ]);
      } catch (memberError) {
        // ignore membership insert failures
      }
    }

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a room (increments participant_count atomically via RPC)
router.post("/:roomId/join", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    const { data: room, error: roomError } = await supabase
      .from("public_rooms")
      .select("id,is_public,capacity,participant_count,creator_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!room.is_public) {
      return res.status(403).json({ error: "Invite required" });
    }

    const { data: existingMember, error: memberError } = await db
      .from("room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberError) throw memberError;

    if (existingMember || room.creator_id === userId) {
      return res.json({
        participantCount: room.participant_count,
        alreadyMember: true,
      });
    }

    if (room.capacity && room.participant_count >= room.capacity) {
      return res.status(409).json({ error: "Room is full" });
    }

    const { error: insertError } = await db.from("room_members").insert([
      {
        room_id: roomId,
        user_id: userId,
      },
    ]);

    if (insertError) throw insertError;

    const { data: updatedRoom, error: countError } = await supabase
      .from("public_rooms")
      .select("participant_count")
      .eq("id", roomId)
      .single();

    if (countError) throw countError;

    const participantCount = updatedRoom?.participant_count ?? null;

    // Broadcast update over Socket.IO if available
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("rooms:updated", { roomId, participantCount });
      }
    } catch (e) {
      // ignore socket errors
    }

    try {
      const { data: joinerProfile } = await db
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      const io = req.app.get("io");
      await postRoomJoinMessage({
        db,
        io,
        roomId,
        userId,
        joinerName: joinerProfile?.username || "User",
        isPublic: true,
      });
    } catch (messageError) {
      console.error("[Rooms] Failed to post join message:", messageError);
    }

    res.json({ participantCount, alreadyMember: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET members preview for a room
router.get("/:roomId/members", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseLimit(req.query.limit, 6, 30);
    const db = req.supabase || supabase;

    const { data, error } = await db
      .from("room_members")
      .select("user_id, joined_at, profiles:user_id(username, avatar_url)")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update room avatar (owner only)
router.patch("/:roomId/avatar", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { avatarUrl } = req.body || {};
    const db = req.supabase || supabase;

    if (!avatarUrl) {
      return res.status(400).json({ error: "Missing avatarUrl" });
    }

    const { data: room, error: roomError } = await db
      .from("public_rooms")
      .select("creator_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.creator_id !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { data: updated, error } = await db
      .from("public_rooms")
      .update({ avatar_url: avatarUrl })
      .eq("id", roomId)
      .select(ROOM_SELECT)
      .single();

    if (error) throw error;

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete room (owner only)
router.delete("/:roomId", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId;
    const db = req.supabase || supabase;

    // Verify owner
    const { data: room, error: fetchError } = await db
      .from("public_rooms")
      .select("creator_id")
      .eq("id", roomId)
      .single();

    if (fetchError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (room.creator_id !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { error } = await db.from("public_rooms").delete().eq("id", roomId);
    if (error) throw error;

    res.json({ message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
