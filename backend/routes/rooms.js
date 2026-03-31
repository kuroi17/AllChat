const express = require("express");
const { supabase, createUserScopedClient } = require("../utils/supabase");
const { verifyToken } = require("../middleware/auth");
const bcrypt = require("bcryptjs");

const router = express.Router();

function parseLimit(value, fallback = 20, max = 100) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

const ROOM_SELECT =
  "id,title,description,location,creator_id,is_public,capacity,participant_count,status,last_updated,created_at,profiles:creator_id(username, avatar_url)";

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
      passcode,
    } = req.body;
    const createdBy = req.userId;
    const db = req.supabase || supabase;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!isPublic) {
      if (!passcode || passcode.length < 4) {
        return res
          .status(400)
          .json({ error: "Passcode must be at least 4 characters" });
      }
    }

    const passcodeHash =
      !isPublic && passcode ? await bcrypt.hash(passcode, 10) : null;

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
          passcode_hash: passcodeHash,
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
    const { passcode } = req.body || {};
    const userId = req.userId;
    const db = req.supabase || supabase;

    const { data: room, error: roomError } = await supabase
      .from("public_rooms")
      .select(
        "id,is_public,capacity,participant_count,passcode_hash,creator_id",
      )
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: "Room not found" });
    }

    if (!room.is_public) {
      if (!passcode) {
        return res.status(400).json({ error: "Passcode required" });
      }

      if (!room.passcode_hash) {
        return res.status(400).json({ error: "Room passcode not set" });
      }

      const validPasscode = await bcrypt.compare(passcode, room.passcode_hash);

      if (!validPasscode) {
        return res.status(403).json({ error: "Incorrect passcode" });
      }
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

    const { data, error } = await supabase.rpc("increment_room_participants", {
      p_room_id: roomId,
    });

    if (error) throw error;

    const participantCount =
      Array.isArray(data) && data[0] ? data[0].participant_count : null;

    // Broadcast update over Socket.IO if available
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("rooms:updated", { roomId, participantCount });
      }
    } catch (e) {
      // ignore socket errors
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
