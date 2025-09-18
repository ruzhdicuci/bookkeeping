const mongoose = require('mongoose');

const DailySettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true }, // e.g. "2025-09"
  limit: { type: Number, required: true },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure uniqueness per user per month
DailySettingSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('DailySetting', DailySettingSchema);