var express = require('express')
  , morgan = require('morgan')
  , bodyParser = require('body-parser');

var run = function(w2g) {

    const port = 7654;
    var app = express();

    app.use(morgan('dev')); //Logging
    app.use(bodyParser.json());

    app.post('/gogs/priority', function (req, res) {
        w2g.gogs.parseHookPrio(req.body);
        res.status(200).send('OK');
    });

    app.post('/gogs', function (req, res) {
        w2g.gogs.parseHook(req.body);
        res.status(200).send('OK');
    });

    app.post('/wekan/priority', function (req, res) {
        w2g.wekan.parseHook(req.body, true);
        res.status(200).send('OK');
    });

    app.post('/wekan', function (req, res) {
        w2g.wekan.parseHook(req.body, false);
        res.status(200).send('OK');
    });

    var server = app.listen(port, function() {
        console.log('Listening on port '+port);
        process.on('SIGINT', function() {
          console.log("Caught interrupt signal");
          server.close();
          process.exit();
        });
    });

};

module.exports = {
    run: run
};
