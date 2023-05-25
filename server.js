require('dotenv').config()
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const moment = require('moment');

const app = express()

// view engine setup
app.set('views', 'views');
app.set('view engine', 'ejs')

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(3000, function () {
    console.log('App listening on port 3000.')
})

app.get('/', function (req, res) {
    res.render('index', { recipeData: [], error: null });

});

app.post('/', function (req, res) {

    let query = `${req.body.searchQuery}`;
    let apiKey = process.env.apiKey
    let searchEngineID = process.env.searchEngineID;
    let numSearchResults = 10;

    // compose google search URL
    let googleSearchUrl = 'https://www.googleapis.com/customsearch/v1?key=' + apiKey + '&cx=' + searchEngineID + '&q=' + query + '&num=' + numSearchResults;

    console.log(googleSearchUrl);

    axios.get(googleSearchUrl).then(resp => {
        // later insert axios 200 response code check here

       // Use a loop to get URLs and make requests
        let searchResultUrls = resp.data.items.slice(0, numSearchResults).map(item => item.link);
        let requests = searchResultUrls.map(url => axios.get(url));

        Promise.allSettled(requests)
            .then(results => {
                let recipeDisplay = [];

                results.forEach(result => {
                    if (result.status === "fulfilled" && checkForRecipeSchema(result.value)) {
                        let recipeData = scrapeRecipeData(result.value);
                        if(recipeData) {
                            recipeDisplay.push(recipeData);
                        }
                    }
                });


                while (recipeDisplay.length < 3) {
                    recipeDisplay.push(null);
                }
                
                console.log("rendering");
                res.render('index', {
                    recipeData: recipeDisplay,
                    error: null
                });

            })
            .catch(err => {
                console.log(err);
                console.log("didn't get 3 recipes");
                res.render('index', {
                    recipeData: [],
                    error: 'Failed to retrieve recipe data'
                });
            });
            
    }).catch(err => {
        console.log(err);
        res.render('index', {
            recipeData:[],
            error: 'Error searching Google'
        });
    });

});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    //next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    /* res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {}; */

    // render the error page
    res.status(err.status || 500);
    console.log(err);
    res.render('error');
});

function nullifyPromiseErrors(promises) {
    return Promise.all(
        promises.map(p => p.catch(error => null))
    )
}

function checkForRecipeSchema(resp) {

    //console.log("checking");
    const $ = cheerio.load(resp.data);
    // get the schema section from html to parse
    var obj = $("script[type='application/ld+json']");

    var json_schema = []
    var json_parsed = [];
    var jsonRecipeSection = [];

    // if there are no "script[type='application/ld+json']" objects found anywhere
    if (obj[0] == undefined) {
        return false;
    }
    if (obj[0].children.length == 0) {
        return false;
    }

    // otherwise, scan through cheerio data "script[type='application/ld+json']" objects to find recipe section
    for (var i = 0; i < obj.length; i++) {
        json_schema = obj[i].children[0].data;
        json_parsed = JSON.parse(json_schema);
        jsonRecipeSection = getObjects(json_parsed, '@type', 'Recipe');
        /*if (jsonRecipeSection.length === 0){
            continue;
        } else {
            break;
        }
        */
    }

    if (jsonRecipeSection == undefined || jsonRecipeSection == null || jsonRecipeSection.length == 0) {
        return false;
    } else {
        return true;
    }

}

function scrapeRecipeData(resp) {

    //console.log("scraping");
    const $ = cheerio.load(resp.data);
    // get the schema section from html to parse
    var obj = $("script[type='application/ld+json']");

    var json_schema = []
    var json_parsed = [];
    var jsonRecipeSection = [];

    // scan through cheerio data to find recipe section
    for (var i = 0; i < obj.length; i++) {
        json_schema = obj[i].children[0].data;
        json_parsed = JSON.parse(json_schema);
        jsonRecipeSection = getObjects(json_parsed, '@type', 'Recipe');

    }

    // grab marked up data, convert ISO durations to formatted time
    // add later: catch for empty values?
    let url = `${resp.config.url}`;
    let name = `${jsonRecipeSection[0].name}`;
    let description = `${jsonRecipeSection[0].description}`;
    let prepTime = `${parseDuration(jsonRecipeSection[0].prepTime)}`;
    let cookTime = `${parseDuration(jsonRecipeSection[0].cookTime)}`;
    let totalTime = `${parseDuration(jsonRecipeSection[0].totalTime)}`;
    let recipeYield = `${jsonRecipeSection[0].recipeYield}`;
    let recipeIngredient = jsonRecipeSection[0].recipeIngredient;
    let recipeInstructions = jsonRecipeSection[0].recipeInstructions;

    // make a custom JSON object with transformed (time) values

    let data = {
        "url": url,
        "name": name,
        "description": description,
        "prepTime": prepTime,
        "cookTime": cookTime,
        "totalTime": totalTime,
        "recipeYield": recipeYield,
        "recipeIngredient": recipeIngredient,
        "recipeInstructions": recipeInstructions
    };

    return data;
}

// return the JSON object that contains a defined key value pair
// obj = json to search, key = key, val = value 
function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else
            // if key matches and value matches or if key matches and value is not passed (eliminating the case where key matches but passed value does not)
            if (i == key && obj[i] == val || i == key && val == '') { //
                objects.push(obj);
            } else if (obj[i] == val && key == '') {
                // only add if the object is not already in the array
                if (objects.lastIndexOf(obj) == -1) {
                    objects.push(obj);
                }
            }
    }
    return objects;
}


function parseDuration(e) {
    var timing = moment.duration(e, moment.ISO_8601);
    /* console.log(timing.asSeconds()); */
    seconds = timing.asSeconds();
    /* console.log(seconds.toHHMMSS()) */
    return seconds.toHHMMSS();
}


Number.prototype.toHHMMSS = function () {
    var seconds = Math.floor(this),
        hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    var minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    // this code just fills in leading zeroes, don't need it
    /* if (hours   < 10) {hours   = "0"+hours;} */
    /* if (minutes < 10) {minutes = "0"+minutes;} */
    /* if (seconds < 10) {seconds = "0"+seconds;} */

    if (hours == 0) { return minutes + ' Minutes'; }
    if ((hours == 1) && (minutes == 0)) { return hours + ' Hour' }
    if (hours == 1) { return hours + ' Hour, ' + minutes + ' Minutes'; }
    if ((hours != 0) && (minutes == 0)) { return hours + ' Hours' }
    if (hours != 0) { return hours + ' Hours, ' + minutes + ' Minutes'; }
    else { return; }
}



function isValidUrl(string) {
    try {
        new URL(string);
    } catch (_) {
        return false;
    }
    return true;
}

function strip_html_tags(str) {
    if ((str === null) || (str === ''))
        return false;
    else
        str = str.toString();
    return str.replace(/<[^>]*>/g, '');
}