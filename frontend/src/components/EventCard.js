import React from 'react';

const formatDate = (dateValue, fallback) => {
  if (!dateValue) return fallback || '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return fallback || '';
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const EventCard = ({ event, onTickets }) => {
  const dateLabel = formatDate(event.startDate, event.dateText);

  return (
    <article className="event-card">
      <div className="event-media">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} loading="lazy" />
        ) : (
          <div className="event-placeholder">SYD</div>
        )}
        <div className="event-tags">
          {(event.statusTags || [event.status]).filter(Boolean).map((tag) => (
            <span key={tag} className={`tag tag-${tag}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="event-body">
        <div className="event-meta">
          <span>{dateLabel || 'Date TBA'}</span>
          <span className="dot">•</span>
          <span>{event.venueName || 'Location TBA'}</span>
        </div>
        <h3>{event.title}</h3>
        <p>{event.description || 'Details will be updated soon.'}</p>
        <div className="event-footer">
          <span className="source">Source: {event.source || 'Unknown'}</span>
          <button onClick={onTickets}>GET TICKETS</button>
        </div>
      </div>
    </article>
  );
};

export default EventCard;
