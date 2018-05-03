var express = require('express');
var app = express();
var helmet = require('helmet');
var request = require('request');
require('dotenv').config();

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

app.listen(process.env.PORT || 3000);