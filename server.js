require('dotenv').config()
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const moment = require('moment');
const app = express()
const he = require('he');
const striptags = require('striptags');
const validator = require('validator');
const nodemailer = require('nodemailer')
const { google } = require('googleapis')
const OAuth2 = google.auth.OAuth2


const oauth2Client = new OAuth2(
    process.env.Client_ID,
    process.env.Client_Secret,
    "https://developers.google.com/oauthplayground"
)

oauth2Client.setCredentials({
    refresh_token: process.env.Refresh_Token
})
const accessToken = oauth2Client.getAccessToken()



// view engine setup
app.set('views', 'views');
app.set('view engine', 'ejs')
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())


// Validation of environment variables
if (!process.env.apiKey || !process.env.searchEngineID) {
    console.error("Missing required environment variables: apiKey, searchEngineID");
    process.exit(1);
}

app.listen(3000, function () {
    console.log('App listening on port 3000.')
})

// contact static page
app.get('/contact', function (req, res) {
    res.render('contact');
});

app.post('/contact', async (req, response) => {
    const { name, email, content, 'g-recaptcha-response': recaptchaResponse } = req.body;

    // Validate form fields
    if (!name || name.length < 3 || name.length > 30) {
        //response.status(400).json({ status: "error", message: "Name is required and must be between 3 and 30 characters." });
        response.render('contact', { message: 'Name is required and must be between 3 and 30 characters.', type: 'error'  })
        return;
    }

    if (!email || !validateEmail(email)) {
        //response.status(400).json({ status: "error", message: "A valid email address is required." });
        response.render('contact', { message: 'A valid email address is required.', type: 'error'  })
        return;
    }

    if (!content) {
        //response.status(400).json({ status: "error", message: "Message content is required." });
        response.render('contact', { message: 'Message content is required.', type: 'error'  })
        return;
    }

    try {
        // Verify reCAPTCHA
        const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`;
        const recaptchaResult = await axios.post(verifyURL);
        console.log(recaptchaResult.data);

        if (!recaptchaResult.data.success) {
            response.render('contact', { message: 'reCAPTCHA verification failed.', type: 'error'  });
            return;
        }

        // Sanitize inputs
        const sanitized = {
            name: sanitize(name),
            email: sanitize(email),
            content: sanitize(content),
        }

        const output = `
      <p>You have a new contact request</p>
      <h3>Contact details</h3>
      <ul>
        <li>Name: ${sanitized.name}</li>
        <li>Email: ${sanitized.email}</li>
        <li>Message: ${sanitized.content}</li>
      </ul>`;

        const smtpTrans = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: "OAuth2",
                user: process.env.GMAIL_USER,
                clientId: process.env.Client_ID,
                clientSecret: process.env.Client_Secret,
                refreshToken: process.env.Refresh_Token,
                accessToken: accessToken
            }
        })

        // verify connection configuration
        smtpTrans.verify(function (error, success) {
            if (error) {
                console.log(error);
            } else {
                console.log("SMTP Connection Verified");
            }
        });


        const mailOpts = {
            from: process.env.GMAIL_USER,
            to: process.env.RECIPIENT,
            subject: 'New message from Nodemailer-contact-form',
            html: output,
        }

        smtpTrans.sendMail(mailOpts, (error, res) => {
            if (error) {
                console.log(error);
                response.render('contact', { message: 'An error occurred. Please try again later.', type: 'error'  })
            }
            else {
                console.log("Message sent: " + res.message);
                response.render('contact', { message: 'Your message was successfully sent!', type: 'success' });
            }
            smtpTrans.close();
        })
    } catch (error) {
        console.log(error);
        response.status(500).json({ status: "error", message: "An error occurred. Please try again later.", type: 'error'  });
    }
});


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
        } catch (err) {
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

// about static page
app.get('/about', function (req, res) {
    res.render('about');
});



// privacy policy static page
app.get('/privacy-policy', function (req, res) {
    res.render('privacy-policy');
});

// terms of service static page
app.get('/terms-of-service', function (req, res) {
    res.render('terms-of-service');
});


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    //next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // Log the error, for now just console.log
    console.error(err);
    res.status(500).render('error', {
        message: 'Internal Server Error'
    });
});


// Helper function to validate email addresses
function validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Helper function to sanitize user input
function sanitize(input) {
    const output = input.replace(/<[^>]*>/g, '').trim();
    return output;
}







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
    let recipeDisplay = [];

    for (let url of searchResultUrls) {

        try {
            let response = await axios.get(url);

            if (checkForRecipeSchema(response)) {
                let recipeData = scrapeRecipeData(response);
                if (recipeData) {
                    recipeDisplay.push(recipeData);
                } else {
                    console.log(`Scrape failed for URL ${url}`);
                }
            } else {
                console.log(`No recipe schema for URL ${url}`);
            }
        } catch (err) {
            console.log(`Request failed for URL ${url}`);
        }
    }

    if (recipeDisplay.length === 0) {
        throw new Error('No recipes found');
    }

    return recipeDisplay;
}





function validateInput(query) {
    if (!query) {
        throw new Error("Invalid search query");
    }
    let sanitizedQuery = validator.escape(query);
    let alphanumericQuery = sanitizedQuery.replace(/ /g, '');
    // also allowing commas and apostrophes
    alphanumericQuery = alphanumericQuery.replace(/,/g, '').replace(/'/g, '');
    if (!validator.isAlphanumeric(alphanumericQuery)) {
        throw new Error("Invalid search query");
    }
    return sanitizedQuery;
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
            if (jsonRecipeSection.length > 0) {
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

    if (jsonRecipeSection.length == 0) {
        return null;
    }

    let recipe = jsonRecipeSection[0];

    let yield = formatYield(recipe.recipeYield);

    let data = {
        url: resp.config.url,
        name: recipe.name || '',
        description: recipe.description || '',
        prepTime: recipe.prepTime ? parseDuration(recipe.prepTime) : '',
        cookTime: recipe.cookTime ? parseDuration(recipe.cookTime) : '',
        totalTime: recipe.totalTime ? parseDuration(recipe.totalTime) : '',
        recipeYield: yield,
        recipeIngredient: recipe.recipeIngredient ? formatRecipeData(recipe.recipeIngredient) : [],
        recipeInstructions: recipe.recipeInstructions ? formatRecipeData(recipe.recipeInstructions) : []
    };

    return data;
}

function formatYield(yield) {
    // Handle different types of 'yield' separately
    if (Array.isArray(yield)) {
        // If there are two elements in the array, return the second element
        if (yield.length === 2) {
            return yield[1].trim();
        }
        // If there's only one element in the array, return that element
        else if (yield.length === 1) {
            return yield[0].trim();
        }
    }
    // If 'yield' is a number, convert it to a string and return it
    else if (typeof yield === 'number') {
        return yield.toString();
    }
    // If 'yield' is not an array or a number, return it as is
    return yield;
}















function formatRecipeData(data) {
    let formattedData = [];

    data.forEach(element => {
        // If the element is an object, we need to find a suitable string property to use
        // We choose 'text' as it's a common property for both 'HowToStep' and 'HowToSection' types
        if (typeof element === 'object') {
            if (element.text) {
                let decoded = he.decode(element.text); // decode HTML entities
                let noTags = striptags(decoded); // strip HTML tags
                formattedData.push(noTags);
            } else if (element.itemListElement) {
                // If the element is a 'HowToSection', recursively format its 'itemListElement'
                formattedData = formattedData.concat(formatRecipeData(element.itemListElement));
            }
        }
        // If the element is a string, we can use it directly
        else if (typeof element === 'string') {
            let decoded = he.decode(element); // decode HTML entities
            let noTags = striptags(decoded); // strip HTML tags
            formattedData.push(noTags);
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

    if (hours == 0 && minutes == 0) { return seconds + ' Seconds'; }
    else if (hours == 0) { return minutes + ' Minutes'; }
    else if ((hours == 1) && (minutes == 0)) { return hours + ' Hour'; }
    else if (hours == 1) { return hours + ' Hour, ' + minutes + ' Minutes'; }
    else if ((hours != 0) && (minutes == 0)) { return hours + ' Hours'; }
    else if (hours != 0) { return hours + ' Hours, ' + minutes + ' Minutes'; }
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