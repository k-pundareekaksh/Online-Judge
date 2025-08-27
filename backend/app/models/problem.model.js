const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  statement: { type: String, required: true },
  difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "easy" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Problem", problemSchema);