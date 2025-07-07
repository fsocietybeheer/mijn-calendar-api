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
    let { startDate, endDate } = req.query;
    
    // Debug logging
    console.log('Raw query:', req.query);
    console.log('Received startDate:', startDate);
    console.log('Received endDate:', endDate);
    
    // Fix voor als endDate een array is (routing probleem)
    if (Array.isArray(endDate)) {
      endDate = endDate[endDate.length - 1];
      console.log('Fixed endDate from array:', endDate);
    }
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Valideer datums
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    // Zorg dat endDate na startDate komt
    if (endDateObj <= startDateObj) {
      res.status(400).json({ error: 'endDate must be after startDate' });
      return;
    }

    // Voeg tijd toe aan de datums voor de API call
    const timeMin = new Date(startDate + 'T00:00:00.000Z').toISOString();
    const timeMax = new Date(endDate + 'T23:59:59.999Z').toISOString();

    console.log('Calling getEvents with:', { timeMin, timeMax });

    const events = await getEvents(timeMin, timeMax);

    // Bereken beschikbare dagen
    const availability = calculateAvailability(events, startDate, endDate);

    res.json({
      success: true,
      startDate,
      endDate,
      availability,
      totalEvents: events.length
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch availability',
      details: error.message 
    });
  }
};

function calculateAvailability(events, startDate, endDate) {
  const available = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Loop door alle dagen tussen start en eind
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    // Check of er events zijn op deze dag
    const hasEvent = events.some(event => {
      if (!event.start) return false;
      
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate.toISOString().split('T')[0] === dateStr;
    });

    available.push({
      date: dateStr,
      available: !hasEvent,
      dayOfWeek: d.toLocaleDateString('nl-NL', { weekday: 'long' })
    });
  }

  return available;
}