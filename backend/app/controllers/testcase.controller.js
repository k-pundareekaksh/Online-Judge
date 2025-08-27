const db = require("../models");
const Testcase = db.testcase;
const Problem = db.problem;

// Create a new testcase (Admin only)
exports.createTestcase = async (req, res) => {
    try {
        const { problemId } = req.params;
        const { input, output, isHidden } = req.body;

        // Ensure the problem exists
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).send({ message: "Problem not found" });
        }

        const testcase = new Testcase({
            problem: problemId,
            input,
            output,
            isHidden: isHidden ?? false, // default false
        });

        await testcase.save();
        res.status(201).send({ message: "Testcase created successfully!", testcase });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Get all testcases for a problem (Users/Admins)

exports.getTestcasesByProblem = async (req, res) => {
    try {
        const { problemId } = req.params;

        let filter = { problem: problemId };
        if (!req.user?.isAdmin) {
            filter.isHidden = false; // users shouldn't see hidden testcases
        }

        const testcases = await Testcase.find(filter);
        res.status(200).send(testcases);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Update testcase (Admin only)
exports.updateTestcase = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Testcase.findByIdAndUpdate(id, req.body, { new: true });

        if (!updated) {
            return res.status(404).send({ message: "Testcase not found" });
        }

        res.status(200).send({ message: "Testcase updated successfully!", updated });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Delete testcase (Admin only)
exports.deleteTestcase = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Testcase.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).send({ message: "Testcase not found" });
        }

        res.status(200).send({ message: "Testcase deleted successfully!" });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};