require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/callback'
);

// Start server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/auth') {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar']
    });
    
    res.writeHead(302, { Location: authUrl });
    res.end();
  } else if (parsedUrl.pathname === '/auth/callback') {
    const code = parsedUrl.query.code;
    
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('Refresh Token:', tokens.refresh_token);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Success!</h1>
        <p>Copy this refresh token to your .env.local file:</p>
        <code>${tokens.refresh_token}</code>
      `);
      
      setTimeout(() => server.close(), 5000);
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500);
      res.end('Error getting tokens');
    }
  }
});

server.listen(3000, () => {
  console.log('Go to: http://localhost:3000/auth');
});