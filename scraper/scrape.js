const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Event = require('../backend/models/Event');

const SOURCE_LIST = [
  {
    name: 'Eventbrite',
    url: 'https://www.eventbrite.com.au/d/australia--sydney/events/'
  },
  {
    name: 'Meetup',
    url: 'https://www.meetup.com/find/?location=au--sydney&source=EVENTS'
  },
  {
    name: 'TimeOut',
    url: 'https://www.timeout.com/sydney/things-to-do'
  }
];

const safeParseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeEvent = (raw, sourceName) => {
  const startDate = safeParseDate(raw.startDate || raw.start_time || raw.date);
  const endDate = safeParseDate(raw.endDate || raw.end_time);

  return {
    title: raw.title || raw.name || '',
    dateText: raw.dateText || raw.date || raw.startDate || raw.start_time || '',
    startDate,
    endDate,
    venueName: raw.venueName || raw.venue || raw.locationName || '',
    venueAddress: raw.venueAddress || raw.locationAddress || '',
    city: 'Sydney',
    description: raw.description || raw.summary || '',
    category: raw.category ? [raw.category] : [],
    imageUrl: raw.imageUrl || raw.image || '',
    source: sourceName,
    sourceUrl: raw.sourceUrl || raw.url || ''
  };
};

const extractEventsFromJsonLd = async (page) => {
  const items = await page.$$eval('script[type="application/ld+json"]', (nodes) => {
    const results = [];
    for (const node of nodes) {
      try {
        const json = JSON.parse(node.innerText);
        const stack = Array.isArray(json) ? json : [json];
        while (stack.length) {
          const item = stack.pop();
          if (!item) continue;
          if (Array.isArray(item)) {
            stack.push(...item);
          } else if (item['@type'] === 'Event') {
            results.push(item);
          } else if (item['@graph']) {
            stack.push(item['@graph']);
          }
        }
      } catch (err) {
        // Ignore malformed JSON-LD entries
      }
    }
    return results;
  });

  return items.map((item) => {
    const location = item.location || {};
    const address = location.address || {};
    const image = Array.isArray(item.image) ? item.image[0] : item.image;

    return {
      title: item.name,
      description: item.description,
      startDate: item.startDate,
      endDate: item.endDate,
      dateText: item.startDate,
      venueName: location.name,
      venueAddress: [
        address.streetAddress,
        address.addressLocality,
        address.addressRegion,
        address.postalCode,
        address.addressCountry
      ]
        .filter(Boolean)
        .join(', '),
      imageUrl: image,
      sourceUrl: item.url
    };
  }).filter((e) => e.title);
};

const maskMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/(.*?):(.*?)@/, '//***:***@');
};

async function scrapeEvents() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing. Ensure project_assignment/.env is set.');
  }

  mongoose.set('bufferCommands', false);
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 30000 });
  console.log('MongoDB connected:', maskMongoUri(mongoUri));

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(60000);
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  const allEvents = [];

  for (const source of SOURCE_LIST) {
    try {
      await page.goto(source.url, { waitUntil: 'domcontentloaded' });
      let events = await extractEventsFromJsonLd(page);

      if (!events.length && source.name === 'Eventbrite') {
        events = await page.evaluate(() => {
          const eventElements = document.querySelectorAll('.eds-event-card-content');
          return Array.from(eventElements).map(el => ({
            title: el.querySelector('.eds-event-card__formatted-name--is-clamped')?.textContent?.trim(),
            dateText: el.querySelector('.eds-event-card__formatted-date')?.textContent?.trim(),
            venueName: el.querySelector('.eds-event-card__sub-content')?.textContent?.trim(),
            description: el.querySelector('.eds-event-card__formatted-description')?.textContent?.trim(),
            imageUrl: el.querySelector('img')?.src,
            sourceUrl: el.querySelector('a')?.href
          })).filter(e => e.title);
        });
      }

      if (!events.length && source.name === 'Meetup') {
        events = await page.evaluate(() => {
          const cards = document.querySelectorAll('a[data-event-ref]');
          return Array.from(cards).map((el) => ({
            title: el.querySelector('h2')?.textContent?.trim(),
            dateText: el.querySelector('time')?.getAttribute('datetime') || el.querySelector('time')?.textContent?.trim(),
            venueName: el.querySelector('[data-testid="event-card-venue"]')?.textContent?.trim(),
            sourceUrl: el.href
          })).filter(e => e.title);
        });
      }

      if (!events.length && source.name === 'TimeOut') {
        events = await page.evaluate(() => {
          const cards = document.querySelectorAll('article a');
          return Array.from(cards).slice(0, 20).map((el) => ({
            title: el.querySelector('h3, h2')?.textContent?.trim(),
            sourceUrl: el.href,
            imageUrl: el.querySelector('img')?.src
          })).filter(e => e.title);
        });
      }

      const normalized = events.map((e) => normalizeEvent(e, source.name));
      allEvents.push(...normalized);
    } catch (err) {
      console.error(`Failed to scrape ${source.name}:`, err.message);
    }
  }

  await browser.close();

  for (const eventData of allEvents) {
    if (!eventData.title || !eventData.sourceUrl) continue;
    const existingEvent = await Event.findOne({ source: eventData.source, sourceUrl: eventData.sourceUrl });

    if (existingEvent) {
      // Check if updated
      const isUpdated =
        existingEvent.dateText !== eventData.dateText ||
        String(existingEvent.startDate || '') !== String(eventData.startDate || '') ||
        existingEvent.venueName !== eventData.venueName ||
        existingEvent.venueAddress !== eventData.venueAddress ||
        existingEvent.description !== eventData.description ||
        existingEvent.imageUrl !== eventData.imageUrl;

      if (isUpdated) {
        existingEvent.status = 'updated';
      }
      existingEvent.lastScraped = new Date();
      Object.assign(existingEvent, eventData);
      existingEvent.statusTags = [
        ...new Set([existingEvent.status, existingEvent.importedAt ? 'imported' : null].filter(Boolean))
      ];
      await existingEvent.save();
    } else {
      // New event
      const newEvent = new Event({
        ...eventData,
        city: 'Sydney',
        status: 'new',
        lastScraped: new Date(),
        statusTags: ['new']
      });
      await newEvent.save();
    }
  }

  // Mark old events as inactive
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago

  await Event.updateMany(
    { lastScraped: { $lt: cutoffDate }, status: { $ne: 'inactive' } },
    { status: 'inactive', statusTags: ['inactive'] }
  );

  console.log('Scraping completed');
  process.exit();
}

scrapeEvents().catch(console.error);
