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
    res.render('index', { recipeData1: null, recipeData2: null, recipeData3: null, error: null });

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

        var searchResult1Url = resp.data.items[0].link;
        var searchResult2Url = resp.data.items[1].link;
        var searchResult3Url = resp.data.items[2].link;
        var searchResult4Url = resp.data.items[3].link;
        var searchResult5Url = resp.data.items[4].link;
        var searchResult6Url = resp.data.items[5].link;
        var searchResult7Url = resp.data.items[6].link;
        var searchResult8Url = resp.data.items[7].link;
        var searchResult9Url = resp.data.items[8].link;
        var searchResult10Url = resp.data.items[9].link;

        Promise.allSettled([
            axios.get(searchResult1Url),
            axios.get(searchResult2Url),
            axios.get(searchResult3Url),
            axios.get(searchResult4Url),
            axios.get(searchResult5Url),
            axios.get(searchResult6Url),
            axios.get(searchResult7Url),
            axios.get(searchResult8Url),
            axios.get(searchResult9Url),
            axios.get(searchResult10Url)
        ])
            .then(axios.spread((res1, res2, res3, res4, res5, res6, res7, res8, res9, res10) => {

                // NOTE - Promise.all will resolve to an array of each of the values that the Promises resolve to - eg [Promise.resolve(1), Promise.resolve(2)] will turn into [1, 2]. Promise.allSettled will instead give you [{ status : 'fulfilled', value: 1 }, { status : 'fulfilled', value: 2 }].
                // so res#.value gets the return value, res.status gets the response
                let recipeDisplay = [];

                if (res1.status == "fulfilled") {
                    if (checkForRecipeSchema(res1.value) == true) {
                        res1data = scrapeRecipeData(res1.value);
                        if(res1data != null && res1data != undefined)
                        {
                            recipeDisplay.push(res1data);
                        }
                    } 
                }

                if (res2.status == "fulfilled") {
                    if (checkForRecipeSchema(res2.value) == true) {
                        res2data = scrapeRecipeData(res2.value);
                        if(res2data != null && res2data != undefined)
                        {
                            recipeDisplay.push(res2data);
                        }
                    } 
                }

                if (res3.status == "fulfilled") {
                    if (checkForRecipeSchema(res3.value) == true) {
                        res3data = scrapeRecipeData(res3.value);
                        if(res3data != null && res3data != undefined)
                        {
                            recipeDisplay.push(res3data);
                        }
                    } 
                }

                if (res4.status == "fulfilled") {
                    if (checkForRecipeSchema(res4.value) == true) {
                        res4data = scrapeRecipeData(res4.value);
                        if(res4data != null && res4data != undefined)
                        {
                            recipeDisplay.push(res4data);
                        }
                    } 
                }

                if (res5.status == "fulfilled") {
                    if (checkForRecipeSchema(res5.value) == true) {
                        res5data = scrapeRecipeData(res5.value);
                        if(res5data != null && res5data != undefined)
                        {
                            recipeDisplay.push(res5data);
                        }
                    } 
                }

                if (res6.status == "fulfilled") {
                    if (checkForRecipeSchema(res6.value) == true) {
                        res6data = scrapeRecipeData(res6.value);
                        if(res6data != null && res6data != undefined)
                        {
                            recipeDisplay.push(res6data);
                        }
                    }  
                }

                if (res7.status == "fulfilled") {
                    if (checkForRecipeSchema(res7.value) == true) {
                        res7data = scrapeRecipeData(res7.value);
                        if(res7data != null && res7data != undefined)
                        {
                            recipeDisplay.push(res7data);
                        }
                    } 
                }

                if (res8.status == "fulfilled") {
                    if (checkForRecipeSchema(res8.value) == true) {
                        res8data = scrapeRecipeData(res8.value);
                        if(res8data != null && res8data != undefined)
                        {
                            recipeDisplay.push(res8data);
                        }
                    } 
                }

                if (res9.status == "fulfilled") {
                    if (checkForRecipeSchema(res9.value) == true) {
                        res9data = scrapeRecipeData(res9.value);
                        if(res9data != null && res9data != undefined)
                        {
                            recipeDisplay.push(res9data);
                        }
                    } 
                }

                if (res10.status == "fulfilled") {
                    if (checkForRecipeSchema(res10.value) == true) {
                        res10data = scrapeRecipeData(res10.value);
                        if(res10data != null && res10data != undefined)
                        {
                            recipeDisplay.push(res10data);
                        }
                    } 
                }

                console.log("rendering");
                console.log(recipeDisplay[0]);
                console.log(recipeDisplay[1]);
                console.log(recipeDisplay[2]);
                res.render('index', {
                    recipeData1: recipeDisplay[0],
                    recipeData2: recipeDisplay[1],
                    recipeData3: recipeDisplay[2],
                    error: null
                });

            }))
            .catch(err => {
                console.log(err);
                console.log("didn't get 3 recipes");
                res.render('index', {
                    recipeData1: null,
                    recipeData2: null,
                    recipeData3: null,
                    error: 'Failed to retrieve recipe data'
                });
            });
            
    }).catch(err => {
        console.log(err);
        res.render('index', {
            recipeData1: null,
            recipeData2: null,
            recipeData3: null,
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