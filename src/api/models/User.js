let mongoose = require("mongoose");

let userSchema = mongoose.Schema(
  {},
  {
    // this block will use when do we need to specify collection name. collection name should be case sensitive
    //otherwise model plural name consider as collection name
    collection: "users",
  }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
