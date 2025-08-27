import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProblemService from "../services/problem.service";
import SolutionService from "../services/solution.service";

export default function ProblemList() {
    const [problems, setProblems] = useState([]);
    const [statuses, setStatuses] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getPayload = (resp) => {
        if (!resp) return null;
        return resp.data ?? resp;
    };

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const [problemsResp, submissionsResp] = await Promise.all([
                    ProblemService.getAllProblems(),
                    SolutionService.getMySolutions(),
                ]);

                const problemsData = getPayload(problemsResp) || [];
                const submissionsData = getPayload(submissionsResp) || [];

                const problemsArr = Array.isArray(problemsData) ? problemsData : [];
                const submissionsArr = Array.isArray(submissionsData) ? submissionsData : [];

                const statusMap = {};
                for (const sub of submissionsArr) {

                    const problemId = sub?.problem?._id ?? sub?.problem;
                    if (!problemId) continue;
                    // if already solved, skip
                    if (statusMap[problemId] === "Solved") continue;

                    if ((sub.verdict || "").toString() === "Accepted") {
                        statusMap[problemId] = "Solved";
                    } else {
                        // mark attempted if not solved already
                        if (!statusMap[problemId]) statusMap[problemId] = "Attempted";
                    }
                }

                if (mounted) {
                    setProblems(problemsArr);
                    setStatuses(statusMap);
                }
            } catch (err) {
                console.error("Failed loading problems/submissions:", err);
                if (mounted) setError("Failed to load problems");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, []);

    const formatDifficulty = (diff) => {
        if (!diff) return "Unknown";
        const s = diff.toString();
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    if (loading) return <p>Loading problems...</p>;
    if (error) return <p className="error">{error}</p>;

    if (!problems.length) {
        return (
            <div className="container">
                <h2>Problems</h2>
                <p>No problems found.</p>
            </div>
        );
    }

    return (
    <div className="container">
        <h2>Problems</h2>

        <div className="table-wrap">
        <table className="table">
            <thead>
            <tr>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Status</th>
            </tr>
            </thead>

            <tbody>
            {problems.map((problem) => {
                const pid = problem._id ?? problem.id;
                const difficulty = formatDifficulty(problem.difficulty);
                const status = statuses[pid];

                const statusClass =
                status === "Solved"
                    ? "status-solved"
                    : status === "Attempted"
                    ? "status-attempted"
                    : "status-unsolved";

                const statusLabel =
                status === "Solved" ? "✔ Solved" : status === "Attempted" ? "⏳ Attempted" : "❌ Unsolved";

                return (
                <tr key={pid}>
                    <td data-label="Title">
                    <Link to={`/problems/${pid}`} className="problem-link">
                        {problem.title ?? problem.name ?? "Untitled Problem"}
                    </Link>
                    </td>

                    <td data-label="Difficulty">
                    <span className="difficulty">{difficulty}</span>
                    </td>

                    <td data-label="Status">
                    <span className={`status-badge ${statusClass}`}>
                        <span className="emoji">{status === "Solved" ? "✔" : status === "Attempted" ? "⏳" : "❌"}</span>
                        <span>{statusLabel.replace(/^[✔⏳❌]\s*/, "")}</span>
                    </span>
                    </td>
                </tr>
                );
            })}
            </tbody>
        </table>
        </div>
    </div>
    );
}