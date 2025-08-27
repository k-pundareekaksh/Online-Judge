import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import SubmissionService from "../services/solution.service";
import ProblemService from "../services/problem.service";

export default function Profile() {
  const { user: currentUser } = useSelector((state) => state.auth || {});
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState([]);
  const [problemTitles, setProblemTitles] = useState({});
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const getPayload = (resp) => (resp && (resp.data ?? resp)) ?? null;

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await SubmissionService.getMySolutions();
        const payload = getPayload(res) ?? [];
        const subs = Array.isArray(payload) ? payload : payload.solutions ?? [];
        if (!mounted) return;
        setSubmissions(subs);

        const idsToFetch = new Set();
        subs.forEach((s) => {
          const pid = s.problemId ?? (s.problem && (s.problem._id ?? s.problem.id)) ?? null;
          const hasTitle = (s.problemTitle && String(s.problemTitle).trim()) || (s.problem && s.problem.title);
          if (pid && !hasTitle) idsToFetch.add(String(pid));
        });

        if (idsToFetch.size > 0) {
          const idArray = Array.from(idsToFetch);
          const fetches = idArray.map(async (id) => {
            try {
              const pResp = await ProblemService.getProblemById(id);
              const pPayload = getPayload(pResp) ?? {};
              const problemObj = pPayload.problem ?? pPayload;
              const title = problemObj?.title ?? problemObj?.name ?? "Unknown Problem";
              return [id, title];
            } catch {
              return [id, "Unknown Problem"];
            }
          });

          const kv = await Promise.all(fetches);
          if (!mounted) return;
          setProblemTitles((prev) => {
            const next = { ...prev };
            kv.forEach(([id, title]) => {
              if (!next[id]) next[id] = title;
            });
            return next;
          });
        }
      } catch {
        if (mounted) setErr("Failed to load submissions");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const getProblemTitleFor = (sub) => {
    const pid = sub.problemId ?? (sub.problem && (sub.problem._id ?? sub.problem.id)) ?? null;
    const direct = sub.problemTitle ?? (sub.problem && (sub.problem.title ?? sub.problem.name));
    if (direct && String(direct).trim()) return direct;
    if (pid && problemTitles[String(pid)]) return problemTitles[String(pid)];
    return "Unknown Problem";
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 text-gray-100">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Profile Info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex items-center gap-4 bg-gray-800 rounded-xl shadow p-4 w-full md:w-auto">
            <img
              src={`https://api.dicebear.com/6.x/identicon/svg?seed=${currentUser.username}`}
              alt="avatar"
              className="w-20 h-20 rounded-full"
            />
            <div>
              <h2 className="text-xl font-semibold">{currentUser.username}</h2>
              <p className="text-gray-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto justify-center">
            <div className="bg-gray-800 rounded-xl shadow p-4 text-center">
              <div className="text-lg font-bold">{submissions.length}</div>
              <div className="text-sm text-gray-400">Submissions</div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800 rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold mb-4">My Submissions</h3>
          {loading ? (
            <p className="text-gray-400">Loading submissions...</p>
          ) : err ? (
            <p className="text-red-400">{err}</p>
          ) : submissions.length === 0 ? (
            <p className="text-gray-400">You have no submissions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-700 text-left">
                    <th className="px-3 py-2 font-medium text-gray-300">Problem</th>
                    <th className="px-3 py-2 font-medium text-gray-300">Language</th>
                    <th className="px-3 py-2 font-medium text-gray-300">Verdict</th>
                    <th className="px-3 py-2 font-medium text-gray-300">Submitted At</th>
                    <th className="px-3 py-2 font-medium text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const pid = sub.problemId ?? (sub.problem && (sub.problem._id ?? sub.problem.id)) ?? "";
                    const title = getProblemTitleFor(sub);
                    return (
                      <tr
                        key={sub._id || sub.id || Math.random()}
                        className="border-t border-gray-700 hover:bg-gray-700/50"
                      >
                        <td className="px-3 py-2">
                          <Link to={`/problems/${pid}`} className="text-blue-400 hover:underline">
                            {title}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{sub.language || "—"}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              String(sub.verdict).toLowerCase() === "accepted"
                                ? "bg-green-900 text-green-300"
                                : "bg-red-900 text-red-300"
                            }`}
                          >
                            {sub.verdict}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-400">
                          {new Date(sub.submitted_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl overflow-hidden">
            <div className="flex justify-between items-center border-b border-gray-700 px-4 py-3">
              <h4 className="font-semibold">
                Submission — {getProblemTitleFor(selectedSubmission)}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard?.writeText(selectedSubmission.code || "")}
                  className="text-blue-400 hover:underline text-sm"
                >
                  Copy
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-400 hover:underline text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                <div>
                  <strong className="text-gray-300">Language:</strong>{" "}
                  {selectedSubmission.language || "—"}
                </div>
                <div>
                  <strong className="text-gray-300">Verdict:</strong> {selectedSubmission.verdict}
                </div>
                <div>
                  <strong className="text-gray-300">Submitted:</strong>{" "}
                  {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </div>
              </div>
              <pre className="bg-gray-900 text-gray-100 text-sm rounded p-4 overflow-auto max-h-[70vh]">
                {selectedSubmission.code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
