import axios from "axios";
import authHeader from "../services/auth-header";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

class TestcaseService {
  // Get all testcases for a problem
  getTestcasesByProblem(problemId) {
    return axios.get(`${BASE_URL}/api/problems/${problemId}/testcases`, {
      headers: authHeader(),
    }).then((res) => res.data);
  }

  // Create testcase
  createTestcase(problemId, data) {
    return axios.post(
      `${BASE_URL}/api/problems/${problemId}/testcases`,
      data,
      { headers: authHeader() }
    ).then((res) => res.data);
  }

  // Update testcase
  updateTestcase(testcaseId, data) {
    return axios.put(`${BASE_URL}/api/testcases/${testcaseId}`, data, {
      headers: authHeader(),
    }).then((res) => res.data);
  }

  // Delete testcase
  deleteTestcase(testcaseId) {
    return axios.delete(`${BASE_URL}/api/testcases/${testcaseId}`, {
      headers: authHeader(),
    }).then((res) => res.data);
  }
}

export default new TestcaseService();
