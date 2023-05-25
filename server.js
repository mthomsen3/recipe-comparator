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

// Validation of environment variables
if (!process.env.apiKey || !process.env.searchEngineID) {
    console.error("Missing required environment variables: apiKey, searchEngineID");
    process.exit(1);
}

app.listen(3000, function () {
    console.log('App listening on port 3000.')
})

app.get('/', function (req, res) {
    res.render('index', { recipeData: [], error: null });
});

app.post('/', async function (req, res, next) {
    try {
        let query = req.body.searchQuery;
        validateInput(query);
        
        let searchResultUrls = await getSearchResults(query);
        
        let recipeDisplay;
        try {
            recipeDisplay = await getRecipes(searchResultUrls);
        } catch(err) {
            console.log(err);
            res.render('index', {
                recipeData: [],
                error: 'Failed to retrieve recipe data'
            });
            return;
        }
        
        res.render('index', {
            recipeData: recipeDisplay,
            error: null
        });
    } catch (err) {
        next(err);
    }
});



// catch 404 and forward to error handler
app.use(function (req, res, next) {
    //next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // Log the error, for now just console.log
    console.error(err);
    res.status(500).render('error', {
        message: 'Internal Server Error'
    });
});


async function getSearchResults(query) {
    try {
        let googleSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${process.env.apiKey}&cx=${process.env.searchEngineID}&q=${query}&num=10`;

        let resp = await axios.get(googleSearchUrl);
        return resp.data.items.slice(0, 10).map(item => item.link);
    } catch (err) {
        throw new Error('Error searching Google');
    }
}

async function getRecipes(searchResultUrls) {
    let requests = searchResultUrls.map(url => axios.get(url));
    let results = await Promise.allSettled(requests);
    
    let recipeDisplay = [];
    let hasSuccessfulRequest = false;
    let hasRecipe = false;

    results.forEach((result, i) => {
        try {
            if (result.status === "fulfilled") {
                hasSuccessfulRequest = true;
                if (checkForRecipeSchema(result.value)) {
                    let recipeData = scrapeRecipeData(result.value);
                    if(recipeData) {
                        recipeDisplay.push(recipeData);
                        hasRecipe = true;
                    } else {
                        console.log(`Scrape failed for URL ${searchResultUrls[i]}`);
                    }
                } else {
                    console.log(`No recipe schema for URL ${searchResultUrls[i]}`);
                }
            } else {
                console.log(`Request failed for URL ${searchResultUrls[i]}`);
            }
        } catch (err) {
            console.error(`Error processing URL ${searchResultUrls[i]}: ${err.message}`);
        }
    });

    if (!hasSuccessfulRequest) {
        throw new Error('No successful requests');
    }

    if (!hasRecipe) {
        throw new Error('No recipes found');
    }

    while (recipeDisplay.length < 3) {
        recipeDisplay.push(null);
    }

    return recipeDisplay;
}




function validateInput(query) {
    // Add input validation and sanitization logic here
    if (!query) {
        throw new Error("Invalid search query");
    }
}


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