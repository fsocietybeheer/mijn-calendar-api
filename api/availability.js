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

    // DEBUG: Log alle events met hun exacte datums
    console.log('📊 Total events found:', events.length);
    events.forEach((event, index) => {
      console.log(`🔍 Event ${index + 1}:`, {
        summary: event.summary,
        start: {
          dateTime: event.start?.dateTime,
          date: event.start?.date,
          timeZone: event.start?.timeZone
        },
        end: {
          dateTime: event.end?.dateTime,
          date: event.end?.date,
          timeZone: event.end?.timeZone
        }
      });
    });

    // Bereken beschikbare dagen (verbeterde versie)
    const availability = calculateAvailability(events, startDate, endDate);

    res.json({
      success: true,
      startDate,
      endDate,
      availability,
      totalEvents: events.length,
      debug: {
        eventsProcessed: events.length,
        blockedDates: availability.filter(day => !day.available).map(day => day.date)
      }
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

  // STAP 1: Verzamel alle geblokkeerde datums van alle events
  const blockedDates = new Set();
  
  events.forEach(event => {
    if (!event.start) return;
    
    const blockedDatesForEvent = getBlockedDatesFromEvent(event);
    blockedDatesForEvent.forEach(date => blockedDates.add(date));
  });

  console.log('🚫 All blocked dates:', Array.from(blockedDates));

  // STAP 2: Loop door alle dagen tussen start en eind
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    
    available.push({
      date: dateStr,
      available: !blockedDates.has(dateStr),
      dayOfWeek: d.toLocaleDateString('nl-NL', { weekday: 'long' })
    });
  }

  return available;
}

// GEFIXTE VERSIE - EENVOUDIG EN BETROUWBAAR
function getBlockedDatesFromEvent(event) {
  const blockedDates = [];
  
  try {
    if (event.start.date) {
      // All-day event - gebruik start en end date
      // Deze zijn al in YYYY-MM-DD format en hoeven geen timezone conversie
      const startDate = event.start.date;
      const endDate = event.end.date;
      
      // Parse de datums
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T00:00:00');
      end.setDate(end.getDate() - 1); // Google Calendar end is exclusief
      
      // Genereer alle dagen
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        blockedDates.push(date.toISOString().split('T')[0]);
      }
      
      console.log(`📅 All-day event "${event.summary}": ${startDate} to ${endDate} (exclusive) -> [${blockedDates.join(', ')}]`);
      
    } else if (event.start.dateTime) {
      // Timed event - pak alleen start datum in Nederlandse tijdzone
      const startDateTime = new Date(event.start.dateTime);
      
      // Converteer naar Nederlandse datum
      const dateInNL = startDateTime.toLocaleDateString('sv-SE', { timeZone: 'Europe/Amsterdam' });
      blockedDates.push(dateInNL);
      
      console.log(`⏰ Timed event "${event.summary}": ${event.start.dateTime} -> ${dateInNL}`);
    }
    
  } catch (error) {
    console.error(`Error processing event "${event.summary}":`, error);
  }
  
  return blockedDates;
}