const { supabase, createUserScopedClient } = require("../utils/supabase");

// Middleware to verify Supabase JWT token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    req.userId = user.id;
    req.accessToken = token;
    req.supabase = createUserScopedClient(token);
    next();
  } catch (err) {
    res.status(500).json({ error: "Token verification failed" });
  }
};

module.exports = { verifyToken };
