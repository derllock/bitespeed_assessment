require('dotenv').config();

const express = require("express");
const bodyParser = require("body-parser");

const app = express();


// mongodb configuration
const mongoose = require("mongoose");
const connection = require("./config/connection");

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
/*authentication middleware not needed for this app
app.use(
  session({
    secret: "st@ry@",
    resave: false, //don't save session if unmodified
    saveUninitialized: true,
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      //touchAfter: 24 * 3600, // time period in seconds
      ttl: 30 * 24 * 60 * 60, // = 14 days. Default
      autoRemove: "native", // Default 
    }),
    rolling: true,
    cookie: {
      originalMaxAge: 30 * 24 * 60 * 60 * 1000,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: false,
      // expires: new Date(Date.now() + 300000),
    },
  })
);*/


const userRoute = require("./routes/user");
app.use("/api/user/", userRoute);

// Basic route for testing
app.get("/", (req, res) => {
  res.json({
    message: "Bitespeed Assessment API Server",
    status: "Running",
    endpoints: {
      users: "/api/user/identifyContact"
    }
  });
});

module.exports = app;
