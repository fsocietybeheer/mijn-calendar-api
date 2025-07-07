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
    
    // ADD DEBUG LOGGING
    console.log('Received startDate:', startDate);
    console.log('Received endDate:', endDate);
    console.log('startDate type:', typeof startDate);
    console.log('endDate type:', typeof endDate);
    
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Test if dates are valid
    const testStartDate = new Date(startDate);
    const testEndDate = new Date(endDate);
    
    console.log('Parsed startDate:', testStartDate);
    console.log('Parsed endDate:', testEndDate);
    console.log('startDate isValid:', !isNaN(testStartDate.getTime()));
    console.log('endDate isValid:', !isNaN(testEndDate.getTime()));
    
    if (isNaN(testStartDate.getTime()) || isNaN(testEndDate.getTime())) {
      res.status(400).json({ error: 'Invalid date format' });
      return;
    }

    const events = await getEvents(startDate, endDate);
    console.log('Events retrieved:', events.length);

    // Calculate available days
    const availability = calculateAvailability(events, startDate, endDate);

    res.json(availability);
  } catch (error) {
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch availability', details: error.message });
  }
};

function calculateAvailability(events, startDate, endDate) {
  const available = [];
  
  console.log('calculateAvailability called with:', { startDate, endDate });
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  console.log('Parsed dates in function:', { start, end });
  
  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid dates in calculateAvailability');
    throw new Error('Invalid date values');
  }
  
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    console.log('Processing date:', currentDate);
    
    const dateStr = currentDate.toISOString().split('T')[0];
    console.log('Date string:', dateStr);
    
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
  
  console.log('Final availability:', available);
  return available;
}