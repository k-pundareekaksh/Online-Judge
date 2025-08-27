import axios from "axios";
import authHeader from "../services/auth-header";

const API_URL = import.meta.env.VITE_API_BASE_URL + "api/problems";

class ProblemService {
  getAllProblems() {
    return axios.get(API_URL, { headers: authHeader() }).then((res) => res.data);
  }

  createProblem(data) {
    return axios.post(API_URL, data, { headers: authHeader() }).then((res) => res.data);
  }

  updateProblem(problemId, data) {
    return axios.put(`${API_URL}/${problemId}`, data, { headers: authHeader() }).then((res) => res.data);
  }

  deleteProblem(problemId) {
    return axios.delete(`${API_URL}/${problemId}`, { headers: authHeader() }).then((res) => res.data);
  }

  getProblemById(problemId) {
    return axios.get(`${API_URL}/${problemId}`, { headers: authHeader() }).then((res) => res.data);
  }
}

export default new ProblemService();