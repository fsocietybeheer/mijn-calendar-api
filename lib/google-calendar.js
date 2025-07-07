const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function getEvents(startDate, endDate) {
  try {
    // Converteer datums naar RFC3339 format
    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();
    
    console.log('Requesting events from:', timeMin, 'to:', timeMax);
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items;
  } catch (error) {
    console.error('Error fetching events:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
}

async function createEvent(eventData) {
  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: eventData,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
}

module.exports = { getEvents, createEvent };