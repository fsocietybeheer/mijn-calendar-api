const { createEvent, getEvents } = require('../lib/google-calendar');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { date, time, name, email, description } = req.body;
    
    if (!date || !name || !email) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if date is still available
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setDate(endOfDay.getDate() + 1);
    
    const existingEvents = await getEvents(startOfDay.toISOString(), endOfDay.toISOString());
    if (existingEvents.length > 0) {
      res.status(400).json({ error: 'Date is no longer available' });
      return;
    }

    // Create the event
    const eventTime = time && time.length > 0 ? time : "12:00";
    const eventData = {
      summary: `Booking: ${name}`,
      description: description || '',
      start: {
        dateTime: `${date}T${eventTime}:00`,
        timeZone: 'Europe/Amsterdam',
      },
      end: {
        dateTime: `${date}T${eventTime}:00`,
        timeZone: 'Europe/Amsterdam',
      },
      attendees: [{ email: email }],
    };

    const event = await createEvent(eventData);
    
    res.json({ success: true, eventId: event.id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create booking' });
  }
};
