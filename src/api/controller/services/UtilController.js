const responseCode = require("./../../../config/responseCode").returnCode;
module.exports = {
  sendSuccess: async (req, res, next, data) => {
    if (module.exports.isEmpty(data.responseCode)) {
      data["responseCode"] = responseCode.validSession;
    }
    res.status(200).send({
      message: "success",
      code: responseCode.success,
      data: data,
    });
  },
  sendError: async (req, res, next, err) => {
    console.error(err);
    res.status(500).send({
      message: "failure",
      code: responseCode.error,
      data: err,
    });
  },
  isEmpty: (data) => {
    let returnObj = false;
    if (
      typeof data === "undefined" ||
      data === null ||
      data === "" ||
      data === "" ||
      Number.isNaN(data) ||
      data.length === 0
    ) {
      returnObj = true;
    }
    return returnObj;
  },
  
};
