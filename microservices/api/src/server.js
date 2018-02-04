var express = require('express');
var app = express();
var request = require('request');
var router = express.Router();
var morgan = require('morgan');
var bodyParser = require('body-parser');
require('request-debug')(request);

var fetch  = require('node-fetch');
var util = require('util');

var hasuraExamplesRouter = require('./hasuraExamples');
var server = require('http').Server(app);

router.use(morgan('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/', hasuraExamplesRouter);
app.get("/intercom", function (req, res)
{
    console.log("GET from intercom\n");
    console.log(req.body); // populated!

    console.log("Data : \n")
    console.log(req.body.data);

    res.send("OK");
});


/**
 * An example function to send replies to the user
 * @param  body            	The message body of the reply
 * @param  conversation_id 	ID of the conversation to send this reply to
 * @param  admin_id       	ID of the admin who's authoring this reply
 * @param  token           	Access Token as provided by Intercom
 */
const intercomReply = (body, conversation_id) =>
{
    let query_url = 'https://api.intercom.io/conversations/' + conversation_id + '/reply';

    // Provided by Intercom
    const ACCESS_TOKEN = 'dG9rOmVlMjcwZGNlX2U1OTVfNDcyNF9iNTEzXzEwMTIxYzk3OTdmZToxOjA=';
    // The representative admin id to be used for all reply dispatches
    const ADMIN_ID = '1733279';
    // Define Fetch headers
    let _headers = {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    // Populate payload
    let data = {
        'type': 'admin',
        'admin_id': ADMIN_ID,
        'body': body,
        'message_type': 'comment'
    };

    // Dispatch data
    fetch(query_url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: _headers
    }).then(response => response.json())
    .catch(error => { console.log('Error: ' + error); })
    .then(response => { console.log(response); });
};

/**
 * Processes Webhook notifications from Intercom
 */
app.post('/intercom_webhook', (req, res) =>
{
    res.status(200).send('OK');
    console.log(util.inspect(req.body, false, null));

    // Notification payload
    let item = req.body.data.item;
    let convop = item.conversation_parts;

    // Extract necessary data to be able to reply
    let conversation_id = item.id;

    let msg = '';
    // Check if this is the lead message
    if (convop.total_count === 0) {
        msg = item.conversation_message.body;
    } else {
        // Intercom may dispatch one or more user messages all
        // at once, we only care about the last one
        msg = convop.conversation_parts[convop.total_count-1].body;
    }

    // Sanitize incoming messages.
    // All incoming messages come wrapped in one or the other HTML tags.
    // We simply strip out this opening and closing tags
    msg = msg.replace(/<[^>]+>/g, '');

    // Print the me ssage sent by the user
    console.log('User says: ' + msg);

    // Dispatch reply
    reply = hasuraRetreive(msg, function(resp)
    {
        console.log("Reply : " + resp);
        intercomReply(resp, conversation_id);
    });
});

/**
 * An example function to insert key value pair to Hasura Data API
 * @param  key      The message body of the reply
 * @param  value 	ID of the conversation to send this reply to
 */
const hasuraInsert = (key, value) =>
{
    var url_data = "https://data.disabled79.hasura-app.io/";
    var url_data_query = url_data + "v1/query";
    var ACCESS_TOKEN = "9733d956517e310dc05ca682e73f93373b1e41524660d3c3";

    // Define Fetch headers
    let _headers = {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    // Populate payload
    let data = {
        'type': 'insert',
        "args": {
            "table": "keyval",
            "objects": [
                {"key": key, "val" : value}
            ]
        }
    };

    console.log(util.inspect(data, false, null));

    //console.log("Data : " + data);
    // Dispatch data
    fetch(url_data_query, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: _headers
    }).then(response => response.json())
    .catch(error => { console.log('Error: ' + error); })
    .then(response => { console.log(response); });

};

/**
 * An example function to get the value from the key!
 * @param  key      The message body of the reply
 */
const hasuraRetreive = (key, callback) =>
{
    var url_data = "https://data.disabled79.hasura-app.io/";
    var url_data_query = url_data + "v1/query";
    var ACCESS_TOKEN = "9733d956517e310dc05ca682e73f93373b1e41524660d3c3";

    // Define Fetch headers
    let _headers = {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    // Populate payload
    let data = {
        "type": "select",
        "args": {
            "table": "keyval",
            "columns": [ "val" ],
            "where" : {"key" : key}
        }
    };

    console.log(util.inspect(data, false, null) + "\n\n\n");

    //console.log("Data : " + data);
    // Dispatch data
    fetch(url_data_query, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: _headers
    }).then(response =>
        {
            return response.text()
        })
        .catch(error => {
            console.log('Error: ' + error);
            callback("Error");
        })
        .then(response =>
        {
            console.log("Resp : " + response);
            let parsed_resp = JSON.parse(response);
            console.log(parsed_resp);
            if(parsed_resp.length ===0)
            {
                callback("I am sorry I couldn't find a suitable reply")
            }
            else
            {
                callback(parsed_resp[0].val);
            }
            //respp = response[0].val;
            //console.log("Response : " + respp);
            //console.log(util.inspect(response, false, null)); callback(respp);
            //
        });
};

app.post("/add_entry", function (req, res)
{
    //JSON {"key":"keyyy", "value":"valueee"}
    console.log(req.body); // populated!
    console.log("Data : \n");
    console.log("key = " + k + "  value = " + v);

    var k = req.body.key;
    var v = req.body.value;

    hasuraInsert(k, v);
    res.send("Ok");
});

app.get("/get_value", function (req, res)
{
    var k = req.query.key;
    console.log("key = " + k);

    hasuraRetreive(k, function(ress)
    {
        //res.send("Ok");
        console.log("Response from Callback function : " + ress);
        res.send(JSON.stringify({"val" : ress}));
    });

});

var port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log('Example app listening on port ' + port);
});
