/**
 * CarbonScoreX Backend Server
 * Entry point for Express + WebSocket server
 */
require('dotenv').config();
const app = require('./src/app');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server, path: '/ws' });

// Track connected clients
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = req.headers['sec-websocket-key'];
  clients.set(clientId, ws);
  
  console.log(`WebSocket client connected: ${clientId}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
      
      // Handle different message types
      if (data.type === 'subscribe') {
        ws.companyId = data.companyId;
        ws.send(JSON.stringify({ 
          type: 'subscribed', 
          companyId: data.companyId 
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast function for real-time updates
global.broadcastUpdate = (companyId, updateType, data) => {
  const message = JSON.stringify({
    type: updateType,
    companyId,
    data,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && 
        (client.companyId === companyId || !client.companyId)) {
      client.send(message);
    }
  });
};

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('CarbonScoreX Backend Server');
  console.log('='.repeat(60));
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(`✓ WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});