const { getEvents } = require('../lib/google-calendar');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Fix: Convert dates to proper ISO format with timezone
    const startDateTime = new Date(startDate + 'T00:00:00.000Z').toISOString();
    const endDateTime = new Date(endDate + 'T23:59:59.999Z').toISOString();

    console.log('Fetching events from:', startDateTime, 'to:', endDateTime);

    const events = await getEvents(startDateTime, endDateTime);

    // Bereken beschikbare dagen
    const availability = calculateAvailability(events, startDate, endDate);

    res.json(availability);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch availability', details: error.message });
  }
};

function calculateAvailability(events, startDate, endDate) {
  const available = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Better approach: use a separate counter
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const hasEvent = events.some(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate.toISOString().split('T')[0] === dateStr;
    });
    
    available.push({
      date: dateStr,
      available: !hasEvent
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return available;
}