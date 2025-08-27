const { authJwt } = require("../middlewares");
const controller = require("../controllers/problem.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Create new problem (Admin only)
    app.post("/api/problems", [authJwt.verifyToken, authJwt.isAdmin], controller.createProblem);

    // Get all problems (All users)
    app.get("/api/problems", [authJwt.verifyToken], controller.getProblems);

    // Get problem by ID (All users)
    app.get("/api/problems/:id", [authJwt.verifyToken], controller.getProblemById);

    // Update problem (Admin only)
    app.put("/api/problems/:id", [authJwt.verifyToken, authJwt.isAdmin], controller.updateProblem);

    // Delete problem (Admin only)
    app.delete("/api/problems/:id", [authJwt.verifyToken, authJwt.isAdmin], controller.deleteProblem);
};
