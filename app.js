require('dotenv').config();
const express = require('express');
const https = require('https'); // Import the 'https' module
const fs = require('fs'); // Import the 'fs' module for reading SSL/TLS certificates
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
var cookieParser = require('cookie-parser')
var session = require('express-session')
var cluster = require("cluster");
var filter = require('content-filter')
require("./v1/auth/passport");

const v1 = require("./v1/index.js");

const port = process.env.PORT || 443;

const RateLimit = require('express-rate-limit');
const passport = require('passport');
const apiLimiter = RateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false,
});

const app = express();

app.use(apiLimiter);

app.disable('x-powered-by');

app.set("view engine", "ejs");

app.use(cors({ origin: ["http://sparkrentals.software:3000", "http://sparkrentals.software:1337", "http://localhost:3000", "http://localhost:1337"], credentials: true }));
app.options('*', cors());

app.use(cookieParser(process.env.COOKIE_KEY))

app.use(require('morgan')('combined'));
app.use(session({
    secret: process.env.COOKIE_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use(filter());

app.use("/v1", v1);

// Read the SSL/TLS certificates
const privateKey = fs.readFileSync("./server.key");
const certificate = fs.readFileSync("./server.cert");

const credentials = {
    key: privateKey,
    cert: certificate
};

if (false) {
    if (cluster.isPrimary) {
        console.log(`Primary ${process.pid} is running`);
        var cpuCount = require('os').cpus().length;
        console.log(`Total CPU ${cpuCount}`);

        for (var worker = 0; worker < cpuCount; worker += 1) {
            cluster.fork();
        }

        cluster.on('exit', function () {
            cluster.fork();
        })
    } else {
        // Create an HTTPS server and use the Express app as a handler
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port, () => console.log(`Worker ID ${process.pid}, is running on https://localhost:` + port));
    }
} else {
    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(port,"0.0.0.0", () => console.log(`Worker ID ${process.pid}, is running on https://localhost:` + port));
}
