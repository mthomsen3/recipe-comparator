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




function checkForRecipeSchema(resp) {
    let jsonRecipeSection = findRecipeSection(resp);
    return jsonRecipeSection.length > 0;
}

function findRecipeSection(resp) {
    const $ = cheerio.load(resp.data);
    var obj = $("script[type='application/ld+json']");
    var jsonRecipeSection = [];
  
    for (var i = 0; i < obj.length; i++) {
        try {
            let json_schema = obj[i].children[0].data;
            let json_parsed = JSON.parse(json_schema);
            jsonRecipeSection = getObjects(json_parsed, '@type', 'Recipe');
            
            // break the loop if a recipe section is found
            if(jsonRecipeSection.length > 0) {
                break;
            }
        } catch (err) {
            console.log("Error parsing JSON");
        }
    }

    return jsonRecipeSection;
}


function scrapeRecipeData(resp) {
    let jsonRecipeSection = findRecipeSection(resp);

    if(jsonRecipeSection.length == 0) {
        return null;
    }

    let recipe = jsonRecipeSection[0];

    let data = {
        url: resp.config.url,
        name: recipe.name || '',
        description: recipe.description || '',
        prepTime: recipe.prepTime ? parseDuration(recipe.prepTime) : '',
        cookTime: recipe.cookTime ? parseDuration(recipe.cookTime) : '',
        totalTime: recipe.totalTime ? parseDuration(recipe.totalTime) : '',
        recipeYield: recipe.recipeYield || '',
        recipeIngredient: recipe.recipeIngredient ? formatRecipeData(recipe.recipeIngredient) : [],
        recipeInstructions: recipe.recipeInstructions ? formatRecipeData(recipe.recipeInstructions) : []
    };

    return data;
}

function formatRecipeData(data) {
    let formattedData = [];

    data.forEach(element => {
        // If the element is an object, we need to find a suitable string property to use
        // We choose 'text' as it's a common property for both 'HowToStep' and 'HowToSection' types
        if (typeof element === 'object') {
            if (element.text) {
                formattedData.push(element.text);
            } else if (element.itemListElement) {
                // If the element is a 'HowToSection', recursively format its 'itemListElement'
                formattedData = formattedData.concat(formatRecipeData(element.itemListElement));
            }
        }
        // If the element is a string, we can use it directly
        else if (typeof element === 'string') {
            formattedData.push(element);
        }
    });

    return formattedData;
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