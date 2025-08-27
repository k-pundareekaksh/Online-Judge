const mongoose = require("mongoose");

const Role = mongoose.model(
    "Role",
    new mongoose.Schema({
        name: {
            type: String,
            required: true,
            enum: ["user", "admin"],
            trim: true
        }
    })
);

module.exports = Role;