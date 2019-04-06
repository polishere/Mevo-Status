//Install express server
const express = require('express');
const path = require('path');
const https = require('https');


const app = express();

// Serve only the static files form the dist directory
app.use(express.static(__dirname + '/dist/mevoStatus'));

app.get('/key', function(req,res) {

    https.get('https://rowermevo.pl', resp => {
        let data = '';
        resp.on('data', chunk => data += chunk)
        resp.on('end', () => {
            var key = {
                key: data.match(/locations\.js\?key=([a-z0-9A-Z]+)/)[1]
            }
            res.json(key);
        })
    })
});

app.get('/*', function(req,res) {

res.sendFile(path.join(__dirname+'/dist/<name-of-app>/index.html'));
});



// Start the app by listening on the default Heroku port
app.listen(4200);
// app.listen(process.env.PORT || 8080);