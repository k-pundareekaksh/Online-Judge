const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.model");

db.problem = require("./problem.model");
db.testcase = require("./testcase.model");
db.solution = require("./solution.model");

db.ROLES = ["user", "admin"];

module.exports = db;