import React, { useCallback, useEffect, useState } from 'react';

const DEFAULT_CITY = 'Sydney';
const API_BASE = process.env.REACT_APP_API_BASE || '';

const apiFetch = (path, options = {}) => {
  const token = localStorage.getItem('mockToken');
  const authToken = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { 'x-mock-token': token } : {}),
    ...(authToken ? { 'x-auth-token': authToken } : {})
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-AU', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const Dashboard = ({ user, onAuthChange }) => {
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    city: DEFAULT_CITY,
    keyword: '',
    dateFrom: '',
    dateTo: ''
  });
  const [importNotes, setImportNotes] = useState('');
  const [authForm, setAuthForm] = useState({ email: '', displayName: '' });
  const [loading, setLoading] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startDate: '',
    venueName: '',
    city: DEFAULT_CITY,
    description: '',
    sourceUrl: ''
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        city: filters.city,
        q: filters.keyword,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });
      const res = await apiFetch(`/api/events/admin?${params.toString()}`, {
        method: 'GET'
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      setEvents(data);
      setSelected(data[0] || null);
    } catch (err) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (onAuthChange) {
      onAuthChange();
    }
  }, [onAuthChange]);

  useEffect(() => {
    if (user) loadEvents();
  }, [user, loadEvents]);

  const handleMockLogin = async (e) => {
    e.preventDefault();
    const res = await apiFetch('/api/auth/mock-login', {
      method: 'POST',
      body: JSON.stringify(authForm)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('mockToken', data.token);
      }
      await onAuthChange();
    }
  };

  const handleImport = async (event) => {
    const target = event || selected;
    if (!target) return;
    const res = await apiFetch(`/api/events/${target._id}/import`, {
      method: 'POST',
      body: JSON.stringify({ importNotes: event ? '' : importNotes })
    });
    if (res.ok) {
      await loadEvents();
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      ...newEvent,
      dateText: newEvent.startDate,
      source: 'Manual'
    };
    const res = await apiFetch('/api/events/admin/create', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      setNewEvent({
        title: '',
        startDate: '',
        venueName: '',
        city: DEFAULT_CITY,
        description: '',
        sourceUrl: ''
      });
      await loadEvents();
    }
  };

  if (!user) {
    return (
      <section className="dashboard auth-panel">
        <h2>Dashboard login</h2>
        {process.env.REACT_APP_USE_MOCK_AUTH === 'true' ? (
          <>
            <p>Mock auth is enabled for local demos.</p>
            <form onSubmit={handleMockLogin} className="auth-form">
              <input
                type="text"
                placeholder="Display name"
                value={authForm.displayName}
                onChange={(e) => setAuthForm({ ...authForm, displayName: e.target.value })}
              />
              <input
                type="email"
                placeholder="Email address"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                required
              />
              <button type="submit">Sign in</button>
            </form>
          </>
        ) : (
          <>
            <p>Sign in with Google to access the dashboard.</p>
            <a className="oauth-button" href={`${API_BASE}/api/auth/google`}>
              Continue with Google
            </a>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Admin dashboard</h2>
          <p>Review scraped events, validate, and import into the platform.</p>
        </div>
        <div className="filters">
          <input
            type="text"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
          />
          <input
            type="text"
            placeholder="Keyword"
            value={filters.keyword}
            onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
          />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
          />
          <button onClick={loadEvents}>Filter</button>
        </div>
      </div>

      <div className="manual-add">
        <h3>Add event manually</h3>
        <form onSubmit={handleCreate} className="manual-form">
          <input
            type="text"
            placeholder="Event title"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            value={newEvent.startDate}
            onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
          />
          <input
            type="text"
            placeholder="Venue"
            value={newEvent.venueName}
            onChange={(e) => setNewEvent({ ...newEvent, venueName: e.target.value })}
          />
          <input
            type="text"
            placeholder="City"
            value={newEvent.city}
            onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
          />
          <input
            type="url"
            placeholder="Source URL (optional)"
            value={newEvent.sourceUrl}
            onChange={(e) => setNewEvent({ ...newEvent, sourceUrl: e.target.value })}
          />
          <textarea
            placeholder="Short description"
            value={newEvent.description}
            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          />
          <button type="submit">Add event</button>
        </form>
      </div>

      <div className="dashboard-body">
        <div className="table">
          <div className="table-head">
            <span>Event</span>
            <span>Date</span>
            <span>Venue</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {loading && <div className="empty-state">Loading events…</div>}
          {!loading && events.map((event) => (
            <div
              key={event._id}
              className={`table-row ${selected?._id === event._id ? 'active' : ''}`}
              onClick={() => {
                setSelected(event);
                setImportNotes(event.importNotes || '');
              }}
            >
              <span>{event.title}</span>
              <span>{formatDate(event.startDate) || event.dateText || 'TBA'}</span>
              <span>{event.venueName || 'TBA'}</span>
              <span className="status-cell">
                {(event.statusTags || [event.status]).filter(Boolean).map((tag) => (
                  <span key={tag} className={`tag tag-${tag}`}>{tag}</span>
                ))}
              </span>
              <span>
                <button
                  className="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImport(event);
                  }}
                >
                  Import to platform
                </button>
              </span>
            </div>
          ))}
        </div>

        <aside className="preview">
          {selected ? (
            <>
              <h3>{selected.title}</h3>
              <p className="preview-meta">
                {formatDate(selected.startDate) || selected.dateText || 'Date TBA'} • {selected.venueName || 'Venue TBA'}
              </p>
              <p>{selected.description || 'No description provided yet.'}</p>
              <div className="preview-details">
                <span>Source: {selected.source}</span>
                <span>URL: {selected.sourceUrl}</span>
              </div>
              <textarea
                placeholder="Import notes (optional)"
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
              />
              <button onClick={() => handleImport()}>Import to platform</button>
            </>
          ) : (
            <div className="empty-state">Select an event to preview.</div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default Dashboard;
