const express = require("express");
const cors = require("cors");
const dbConfig = require("./app/config/db.config");
const app = express();
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const { generateAiReview } = require("./app/services/generateAiReview");


dotenv.config();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.json({ message: "Welcome user!" });
});

const PORT = process.env.PORT || 8080;

const db = require("./app/models");
const Role = db.role;

db.mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connection to MongoDB established successfully.");
        initial();
    })
    .catch(err => {
        console.error("Connection error:", err);
        process.exit();
    });

require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/problem.routes")(app);
require("./app/routes/solution.routes")(app);
require("./app/routes/testcase.routes")(app);

async function initial() {
    try {
        const count = await Role.estimatedDocumentCount();
        if (count === 0) {
            await Role.create({ name: "user" });
            console.log("Added 'user' to Roles collection.");

            await Role.create({ name: "admin" });
            console.log("Added 'admin' to Roles collection.");
        }
    } catch (err) {
        console.error("Error initializing roles:", err);
    }
}

app.post("/ai-review", async (req, res) => {
    const { code, problemDescription } = req.body;

    if (!code || code.trim() === "") {
        return res.status(400).json({
            success: false,
            error: "Empty code! Please provide some code to execute"
        });
    }

    try {
        const aiReview = await generateAiReview(code, problemDescription);
        res.status(200).json({
            success: true,
            aiReview,
        });
    } catch (error) {
        console.error("Error in AI Review:", error.message);
        res.status(500).json({
            success: false,
            error: error.message || "Error in AI Review endpoint",
        });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});