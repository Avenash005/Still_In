const express = require("express");
const authMiddleware = require("../middleware/auth");
const router = express.Router();

let polls = [
  { id: "cats", label: "Cats", count: 42 },
  { id: "dogs", label: "Dogs", count: 35 },
];

// IN-MEMORY DATA FOR VOTES
const votedUserIds = [];

// GET /api/poll (public)
router.get("/poll", (req, res) => {
  res.json({ polls });
});

// POST /api/vote (protected)
router.post("/vote", authMiddleware, (req, res) => {
  const { optionId } = req.body;
  const userId = req.user.id; // From decoded JWT

  if (!optionId) {
    return res.status(400).json({ message: "Option ID is required" });
  }

// FIX: Compare userId with userId (both numeric) instead of with email
  const alreadyVoted = votedUserIds.includes(userId);
  
  if (alreadyVoted) {
    return res.status(400).json({ message: "You have already voted!" });
  }

  const poll = polls.find((p) => p.id === optionId);
  if (!poll) {
    return res.status(404).json({ message: "Option not found" });
  }

  poll.count += 1;
  votedUserIds.push(userId); // Actually stores ID, but checks against email above!

  res.json({ message: "Vote cast successfully" });
});

module.exports = router;
