const express = require("express");
const router = express.Router();
const DailySetting = require("../models/DailySetting");
const auth = require("../authMiddleware");

// ✅ GET daily setting (fetch limit for logged-in user)
router.get("/", auth, async (req, res) => {
  try {
    const doc = await DailySetting.findOne({ userId: req.user.id });
    res.json(doc || { limit: null });
  } catch (err) {
    console.error("❌ Error loading daily setting:", err);
    res.status(500).json({ error: "Failed to load daily setting" });
  }
});

// ✅ POST/UPDATE daily setting (save limit for logged-in user)
router.post("/", auth, async (req, res) => {
  try {
    const { limit } = req.body;
    const doc = await DailySetting.findOneAndUpdate(
      { userId: req.user.id },
      { limit, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    console.error("❌ Error saving daily setting:", err);
    res.status(500).json({ error: "Failed to save daily setting" });
  }
});

module.exports = router;