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
        
        const events = await getEvents(startDate, endDate);
        
        // Bereken beschikbare dagen
        const availability = calculateAvailability(events, startDate, endDate);
        
        res.json(availability);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
};

function calculateAvailability(events, startDate, endDate) {
    const available = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const hasEvent = events.some(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            return eventDate.toISOString().split('T')[0] === dateStr;
        });
        
        available.push({
            date: dateStr,
            available: !hasEvent
        });
    }
    
    return available;
}
