require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
var cookieParser = require("cookie-parser");
var session = require("express-session");
var cluster = require("cluster"); // Load Balancer
var filter = require("content-filter"); // reliable security for MongoDB applications against the injection attacks
require("./v1/auth/passport");
// Using version 1
const v1 = require("./v1/index.js");
const {MongoClient, ObjectId} = require("mongodb");
const mongoURI = process.env.DBURI;
// Server port
const port = process.env.REST_API_PORT || 443;

const RateLimit = require("express-rate-limit");
const passport = require("passport");
const apiLimiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 10000, // Limit each IP to 10000 requests per `window` (here, per 1 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const app = express();

// apply rate limiter to all requests
app.use(apiLimiter);

app.disable("x-powered-by");

app.set("view engine", "ejs");

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser(process.env.COOKIE_KEY));

app.use(require("morgan")("combined"));
app.use(
  session({
    secret: process.env.COOKIE_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false},
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

app.use(express.static(path.join(__dirname, "public")));

app.use(filter());

app.use("/v1", v1); // Using the first version

setInterval(async () => {
  //tum aktif scooterları off a cek
  let client = new MongoClient(mongoURI);

  try {
    let db = client.db("spark-rentals");
    let scooters_collection = db.collection("scooters");
    allScooters = await scooters_collection.find().toArray();

    for (let i = 0; i < allScooters.length; i++) {
      if (allScooters[i]["status"] == "Available") {
        console.log(allScooters[i]["_id"]);
        await scooters_collection.updateOne(
          {_id: ObjectId(allScooters[i]["_id"])},
          {$set: {status: "Off"}}
        );
      }
    }
  } catch (e) {
    console.log("an error occured");
  } finally {
    await client.close();
  }
}, 20000);

if (false) {
  if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    var cpuCount = require("os").cpus().length;
    console.log(`Total CPU ${cpuCount}`);

    // Create a worker for each CPU
    for (var worker = 0; worker < cpuCount; worker += 1) {
      cluster.fork();
    }

    // Listen for dying workers
    cluster.on("exit", function () {
      cluster.fork();
    });
  } else {
    app.listen(port, () =>
      console.log(
        `Worker ID ${process.pid}, is running on http://localhost:` + port
      )
    );
  }
} else {
  app.listen(port, () =>
    console.log(
      `Worker ID ${process.pid}, is running on http://localhost:` + port
    )
  );
}
