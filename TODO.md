# TODO List for Event Scraping and Display Project

## 1. Project Structure Setup
- [x] Create backend/ folder with Express server, API routes, models, and OAuth setup.
- [x] Create frontend/ folder with React app.
- [x] Create scraper/ folder with scraping scripts.
- [x] Add root-level files like README.md, .env for configs.

## 2. Backend Development
- [x] Set up Express server with MongoDB connection.
- [x] Create Event and User models.
- [x] Implement API endpoints for events, user actions (email capture), and dashboard data.
- [x] Integrate Google OAuth using Passport.js.

## 3. Scraping Implementation
- [ ] Use Puppeteer to scrape events from public sites (e.g., eventbrite, meetup).
- [ ] Store scraped data in MongoDB with auto-update logic (detect new/updated/inactive events).

## 4. Frontend Development
- [x] Build React components for event listing, event details, email capture modal.
- [x] Implement dashboard with filters (city, keyword, date), table view, preview panel, and import actions.

## 5. Integration and Testing
- [x] Connect frontend to backend APIs.
- [x] Test scraping, data display, OAuth, and dashboard functionality.
