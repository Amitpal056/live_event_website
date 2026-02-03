import React from 'react';

const EventList = ({ events, renderEvent }) => {
  if (!events.length) {
    return <div className="empty-state">No events found yet. Check back soon.</div>;
  }

  return (
    <div className="event-list">
      {events.map((event) => renderEvent(event))}
    </div>
  );
};

export default EventList;
