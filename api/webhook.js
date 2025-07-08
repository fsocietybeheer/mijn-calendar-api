// api/webhook.js (verbeterde versie)
module.exports = async function handler(req, res) {
  // Alleen POST requests accepteren
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Google stuurt specifieke headers
    const channelId = req.headers['x-goog-channel-id'];
    const resourceId = req.headers['x-goog-resource-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const resourceUri = req.headers['x-goog-resource-uri'];

    console.log('Webhook received:', {
      channelId,
      resourceId,
      resourceState,
      resourceUri,
      body: req.body
    });

    // Verschillende event types
    switch (resourceState) {
      case 'exists':
        console.log('Calendar event created or updated');
        break;
      case 'not_exists':
        console.log('Calendar event deleted');
        break;
      case 'sync':
        console.log('Initial sync notification');
        break;
    }

    // Hier kun je je eigen logica toevoegen
    // Bijvoorbeeld: database updaten, email versturen, etc.

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};