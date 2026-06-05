const jwt = require("jsonwebtoken");
const { verifyToken } = require("../auth/jwt");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    // Check if the error is specifically a token expiration error
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", error: err.message });
    }
    // Return 401 for other authentication errors
    res.status(401).json({ message: "Invalid token", error: err.message });
  }
};

module.exports = authMiddleware;
