const express = require("express");
const router = express.Router();

const UserController = require("../api/controller/user/UserController");

router.route("/identifyContact").post(UserController.identifyContact);

router.route("/hello").get((req, res, next) => {
  console.log("/////////////////////////////");
  console.log("Helloooooooooooo");
  console.log("/////////////////////////////");
  res.status(200).send({ 
    message: "success",
  });
});
module.exports = router;
