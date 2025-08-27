const mongoose = require("mongoose");

const ResultSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expected: { type: String, required: true },
  got: { type: String, required: true },
  status: { type: String, enum: ["Passed", "Failed", "Error"], required: true }
}, { _id: false });

const SolutionSchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  code: { type: String, required: true },
  language: { type: String, default: "cpp" },
  verdict: { type: String, required: true }, // e.g., "Accepted", "Wrong Answer", "Compilation Error"
  results: { type: [ResultSchema], default: [] }, // array of result objects
  submitted_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Solution", SolutionSchema);