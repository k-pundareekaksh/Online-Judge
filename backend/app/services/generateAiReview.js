const { GoogleGenAI } = require("@google/genai");
const dotenv = require("dotenv");
dotenv.config();

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

const generateAiReview = async (code, problemDescription = "") => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are a code review expert. Review the following code for the given problem:
        
        Problem Description:
        ${problemDescription}

        Code:
        ${code}

        Provide a short, concise review, including:
        - Quality and readability of the code
        - Potential improvements
        - Time and space complexity analysis
        `,
    });

    return response.text;
};

module.exports = { generateAiReview };