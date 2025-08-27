const config = require("../config/auth.config");
const db = require("../models");

const Problem = db.problem;
const Testcase = db.testcase;
const Solution = db.solution;

// only admin can create new problems 
exports.createProblem = async (req, res) => {
    try {
        const { title, statement, difficulty, testcases } = req.body;

        // 1. Create problem
        const problem = new Problem({
            title,
            statement,
            difficulty: difficulty || "Easy",
        });
        await problem.save();

        // 2. If testcases were provided, save them with problemId
        let savedTestcases = [];
        if (Array.isArray(testcases) && testcases.length > 0) {
            savedTestcases = await Testcase.insertMany(
                testcases.map(tc => ({
                    problem: problem._id,
                    input: tc.input,
                    output: tc.output,
                    isHidden: tc.isHidden ?? false,
                }))
            );
        }

        res.status(201).send({
            message: "Problem created successfully!",
            problem,
            testcases: savedTestcases,
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};


// get all problems - accessible to all users
exports.getProblems = async (req, res) => {
    try {
        const problems = await Problem.find();
        res.status(200).send(problems);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// get single problem by ID with visible testcases
exports.getProblemById = async (req, res) => {
    try {
        const problem = await Problem.findById(req.params.id);
        if (!problem) return res.status(404).send({ message: "Problem not found" });

        const visibleTestcases = await Testcase.find({
            problem: problem._id,
            isHidden: false
        });

        return res.status(200).send({
            ...problem.toObject(),
            testcases: visibleTestcases.map(tc => ({
                id: tc._id,
                input: tc.input,
                expectedOutput: tc.output
            }))
        });
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};



// Update problem (Admin only)
exports.updateProblem = async (req, res) => {
    try {
        const updatedProblem = await Problem.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true } // return updated doc
        );

        if (!updatedProblem) {
            return res.status(404).send({ message: "Problem not found" });
        }

        res.status(200).send({ message: "Problem updated successfully!", updatedProblem });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Delete problem (Admin only)
exports.deleteProblem = async (req, res) => {
    try {
        const problemId = req.params.id;

        const problem = await Problem.findByIdAndDelete(problemId);
        if (!problem) {
            return res.status(404).send({ message: "Problem not found" });
        }

        // Cascade delete testcases
        await Testcase.deleteMany({ problem: problemId });

        // Cascade delete solutions
        await Solution.deleteMany({ problem: problemId });

        res.status(200).send({
            message: "Problem (and associated testcases and solutions) deleted successfully!"
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};