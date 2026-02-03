import React, { useState } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const EmailCaptureModal = ({ event, onClose }) => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) {
      setError('Please confirm consent to continue.');
      return;
    }

    // Send to backend
    await fetch(`${API_BASE}/api/events/capture-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, eventId: event._id, consent })
    });

    // Redirect to original URL
    window.location.href = event.sourceUrl;
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Get Tickets for {event.title}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            I agree to receive updates
          </label>
          {error && <span className="error">{error}</span>}
          <button type="submit" disabled={!consent}>Continue</button>
        </form>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default EmailCaptureModal;
