//libraries
import express from 'express';
import axios from 'axios';
import bodyParser from 'body-parser';
//variables
const app = express();
const port = 3000;
const API_URL = "https://api.openuv.io/api/v1/uv"; /*?lat=:lat&lng=:lng&alt=:alt&dt=:dt";*/
const yourAPIKey = "openuv-fbwrmk3obkx3-io";

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.get("/", (req, res) => {//home route
  res.render("index.ejs", {
    data: null,
    error: null,
    lat: 43.6532,
    lng: -79.3832,
    locationText: ""
  });
});

app.get("/KnowSUN", async (req, res) => {//when teh user submits a location

  const location = (req.query.location || "").trim();//get the location inputed and take out all spaces, if nothing is inpted empty space

  console.log("User typed location:", location);//To c what the user typed in the terminal for debugging purposes

  if (!location) {//reremder the page with an error and default toronto coordinates if empyt
    return res.render("index.ejs", {
      data: null,
      error: "Please enter a location.",
      lat: 43.6532,//default toronto lat
      lng: -79.3832,//default toronto lang
      locationText: ""
    });
  }

  try {//get the locations lat and lang
    //catting opensteen maps from geocoder, it basically converts the city to its lang and lat
    const geo = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: location,//the city/user input
        format: "json",//return JSON
        limit: 1//only best match
      },
      headers: {//blocks annonymous and automated messages like if the user is unknown and unclear message
        //these headers reduce the chance Nominatim blocks the request
        "User-Agent": "KnowSUN/1.0",
        "Accept-Language": "en",
        "Referer": "http://localhost:3000"
      }
    });

    console.log("Geo results count:", geo.data?.length);//debug purposes as mentioned

    //if geocoder returns no results, show an error
    if (!geo.data || geo.data.length === 0) {
      return res.render("index.ejs", {
        data: null,
        error: "Location not found. Try something like 'Toronto, ON' or 'Windsor, ON'.",
        lat: 43.6532,//fallback Toronto coords
        lng: -79.3832,
        locationText: location
      });
    }

    //extract the best match from Nominatim (city, country, province, district, division, state etc)
    //nominatim returns lat/lon as strings, so we convert it to numbers
    const lat = Number(geo.data[0].lat);
    const lng = Number(geo.data[0].lon);
    const displayName = geo.data[0].display_name;

    //debug purposes shows u the best match with its lang and lat
    console.log("Top match:", displayName);
    console.log("Lat/Lng:", lat, lng);

    //for double checking if the lat and lang are real numbers
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.render("index.ejs", {
        data: null,
        error: "Geocoding returned invalid coordinates. Try a different location.",
        lat: 43.6532,
        lng: -79.3832,
        locationText: location
      });
    }

    //this is where we call Open UV using the coordinates and fetch UV data thorugh the API requeset
    const uvRes = await axios.get(API_URL, {
      headers: {
        "x-access-token": yourAPIKey
      },
      params: {
        lat,//lat from geocoding
        lng//lang from geocoding
      }
    });

    //debug purposes showing uv values
    console.log("OpenUV current UV:", uvRes.data?.result?.uv);

    //this just sends all the data like uv data, lat/lang, location name etc to the ejs file
    return res.render("index.ejs", {
      data: uvRes.data,
      error: null,
      lat,
      lng,
      locationText: displayName
    });

  } catch (error) {//error handling for fails

    //debuggin purposes showoing error status and message in the terminal for easier debugging
    console.log("ERROR:", error.response?.status, error.response?.data || error.message);

    //same as before rerendering the page with better error msg and using default coords
    return res.render("index.ejs", {
      data: null,
      error: error.response?.data || error.message,
      lat: 43.6532,
      lng: -79.3832,
      locationText: location
    });
  }
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});


app.use(express.static("public"));