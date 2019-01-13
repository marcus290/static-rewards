var express = require('express'),
  request = require('request'),
  exphbs = require('express-handlebars'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  session = require('express-session'),
  Handlebars = require('handlebars'),
  HandlebarsIntl = require('handlebars-intl'),
  MomentHandler = require('handlebars.moment'),
  _ = require('underscore');
  
const config = require('./config.js');


HandlebarsIntl.registerWith(Handlebars);
MomentHandler.registerHelpers(Handlebars);
Handlebars.registerHelper('eq', function(arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});
Handlebars.registerHelper('concat', function(arg1, arg2, options) {
  return arg1 + arg2;
});
Handlebars.registerHelper('in', function(elem, list, options) {
  if (list.indexOf(elem) > -1) {
    return options.fn(this);
  }
  return options.inverse(this);
});
Handlebars.registerHelper('url', function(str) {
    str = Handlebars.Utils.escapeExpression(str);

    var matches = str.match(/http\S+/);
    var wrapped = matches.map(function(v, i, a) {
        return '<a href="' + v + '">' + v + '</a>';
    });

    for (var i = 0; i < matches.length; i++) {
        str = str.replace(matches[i], wrapped[i]);
    }

    return new Handlebars.SafeString(str)
});
var app = express();


app.use(express.static('public'));
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(
  session({
    secret: config.sessionSecret,
    saveUninitialized: true,
    resave: true
  })
);


app.use(function(req, res, next) {
  var err = req.session.error,
    msg = req.session.notice,
    success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

app.locals.totalSupply = 0;
app.locals.stakingCoins = 0;

var totalNAV = 0;
var totalStaking = 0;
var yourNAV = 1000;
var yourRewards = 0;
var yourPercentRewards = 0;
var inflation = 0;

var totalBlocks = 2 * 60 * 24 * 365;
var totalRewards = 2 * totalBlocks;

function getNetworkStats() {
  var urlNAV = 'https://chainz.cryptoid.info/nav/api.dws?q=summary';
  request(
    {
      url: urlNAV,
      json: true
    },
    function(error,response,body) {
      if(!error) {
        totalNAV = parseFloat(body['nav']['supply']);
      }
    }
  );
  var urlStakes =
    'https://chainz.cryptoid.info/explorer/index.stakes.dws?coin=nav';
  var urlData = 'https://chainz.cryptoid.info/explorer/index.data.dws?coin=nav';
  var urlProposals =
    'https://navexplorer.com/api/community-fund/proposal';
  request(
    {
      url:'https://www.navexplorer.com/api/block/height',
      json: true
    },
    function(error,response,body) {
      if(!error) {
        blockheight = body;
        blockperiod = body % 20160;
      }
    }
  );
  request(
    {
      url: urlStakes,
      json: true
    },
    function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var total = 0;
        for (var s in body.stakes) {
          total += parseFloat(body.stakes[s].amount);
        }
        totalStaking = total;
      }
    }
  );
  setTimeout(getNetworkStats, 300000);
}

getNetworkStats();

var hbs = exphbs.create({
  defaultLayout: 'main'
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.get('/', function(req, res) {
  yourRewards = yourNAV * totalRewards / totalStaking;
  yourPercentRewards = yourRewards / yourNAV * 100;
  inflation = (totalRewards + totalBlocks * 0.5) / totalNAV * 100;
  res.render('home', {
    totalNAV: (Math.round(totalNAV)).toLocaleString('en-US'),
    totalStaking: (Math.round(totalStaking)).toLocaleString('en-US'),
    yourRewards: (yourRewards).toLocaleString('en-US'),
    yourPercentRewards: yourPercentRewards.toFixed(2),
    inflation: inflation.toFixed(2)
  });
});

var port = process.env.PORT || 5000;
app.listen(port);

console.log('Listening on `localhost:' + port + '`!');
