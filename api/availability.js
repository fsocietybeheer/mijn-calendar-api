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
    console.log('🔍 Raw query:', req.query);
    console.log('🔍 Received startDate:', startDate);
    console.log('🔍 Received endDate:', endDate);
    
    // Fix voor als endDate een array is (routing probleem)
    if (Array.isArray(endDate)) {
      endDate = endDate[endDate.length - 1];
      console.log('🔍 Fixed endDate from array:', endDate);
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

    console.log('🔍 Calling getEvents with:', { timeMin, timeMax });

    const events = await getEvents(timeMin, timeMax);

    // VERBETERDE DEBUG: Log alle events met hun exacte datums
    console.log('📊 Total events found:', events.length);
    console.log('📊 Current server time:', new Date().toISOString());
    console.log('📊 Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    events.forEach((event, index) => {
      console.log(`\n🔍 Event ${index + 1}: "${event.summary}"`);
      console.log('  Raw start:', event.start);
      console.log('  Raw end:', event.end);
      
      if (event.start?.date) {
        console.log('  → ALL-DAY EVENT');
        console.log('  → Start date:', event.start.date);
        console.log('  → End date (exclusive):', event.end.date);
      } else if (event.start?.dateTime) {
        console.log('  → TIMED EVENT');
        console.log('  → Start dateTime:', event.start.dateTime);
        console.log('  → End dateTime:', event.end.dateTime);
        console.log('  → Start timezone:', event.start.timeZone);
      }
    });

    // Bereken beschikbare dagen (verbeterde versie)
    const availability = calculateAvailability(events, startDate, endDate);

    // EXTRA DEBUG: Toon welke dagen als bezet worden gemarkeerd
    const blockedDays = availability.filter(day => !day.available);
    console.log('\n🚫 BLOCKED DAYS SUMMARY:');
    blockedDays.forEach(day => {
      console.log(`  → ${day.date} (${day.dayOfWeek})`);
    });

    res.json({
      success: true,
      startDate,
      endDate,
      availability,
      totalEvents: events.length,
      debug: {
        eventsProcessed: events.length,
        blockedDates: availability.filter(day => !day.available).map(day => day.date),
        serverTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
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

  console.log('\n🔄 CALCULATING AVAILABILITY:');
  console.log('  Start date:', startDate);
  console.log('  End date:', endDate);

  // STAP 1: Verzamel alle geblokkeerde datums van alle events
  const blockedDates = new Set();
  
  events.forEach((event, index) => {
    if (!event.start) return;
    
    console.log(`\n📅 Processing event ${index + 1}: "${event.summary}"`);
    const blockedDatesForEvent = getBlockedDatesFromEvent(event);
    console.log(`  → Blocked dates: [${blockedDatesForEvent.join(', ')}]`);
    
    blockedDatesForEvent.forEach(date => blockedDates.add(date));
  });

  console.log('\n🚫 ALL BLOCKED DATES:', Array.from(blockedDates).sort());

  // STAP 2: Loop door alle dagen tussen start en eind
  console.log('\n📊 AVAILABILITY CALCULATION:');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const isBlocked = blockedDates.has(dateStr);
    
    console.log(`  ${dateStr}: ${isBlocked ? '🚫 BLOCKED' : '✅ AVAILABLE'}`);
    
    available.push({
      date: dateStr,
      available: !isBlocked,
      dayOfWeek: d.toLocaleDateString('nl-NL', { weekday: 'long' })
    });
  }

  return available;
}

// VOLLEDIG GEFIXTE VERSIE - Correct timezone handling
function getBlockedDatesFromEvent(event) {
  const blockedDates = [];
  
  try {
    if (event.start.date) {
      // All-day event - Google Calendar gebruikt exclusieve end-dates
      const startDate = event.start.date; // YYYY-MM-DD
      const endDate = event.end.date;     // YYYY-MM-DD (exclusief!)
      
      console.log(`    📅 All-day event processing:`);
      console.log(`      Start: ${startDate}`);
      console.log(`      End: ${endDate} (exclusive)`);
      
      // KRITIEKE FIX: Parse datums ZONDER timezone conversie
      // Door geen 'Z' toe te voegen wordt het geïnterpreteerd als lokale tijd
      const currentDate = new Date(startDate + 'T00:00:00');
      const exclusiveEndDate = new Date(endDate + 'T00:00:00');
      
      console.log(`      Parsed start: ${currentDate.toISOString()}`);
      console.log(`      Parsed end: ${exclusiveEndDate.toISOString()}`);
      
      // Loop van start tot (exclusieve) end
      while (currentDate < exclusiveEndDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        blockedDates.push(dateStr);
        console.log(`      → Blocking date: ${dateStr}`);
        
        // Ga naar volgende dag
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
    } else if (event.start.dateTime) {
      // Timed event - converteer naar Nederlandse datum
      const startDateTime = new Date(event.start.dateTime);
      
      // Converteer naar Nederlandse datum (Europe/Amsterdam timezone)
      const dateInNL = startDateTime.toLocaleDateString('sv-SE', { 
        timeZone: 'Europe/Amsterdam' 
      });
      blockedDates.push(dateInNL);
      
      console.log(`    ⏰ Timed event: ${event.start.dateTime} -> ${dateInNL}`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing event "${event.summary}":`, error);
  }
  
  return blockedDates;
}