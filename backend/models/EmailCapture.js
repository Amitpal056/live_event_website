const mongoose = require('mongoose');

const emailCaptureSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    consent: { type: Boolean, required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    capturedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmailCapture', emailCaptureSchema);
