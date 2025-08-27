const { authJwt } = require("../middlewares");
const controller = require("../controllers/testcase.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "x-access-token, Origin, Content-Type, Accept"
        );
        next();
    });

    // Create testcase for a problem (Admin only)
    app.post(
        "/api/problems/:problemId/testcases",
        [authJwt.verifyToken, authJwt.isAdmin],
        controller.createTestcase
    );

    // Get all testcases for a problem (Users/Admins)
    app.get(
        "/api/problems/:problemId/testcases",
        [authJwt.verifyToken],
        controller.getTestcasesByProblem
    );

    // Update testcase (Admin only)
    app.put(
        "/api/testcases/:id",
        [authJwt.verifyToken, authJwt.isAdmin],
        controller.updateTestcase
    );

    // Delete testcase (Admin only)
    app.delete(
        "/api/testcases/:id",
        [authJwt.verifyToken, authJwt.isAdmin],
        controller.deleteTestcase
    );
};