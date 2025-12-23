// src/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // verify Token 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Does the user exist in the database, is active, and is their role up-to-date?
    const user = await User.findById(decoded.userId).select("_id email role isActive");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Admin account blocking
    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is inactive" });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    };

    return next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
