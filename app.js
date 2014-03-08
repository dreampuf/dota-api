var express = require('express'),
    http = require('http'),
    path = require('path'),
    util = require("util"),
    Steam = require("./MatchProvider-steam").MatchProvider,
    config = require("./config");

var app = express(),
    steam = new Steam(
        config.steam_user,
        config.steam_pass,
        config.steam_name,
        config.steam_guard_code,
        config.cwd,
        config.steam_response_timeout),
    data_cache = {};

// all environments
app.set('port', 8001);
app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
// if ('development' == app.get('env')) {
//   app.use(express.errorHandler());
// }

app.get('/', function(req, res){
  res.send("Hello World");
});

app.get("/api/matchurl", function(req, res) {
    var matchId = req.query.matchid;
    if (!matchId) {
        res.json({ error: 'need [matchid]' });
        res.end();
    }

    if (isNaN(matchId) || parseInt(matchId, 10) > 1024000000000) {
        res.json({
            error: "invalid [matchid]"
        });
        res.end();
    }

    matchId = parseInt(matchId, 10);
    data = data_cache[matchId];
    if (data) {
        res.json({
            matchid: matchId,
            replayState: data.state,
            replayUrl: util.format("http://replay%s.valve.net/570/%s_%s.dem.bz2", data.cluster, data.id, data.salt)
        });
        res.end();
    }
    
    if (!steam.ready) {
      res.json({
        error: "steam not ready",
      });
      res.end();
    }

    steam.getMatchDetails(matchId, function(err, data) {
        if (err) {
            res.json({
                error: err
            });
            res.end();
        }
        else {
            data_cache[matchId] = data;

            res.json({
                matchid: matchId,
                replayState: data.state,
                replayUrl: util.format("http://replay%s.valve.net/570/%s_%s.dem.bz2", data.cluster, data.id, data.salt)
            });
            res.end();
        }
    });

    // If Dota hasn't responded by 'request_timeout' then send a timeout page.
    setTimeout(function(){
        res.json({
            error: "timeout"
        });
        res.end();
    }, config.request_timeout);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
