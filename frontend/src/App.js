import React, { useEffect, useMemo, useState } from 'react';
import EventList from './components/EventList';
import EventCard from './components/EventCard';
import EmailCaptureModal from './components/EmailCaptureModal';
import Dashboard from './components/Dashboard';
import './styles.css';

const DEFAULT_CITY = 'Sydney';
const API_BASE = process.env.REACT_APP_API_BASE || '';

const formatDate = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const App = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState('list');
  const [user, setUser] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/events?city=${encodeURIComponent(DEFAULT_CITY)}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('mockToken');
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: token ? { 'x-mock-token': token } : {}
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setUser(null);
    }
  };

  useEffect(() => {
    fetchEvents();
    checkAuth();
  }, []);

  const heroStats = useMemo(() => {
    const withDates = events.filter((e) => e.startDate);
    const nextEvent = withDates.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
    return {
      total: events.length,
      nextDate: nextEvent ? formatDate(nextEvent.startDate) : 'TBA'
    };
  }, [events]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">SYD</span>
          <div>
            <h1>City Signal</h1>
            <p>Live events in Sydney, curated from public sources.</p>
          </div>
        </div>
        <nav className="nav">
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            Events
          </button>
          <button
            className={view === 'dashboard' ? 'active' : ''}
            onClick={() => setView('dashboard')}
          >
            Dashboard
          </button>
        </nav>
      </header>

      {view === 'list' && (
        <>
          <section className="hero">
            <div>
              <h2>Plan something unforgettable this week.</h2>
              <p>
                Auto-scraped from trusted sources. Updated continuously. Freshly tagged.
              </p>
            </div>
            <div className="hero-stats">
              <div>
                <span className="stat-label">Events live</span>
                <strong>{heroStats.total}</strong>
              </div>
              <div>
                <span className="stat-label">Next highlight</span>
                <strong>{heroStats.nextDate}</strong>
              </div>
            </div>
          </section>

          <section className="content">
            {loading && <div className="empty-state">Loading events…</div>}
            {!loading && (
              <EventList
                events={events}
                renderEvent={(event) => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onTickets={() => setSelectedEvent(event)}
                  />
                )}
              />
            )}
          </section>
        </>
      )}

      {view === 'dashboard' && (
        <Dashboard user={user} onAuthChange={checkAuth} />
      )}

      {selectedEvent && (
        <EmailCaptureModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
};

export default App;
