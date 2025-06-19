require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');
const app = express();
const router = express.Router();
const bodyParser = require("body-parser");
// mongodb configuration
const mongoose = require("mongoose");
const connection = require("../src/config/connection");
const UserController = require("../src/api/controller/user/UserController");
// if there is not database then mongodb will not initialise. but if give db url then automatically create db instance
if (!(connection.dbUrl === undefined || connection.dbUrl.length <= 0)) {
    mongoose.set("debug", false);
    mongoose.Promise = global.Promise;
    mongoose.connect(connection.dbUrl, {});

    const db = mongoose.connection;

    db.once("open", function () {
        console.log("Database connected successfully");
    });

    db.on("error", function (err) {
        console.error("Error while connecting to DB:", err);
    });
}
else console.error("Database URL is not defined. Please check your configuration.");
// mongodb configuration ends here

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
    bodyParser.urlencoded({
        limit: "50mb",
        extended: true,
    })
);
router.get('/', (req, res) => {
    res.send('App is running..');
});
//Get all students
router.post('/identifyContact', UserController.identifyContact);


app.use('/.netlify/functions/api', router);
module.exports.handler = serverless(app);