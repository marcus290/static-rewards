var path = require('path'),
  express = require('express'),
  request = require('request'),
  exphbs = require('express-handlebars'),
  bodyParser = require('body-parser'),
  methodOverride = require('method-override'),
  Handlebars = require('handlebars'),
  HandlebarsIntl = require('handlebars-intl'),
  MomentHandler = require('handlebars.moment');

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
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));

app.locals.totalSupply = 0;
app.locals.stakingCoins = 0;

var totalNAV = 0;
var totalStaking = 0;
var yourNAV = 1000;
var yourRewards = 0;
var yourPercentRewards = 0;
var inflation = 0;

const totalBlocks = 2 * 60 * 24 * 365;
const totalRewards = 2 * totalBlocks;

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
  const urlStakes =
    'https://chainz.cryptoid.info/explorer/index.stakes.dws?coin=nav';
  
  request(
    {
      url: urlStakes,
      json: true
    },
    function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var total = 0;
        var amount = 0;
        for (var s in body.stakes) {
          amount = parseFloat(body.stakes[s].amount);
          total += isNaN(amount) ? 0 : amount;
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
app.set('views', path.join(__dirname, "views"));

app.get('/', function(req, res) {
  yourRewards = yourNAV * totalRewards / totalStaking;
  yourPercentRewards = yourRewards / yourNAV * 100;
  inflation = (totalRewards + totalBlocks * 0.5) / totalNAV * 100;
  res.render('home', {
    totalNAV: (isNaN(totalNAV) ? '-' : (Math.round(totalNAV)).toLocaleString('en-US')),
    totalStaking: (isNaN(totalStaking) ? '-' : (Math.round(totalStaking)).toLocaleString('en-US')),
    yourRewards: (isNaN(yourRewards) ? '-' : (yourRewards).toLocaleString('en-US')),
    yourPercentRewards: (isNaN(yourPercentRewards) ? '-' : yourPercentRewards.toFixed(2)),
    inflation: (isNaN(inflation) ? '-' : inflation.toFixed(2))
  });
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log('Listening on `localhost:' + port + '`!');
