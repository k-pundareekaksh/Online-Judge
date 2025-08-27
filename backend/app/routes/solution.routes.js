const { authJwt } = require("../middlewares");
const controller = require("../controllers/solution.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Run code (just executes, does not save)
    app.post("/api/solutions/run", [authJwt.verifyToken], controller.runCode);

    // Submit solution (saves + checks against testcases)
    app.post("/api/solutions", [authJwt.verifyToken], controller.submitSolution);

    // Get my solutions
    app.get("/api/solutions/me", [authJwt.verifyToken], controller.getMySolutions);

    // Get all solutions for a problem (Admin only)
    app.get(
        "/api/solutions/problem/:problemId",
        [authJwt.verifyToken, authJwt.isAdmin],
        controller.getSolutionsByProblem
    );

    // Delete a solution (Admin only)
    app.delete(
        "/api/solutions/:id",
        [authJwt.verifyToken, authJwt.isAdmin],
        controller.deleteSolution
    );
};