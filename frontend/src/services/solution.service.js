import axios from "axios";
import authHeader from "./auth-header";

const API_URL = import.meta.env.VITE_API_BASE_URL + "api/solutions/";
const GEMINI_API = import.meta.env.VITE_GOOGLE_GEMINI_API_URL;

class SolutionService {
    // Run code (does NOT save to DB)
    runCode(problemId, code, language = "cpp") {
        return axios
            .post(API_URL + "run", { problemId, code, language }, { headers: authHeader() })
            .then((res) => res.data);
    }

    // Submit code (saves to DB, runs against ALL testcases)
    submitSolution(problemId, code, language = "cpp") {
        return axios
            .post(API_URL, { problemId, code, language }, { headers: authHeader() })
            .then((res) => res.data);
    }

    // Get my submissions
    getMySolutions() {
        return axios
            .get(API_URL + "me", { headers: authHeader() })
            .then((res) => res.data);
    }

    // Get all submissions for a specific problem (admin only)
    getSolutionsByProblem(problemId) {
        return axios
            .get(API_URL + "problem/" + problemId, { headers: authHeader() })
            .then((res) => res.data);
    }

    // Delete a solution (admin only)
    deleteSolution(solutionId) {
        return axios
            .delete(API_URL + solutionId, { headers: authHeader() })
            .then((res) => res.data);
    }

    // AI Review
    aiReview(code, problemDescription = "") {
        return axios.post(GEMINI_API, { code, problemDescription });
    }
}

export default new SolutionService();
