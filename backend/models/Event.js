const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    dateText: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    venueName: { type: String },
    venueAddress: { type: String },
    city: { type: String, index: true, default: 'Sydney' },
    description: { type: String },
    category: [{ type: String }],
    imageUrl: { type: String },
    source: { type: String },
    sourceUrl: { type: String },
    lastScraped: { type: Date },
    status: {
      type: String,
      enum: ['new', 'updated', 'inactive'],
      default: 'new'
    },
    statusTags: [{ type: String }],
    importedAt: { type: Date },
    importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    importNotes: { type: String }
  },
  { timestamps: true }
);

eventSchema.index({ source: 1, sourceUrl: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Event', eventSchema);
