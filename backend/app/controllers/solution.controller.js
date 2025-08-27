const axios = require("axios");
require("dotenv").config();
const db = require("../models");
const Solution = db.solution;
const Problem = db.problem;
const Testcase = db.testcase;

const COMPILER_BACKEND_URL = process.env.COMPILER_BACKEND_URL;

// Helper function to categorize and format errors
const categorizeError = (rawResponse) => {
  const { success, error, message, details, stderr, compilationErrors, runtimeErrors, formattedError, executionTime, memoryUsed } = rawResponse;

  if (success) return null;

  let verdict = "Runtime Error";
  let errorMessage = message || "Unknown error occurred";
  let detailedError = details || stderr || message || "Unknown error occurred";

  switch (error) {
    case "COMPILATION_ERROR":
      verdict = "Compilation Error";
      errorMessage = "Code compilation failed";
      if (formattedError) detailedError = formattedError;
      else if (compilationErrors?.length) {
        detailedError = compilationErrors.map(err => `Line ${err.line}: ${err.message}`).join("\n");
      }
      break;

    case "TIMEOUT_ERROR":
    case "EXECUTION_TIMEOUT":
      verdict = "Time Limit Exceeded";
      errorMessage = "Time Limit Exceeded";
      detailedError = `Your code took too long to execute (timeout after ${executionTime || 'unknown'}ms)`;
      break;

    case "MEMORY_LIMIT_EXCEEDED":
      verdict = "Memory Limit Exceeded";
      errorMessage = "Memory Limit Exceeded";
      detailedError = `Your code used too much memory (${memoryUsed ? Math.round(memoryUsed / 1024) : 'unknown'}KB)`;
      break;

    case "RUNTIME_ERROR":
      verdict = "Runtime Error";
      errorMessage = "Runtime Error";
      if (formattedError) detailedError = formattedError;
      else if (runtimeErrors?.length) detailedError = runtimeErrors.map(err => err.message).join("\n");
      break;

    case "OUTPUT_LIMIT_EXCEEDED":
      verdict = "Output Limit Exceeded";
      errorMessage = "Output Limit Exceeded";
      detailedError = "Your code produced too much output. The output size exceeded the maximum limit.";
      break;

    case "SEGMENTATION_FAULT":
      verdict = "Runtime Error";
      errorMessage = "Segmentation Fault";
      detailedError = "Segmentation fault - Your code tried to access memory it doesn't own. Check array bounds, pointer usage, and stack overflow.";
      break;

    case "FLOATING_POINT_EXCEPTION":
      verdict = "Runtime Error";
      errorMessage = "Floating Point Exception";
      detailedError = "Division by zero or invalid floating point operation detected.";
      break;

    default:
      verdict = "Runtime Error";
      errorMessage = message || "Code execution failed";
      detailedError = formattedError || stderr || details || message || "Unknown error occurred";
  }

  return { verdict, errorMessage, detailedError, executionTime: executionTime || 0, memoryUsed: memoryUsed || 0 };
};

// Execute code via compiler backend
const executeCode = async (code, language, input) => {
  try {
    const response = await axios.post(COMPILER_BACKEND_URL, { code, language, input }, { timeout: 30000 });
    return response.data;
  } catch (err) {
    console.error("Compiler backend error:", err.message);
    if (err.code === 'ECONNABORTED') return { success: false, error: "TIMEOUT_ERROR", message: "Request timed out", details: "The compiler backend took too long to respond" };
    if (err.response) return err.response.data || { success: false, error: "BACKEND_ERROR", message: "Compiler backend returned an error" };
    if (err.request) return { success: false, error: "NETWORK_ERROR", message: "Cannot connect to compiler backend" };
    return { success: false, error: "UNKNOWN_ERROR", message: "Unexpected error occurred", details: err.message };
  }
};

// just run
exports.runCode = async (req, res) => {
  try {
    const { problemId, code, language = "cpp" } = req.body;

    if (!code?.trim()) return res.status(400).json({ success: false, verdict: "Invalid Input", message: "Code cannot be empty" });
    if (!problemId) return res.status(400).json({ success: false, verdict: "Invalid Input", message: "Problem ID is required" });

    const visibleTestcases = await Testcase.find({ problem: problemId, isHidden: false });
    if (!visibleTestcases.length) return res.status(404).json({ success: false, verdict: "No Testcases", message: "No visible testcases found for this problem" });

    let results = [];
    let overallVerdict = "Accepted";
    let firstError = null;

    for (const [index, tc] of visibleTestcases.entries()) {
      const rawResponse = await executeCode(code, language, tc.input);

      if (!rawResponse.success) {
        const errorInfo = categorizeError(rawResponse);
        if (!firstError) firstError = errorInfo;
        overallVerdict = errorInfo.verdict;

        results.push({
          testcase: index + 1,
          input: tc.isHidden ? "[Hidden]" : tc.input,
          expected: tc.isHidden ? "[Hidden]" : (tc.output || "").toString(),
          got: errorInfo.detailedError,
          status: "Error",
          verdict: errorInfo.verdict,
          details: errorInfo.detailedError,
          executionTime: errorInfo.executionTime,
          memoryUsed: errorInfo.memoryUsed,
          isHidden: tc.isHidden || false
        });

        if (errorInfo.verdict === "Compilation Error") break;
        continue;
      }

      const actualOutput = (rawResponse.output || "").toString().trim();
      const expectedOutput = (tc.output || "").toString().trim();
      const passed = actualOutput === expectedOutput;
      if (!passed && overallVerdict === "Accepted") overallVerdict = "Wrong Answer";

      results.push({
        testcase: index + 1,
        input: tc.isHidden ? "[Hidden]" : tc.input,
        expected: tc.isHidden ? "[Hidden]" : expectedOutput,
        got: actualOutput,
        status: passed ? "Passed" : "Failed",
        verdict: passed ? "Passed" : "Wrong Answer",
        details: passed ? "" : `Expected: ${expectedOutput}\nGot: ${actualOutput}`,
        executionTime: rawResponse.executionTime || 0,
        memoryUsed: rawResponse.memoryUsed || 0,
        isHidden: tc.isHidden || false
      });
    }

    const response = {
      success: true,
      verdict: overallVerdict,
      results,
      summary: {
        totalTestcases: visibleTestcases.length,
        passed: results.filter(r => r.status === "Passed").length,
        failed: results.filter(r => r.status === "Failed").length,
        errors: results.filter(r => r.status === "Error").length
      }
    };

    if (firstError) {
      response.error = {
        type: firstError.verdict,
        message: firstError.errorMessage,
        details: firstError.detailedError
      };
    }

    return res.json(response);
  } catch (err) {
    console.error("runCode error:", err);
    return res.status(500).json({ success: false, verdict: "System Error", message: "Internal server error", details: process.env.NODE_ENV !== 'production' ? err.stack : "Please try again later" });
  }
};

// submit solution
exports.submitSolution = async (req, res) => {
  try {
    const { problemId, code, language = "cpp" } = req.body;
    const userId = req.userId;

    if (!code?.trim()) return res.status(400).json({ success: false, verdict: "Invalid Input", message: "Code cannot be empty" });
    if (!problemId) return res.status(400).json({ success: false, verdict: "Invalid Input", message: "Problem ID is required" });

    const testcases = await Testcase.find({ problem: problemId });
    if (!testcases.length) return res.status(404).json({ success: false, verdict: "No Testcases", message: "No testcases found for this problem" });

    let overallVerdict = "Accepted";
    let results = [];
    let firstError = null;
    let passedCount = 0;

    for (const [index, tc] of testcases.entries()) {
      const rawResponse = await executeCode(code, language, tc.input);

      if (!rawResponse.success) {
        const errorInfo = categorizeError(rawResponse);
        if (!firstError) firstError = errorInfo;
        overallVerdict = errorInfo.verdict;

        results.push({
          testcase: index + 1,
          input: tc.isHidden ? "[Hidden]" : tc.input,
          expected: tc.isHidden ? "[Hidden]" : (tc.output || "").toString(),
          got: errorInfo.detailedError,
          status: "Error",
          verdict: errorInfo.verdict,
          details: errorInfo.detailedError,
          executionTime: errorInfo.executionTime,
          memoryUsed: errorInfo.memoryUsed,
          isHidden: tc.isHidden || false
        });

        break; // fail fast for compilation/runtime errors
      }

      const actualOutput = (rawResponse.output || "").toString().trim();
      const expectedOutput = (tc.output || "").toString().trim();
      const passed = actualOutput === expectedOutput;
      if (passed) passedCount++;
      else if (overallVerdict === "Accepted") overallVerdict = "Wrong Answer";

      results.push({
        testcase: index + 1,
        input: tc.isHidden ? "[Hidden]" : tc.input,
        expected: tc.isHidden ? "[Hidden]" : expectedOutput,
        got: passed ? actualOutput : `Expected: ${expectedOutput}\nGot: ${actualOutput}`,
        status: passed ? "Passed" : "Failed",
        verdict: passed ? "Passed" : "Wrong Answer",
        details: passed ? "" : `Expected: ${expectedOutput}\nGot: ${actualOutput}`,
        executionTime: rawResponse.executionTime || 0,
        memoryUsed: rawResponse.memoryUsed || 0,
        isHidden: tc.isHidden || false
      });

      if (!passed) break; // stop at first WA
    }

    const solution = new Solution({
      user: userId,
      problem: problemId,
      code,
      language,
      verdict: overallVerdict,
      results,
      score: passedCount,
      totalTestcases: testcases.length
    });
    await solution.save();

    const response = {
      success: true,
      message: "Solution submitted successfully",
      verdict: overallVerdict,
      solutionId: solution._id,
      results,
      summary: {
        totalTestcases: testcases.length,
        passed: passedCount,
        failed: results.filter(r => r.status === "Failed").length,
        errors: results.filter(r => r.status === "Error").length,
        score: `${passedCount}/${testcases.length}`
      }
    };

    if (firstError) {
      response.error = {
        type: firstError.verdict,
        message: firstError.errorMessage,
        details: firstError.detailedError
      };
    }

    return res.status(201).json(response);

  } catch (err) {
    console.error("submitSolution error:", err);
    return res.status(500).json({ success: false, verdict: "System Error", message: "Internal server error during submission", details: process.env.NODE_ENV !== 'production' ? err.stack : "Please try again later" });
  }
};


// Get all solutions of the logged-in user
exports.getMySolutions = async (req, res) => {
    try {
        const solutions = await Solution.find({ user: req.userId })
            .populate("problem", "title statement difficulty")
            .sort({ submitted_at: -1 });

        res.status(200).send(solutions);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Get all solutions for a specific problem (Admin only)
exports.getSolutionsByProblem = async (req, res) => {
    try {
        const solutions = await Solution.find({ problem: req.params.problemId })
            .populate("user", "username email")
            .populate("problem", "title statement difficulty")
            .sort({ submitted_at: -1 });

        res.status(200).send(solutions);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Delete a solution (Admin only)
exports.deleteSolution = async (req, res) => {
    try {
        const deleted = await Solution.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).send({ message: "Solution not found" });
        }

        res.status(200).send({ message: "Solution deleted successfully!" });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};