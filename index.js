var http = require('http');
var url = require("url");
var request = require('request');

const { BadgeFactory } = require('gh-badges')
const bf = new BadgeFactory()

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function returnError(res, error, paldo_url, body) {
  res.statusCode = 404;
  res.end(error.message + '\n' + paldo_url.toString() + '\n' + body);
}

var server = http.createServer(function(req, res) {
  var this_url = url.parse(req.url, true);
  var builder = this_url.query.builder;
  if (builder == null)
    builder = 'vala-master';

  if (endsWith(this_url.pathname, "/")) {
    const paldo_url = new url.URL('http://paldo.org:8010/json/builders/' + builder + '/builds?select=-1&as_text=1');
    request(paldo_url.toString(), function (error, response, body) {
      if (error) {
        returnError (res, error, paldo_url, '');
        return;
      }

      try {
        var obj = JSON.parse(body);
        var last_obj = obj["-1"];
        if (last_obj == null) {
          returnError (res, ex, paldo_url, body);
          return;
        }

        var last_obj_text = last_obj.text;
        if (!Array.isArray(last_obj_text) || last_obj_text.length < 2) {
          returnError (res, ex, paldo_url, body);
          return;
        }

        var status = last_obj_text[1];
        var colorscheme = 'lightgrey';
        if (status == 'successful') {
          status = 'passed';
          colorscheme = 'green';
        } else if (status == 'failed') {
          status = 'failed';
          colorscheme = 'red';
        } else {
          var status = last_obj_text[0];
          if (status == 'failed') {
            status = 'failed';
            colorscheme = 'red';
          } else {
            console.log (status);
            status = 'unknown';
          }
        }

        const format = {
          text: [builder, status],
          colorscheme: colorscheme,
          template: 'flat',
        }

        res.writeHead(200, {'Content-Type': 'image/svg+xml'});
        res.end(bf.create(format));
      } catch (ex) {
        returnError (res, ex, paldo_url, body);
        return;
      }
    });
  } else {
    res.statusCode = 404;
    res.end("404: page not found");
  }
});

server.listen(8080);
