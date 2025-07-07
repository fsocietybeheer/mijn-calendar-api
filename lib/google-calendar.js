const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set credentials
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

async function getEvents(startDate, endDate) {
  try {
    console.log('Attempting to fetch events...');
    console.log('Start date:', startDate);
    console.log('End date:', endDate);
    
    // Check if we have required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error('Missing required Google OAuth credentials');
    }
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate,
      timeMax: endDate,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    console.log('Events fetched successfully:', response.data.items.length);
    return response.data.items;
  } catch (error) {
    console.error('Error fetching events:', error.message);
    
    // More detailed error logging
    if (error.response && error.response.data && error.response.data.error) {
      console.error('Google API Error Details:', JSON.stringify(error.response.data.error, null, 2));
    }
    
    // Check if it's an authentication error
    if (error.code === 401 || error.status === 401) {
      throw new Error('Authentication failed - refresh token may be invalid');
    }
    
    if (error.code === 403 || error.status === 403) {
      throw new Error('Permission denied - check calendar access');
    }
    
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