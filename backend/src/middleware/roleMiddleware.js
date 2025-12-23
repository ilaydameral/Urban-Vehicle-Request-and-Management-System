// src/middleware/roleMiddleware.js

// authMiddleware populates req.user.role after authenticating the user.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // if authMiddleware didn't work or the role didn't come from JWT
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // To catch misuse: if no role has been assigned
    if (!allowedRoles || allowedRoles.length === 0) {
      return res
        .status(500)
        .json({ message: "No roles defined in role middleware" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
}

module.exports = requireRole;
