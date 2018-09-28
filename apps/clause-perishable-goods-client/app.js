var express = require('express');
var app = express();
var helmet = require('helmet');
var request = require('request');
const WebSocket = require('ws');
const http = require('http');
const ReconnectingWebSocket = require('reconnecting-websocket');

require('dotenv').config();
var server = http.createServer(app);

// The number of milliseconds in one day
var oneDay = 86400000;

app.use(helmet())

// Workaround because dotenv doesn't support Object in .env files,
// but starter kit assigns an object to the Environment Variable
let urls = process.env.REST_SERVER_URLS;
if (urls && typeof urls === 'string') {
    urls = JSON.parse(urls);
}

app.use('/api', function(req, res) {
  var url = urls['cicero-perishable-network'] +  '/api' + req.url;
  req.pipe(request(url)).pipe(res);
});
// Serve up content from public directory
app.use(express.static(__dirname + '/dist', { maxAge: oneDay }));


// WebSocket Server for the Client UI
const wss = new WebSocket.Server({ server: server });

// Send alive message
wss.on('connection', function connection(ws) {
  console.log('client connected');

  // WebSocket Client with the REST Server
  const options = {
    WebSocket: WebSocket,
    connectionTimeout: 2000,
    maxRetries: 20,
  };
  const remote = new ReconnectingWebSocket('ws'+urls['cicero-perishable-network'].substring(4),[], options);
  remote.addEventListener('message', (data) => {
    console.log(data.data);
    if(ws.readyState === 1){
      ws.send(data.data);
    }
  });

  remote.addEventListener('error', (data) => {
    console.log(data);
  });

});

server.listen(process.env.PORT || 3001);

