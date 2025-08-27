import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import ProblemService from "../services/problem.service";
import TestcaseService from "../services/testcase.service";

export default function ManageTestcases() {
  const { problemId } = useParams();
  const [problem, setProblem] = useState(null);
  const [testcases, setTestcases] = useState([]);
  const [newTestcase, setNewTestcase] = useState({ input: "", output: "", isHidden: false });
  const [editingTestcase, setEditingTestcase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const getPayload = (resp) => (resp && (resp.data ?? resp)) ?? null;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const p = await ProblemService.getProblemById(problemId);
        const problemData = getPayload(p);
        if (mounted) setProblem(problemData); 

        await fetchTestcases();
      } catch (e) {
        console.error(e);
        if (mounted) setErr("Failed to load problem");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [problemId]);

  const fetchTestcases = async () => {
    setErr(null);
    try {
      const res = await TestcaseService.getTestcasesByProblem(problemId);
      const payload = getPayload(res);
      setTestcases(Array.isArray(payload) ? payload : []); 
    } catch (e) {
      console.error(e);
      setErr("Failed to load testcases");
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!newTestcase.input.trim() || !newTestcase.output.trim()) {
      setErr("Input and Output required");
      return;
    }
    try {
      await TestcaseService.createTestcase(problemId, {
        input: newTestcase.input,
        output: newTestcase.output,
        isHidden: newTestcase.isHidden,
      });
      setMsg("Testcase added");
      setNewTestcase({ input: "", output: "", isHidden: false });
      await fetchTestcases();
    } catch (e) {
      console.error(e);
      setErr("Failed to add testcase");
    }
  };


  const handleUpdate = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    if (!editingTestcase.input.trim() || !editingTestcase.output.trim()) {
      setErr("Input and Output required");
      return;
    }
    try {
      await TestcaseService.updateTestcase(editingTestcase._id, editingTestcase);
      setMsg("Testcase updated");
      setEditingTestcase(null);
      await fetchTestcases();
    } catch (e) {
      console.error(e);
      setErr("Failed to update testcase");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this testcase?")) return;
    try {
      await TestcaseService.deleteTestcase(id);
      setMsg("Testcase deleted");
      await fetchTestcases();
    } catch (e) {
      console.error(e);
      setErr("Failed to delete testcase");
    }
  };

  if (loading) return <div className="container"><div className="card">Loading...</div></div>;

  return (
    <div className="container">
      <div className="admin-page">
        <h2 className="page-title">Manage Testcases</h2>
        <p className="page-subtitle">Problem: <strong>{problem?.title ?? "Unknown"}</strong></p>

        {msg && <div className="alert success" role="status">{msg}</div>}
        {err && <div className="alert danger" role="alert">{err}</div>}

        {/* Add / Edit form */}
        <form
          onSubmit={editingTestcase ? handleUpdate : handleAdd}
          className="admin-form"
          style={{ marginBottom: 20 }}
        >
          <h3 style={{ marginBottom: 12 }}>{editingTestcase ? "Edit Testcase" : "Add New Testcase"}</h3>

          <label>Input</label>
          <textarea
            name="input"
            value={editingTestcase ? editingTestcase.input : newTestcase.input}
            onChange={handleChange}
            rows={5}
            placeholder="stdin input"
          />

          <label>Expected Output</label>
          <textarea
            name="output"
            value={editingTestcase ? editingTestcase.output : newTestcase.output}
            onChange={handleChange}
            rows={5}
            placeholder="expected stdout"
          />

          <label className="checkbox-inline" style={{ marginBottom: 12 }}>
            <input
              type="checkbox"
              name="isHidden"
              checked={editingTestcase ? !!editingTestcase.isHidden : !!newTestcase.isHidden}
              onChange={handleChange}
            />
            <span>Hidden testcase</span>
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              className="btn-primary"
            >
              {editingTestcase ? "Update Testcase" : "Add Testcase"}
            </button>
            {editingTestcase ? (
              <button type="button" className="btn-secondary" onClick={() => setEditingTestcase(null)}>Cancel</button>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setNewTestcase({ input: "", output: "", isHidden: false })}>Clear</button>
            )}
          </div>
        </form>

        {/* Existing testcases list */}
        <div className="card admin-form">
          <h3 style={{ marginBottom: 12 }}>Existing Testcases ({testcases.length})</h3>
          {testcases.length === 0 && <div className="muted">No testcases yet.</div>}

          <div className="testcase-list" style={{ marginTop: 8 }}>
            {testcases.map((t, idx) => (
              <details className="testcase-card" key={t._id}>
                <summary className="tc-summary">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <svg className="chev" width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                      <path fill="currentColor" d="M9 18l6-6-6-6" />
                    </svg>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--accent)" }}>Testcase #{idx + 1}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {String(t.input).slice(0, 80)}{String(t.input).length > 80 ? "…" : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {t.isHidden && <span className="status-badge" style={{ fontSize: 12, padding: "6px 8px" }}>Hidden</span>}
                    <button type="button" className="btn-link" onClick={(e) => { e.stopPropagation(); setEditingTestcase(t); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                    <button type="button" className="btn-remove" onClick={(e) => { e.stopPropagation(); handleDelete(t._id); }}>Delete</button>
                  </div>
                </summary>

                <div className="tc-content">
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Input</div>
                    <pre className="pre-block">{t.input}</pre>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Output</div>
                    <pre className="pre-block">{t.output}</pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}