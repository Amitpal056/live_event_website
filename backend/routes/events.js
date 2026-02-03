const express = require('express');
const Event = require('../models/Event');
const EmailCapture = require('../models/EmailCapture');
const User = require('../models/User');

const router = express.Router();

const useMockAuth = process.env.USE_MOCK_AUTH === 'true';

const ensureAuth = async (req, res, next) => {
  if (req.user) return next();
  if (req.session && req.session.user) {
    req.user = req.session.user;
    return next();
  }
  if (useMockAuth && req.headers['x-mock-token']) {
    const email = Buffer.from(req.headers['x-mock-token'], 'base64').toString('utf8');
    const user = await User.findOne({ email });
    if (user) {
      req.user = user;
      return next();
    }
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

const buildStatusTags = (event) => {
  const tags = new Set();
  if (event.status) tags.add(event.status);
  if (event.importedAt) tags.add('imported');
  return Array.from(tags);
};

// Public events for listing
router.get('/', async (req, res) => {
  try {
    const city = req.query.city || 'Sydney';
    const events = await Event.find({
      city,
      status: { $ne: 'inactive' }
    })
      .sort({ startDate: 1, createdAt: -1 })
      .limit(200);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// Email capture for GET TICKETS
router.post('/capture-email', async (req, res) => {
  try {
    const { email, eventId, consent } = req.body;
    if (!email || !eventId || !consent) {
      return res.status(400).json({ error: 'Missing email, eventId, or consent' });
    }
    const capture = await EmailCapture.create({
      email,
      consent,
      event: eventId
    });
    return res.json({ success: true, captureId: capture.id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to capture email' });
  }
});

// Admin dashboard data
router.get('/admin', ensureAuth, async (req, res) => {
  try {
    const city = req.query.city || 'Sydney';
    const keyword = req.query.q || '';
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : null;

    const query = { city };
    if (keyword) {
      query.$or = [
        { title: new RegExp(keyword, 'i') },
        { venueName: new RegExp(keyword, 'i') },
        { description: new RegExp(keyword, 'i') }
      ];
    }

    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = dateFrom;
      if (dateTo) query.startDate.$lte = dateTo;
    }

    const events = await Event.find(query).sort({ createdAt: -1 }).limit(500);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load admin events' });
  }
});

// Manually add an event (admin)
router.post('/admin/create', ensureAuth, async (req, res) => {
  try {
    const {
      title,
      dateText,
      startDate,
      endDate,
      venueName,
      venueAddress,
      city,
      description,
      category,
      imageUrl,
      source,
      sourceUrl
    } = req.body;

    if (!title) return res.status(400).json({ error: 'Title is required' });

    const event = await Event.create({
      title,
      dateText,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      venueName,
      venueAddress,
      city: city || 'Sydney',
      description,
      category: Array.isArray(category) ? category : category ? [category] : [],
      imageUrl,
      source: source || 'Manual',
      sourceUrl,
      status: 'new',
      statusTags: ['new'],
      lastScraped: new Date()
    });

    return res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

// Import event into platform
router.post('/:id/import', ensureAuth, async (req, res) => {
  try {
    const { importNotes } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.importedAt = new Date();
    event.importedBy = req.user._id || req.user.id;
    event.importNotes = importNotes || '';
    event.statusTags = buildStatusTags(event);
    await event.save();

    return res.json({ success: true, event });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to import event' });
  }
});

module.exports = router;
