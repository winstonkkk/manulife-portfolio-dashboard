const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  // Client sends: "Authorization: Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied: no token provided" });
  }

  try {
    // Verify the token – throws if expired or invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Access denied: invalid or expired token" });
  }
}

module.exports = verifyToken;