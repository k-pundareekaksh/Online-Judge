import React, { useState, useEffect } from "react";
import ProblemService from "../services/problem.service";

export default function AdminPanel() {
  const [problem, setProblem] = useState({
    title: "",
    description: "",
    difficulty: "easy",
    tags: "",
  });

  const [testcases, setTestcases] = useState([
    { input: "", output: "", isHidden: false },
  ]);
  const [status, setStatus] = useState({
    message: null,
    error: null,
    creating: false,
  });

  // Auto-hide success messages after 3s
  useEffect(() => {
    if (status.message) {
      const timer = setTimeout(() => {
        setStatus((s) => ({ ...s, message: null }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status.message]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProblem((p) => ({ ...p, [name]: value }));
  };

  const handleTestcaseChange = (i, e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setTestcases((t) =>
      t.map((tc, idx) => (idx === i ? { ...tc, [name]: val } : tc))
    );
  };

  const addTestcase = () =>
    setTestcases((t) => [...t, { input: "", output: "", isHidden: false }]);

  const removeTestcase = (i) =>
    setTestcases((t) => (t.length > 1 ? t.filter((_, idx) => idx !== i) : t));

  const validate = () => {
    if (!problem.title.trim()) return "Title is required";
    if (!problem.description.trim()) return "Description is required";
    for (const [i, tc] of testcases.entries()) {
      if (!tc.input.toString().trim())
        return `Testcase ${i + 1}: input required`;
      if (!tc.output.toString().trim())
        return `Testcase ${i + 1}: output required`;
    }
    return null;
  };

  const handleReset = () => {
    setProblem({
      title: "",
      description: "",
      difficulty: "easy",
      tags: "",
    });
    setTestcases([{ input: "", output: "", isHidden: false }]);
    setStatus({ message: null, error: null, creating: false });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setStatus({ message: null, error: null, creating: false });

    const v = validate();
    if (v) {
      setStatus((s) => ({ ...s, error: v }));
      return;
    }

    const payload = {
      title: problem.title.trim(),
      statement: problem.description.trim(),
      difficulty: problem.difficulty,
      tags: (problem.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      testcases: testcases.map((tc) => ({
        input: tc.input,
        output: tc.output,
        isHidden: !!tc.isHidden,
      })),
    };

    try {
      setStatus((s) => ({ ...s, creating: true }));
      const res = await ProblemService.createProblem(payload);
      const created = res?.data ?? res;

      setStatus((s) => ({
        ...s,
        message: created?.message ?? "Problem created",
        creating: false,
      }));

      // Reset form, but keep message visible until auto-hide
      setProblem({
        title: "",
        description: "",
        difficulty: "easy",
        tags: "",
      });
      setTestcases([{ input: "", output: "", isHidden: false }]);
    } catch (err) {
      console.error(err);
      setStatus((s) => ({
        ...s,
        error:
          err?.response?.data?.message ||
          err.message ||
          "Failed to create",
        creating: false,
      }));
    }
  };

  return (
    <div className="admin-page container">
      <h1 className="page-title">Create New Problem</h1>
      <p className="page-subtitle">
        Fill in the problem details, difficulty, tags and testcases
      </p>

      <form className="admin-form" onSubmit={handleCreate}>
        {status.error && <div className="alert danger">{status.error}</div>}
        {status.message && (
          <div className="alert success">{status.message}</div>
        )}

        {/* Problem Section */}
        <section className="form-section">
          <h2>Problem Details</h2>
          <label>Title</label>
          <input
            name="title"
            value={problem.title}
            onChange={handleChange}
            placeholder="e.g. Two Sum"
          />

          <label>Description / Statement</label>
          <textarea
            name="description"
            value={problem.description}
            onChange={handleChange}
            rows={8}
            placeholder="Describe the problem, input/output format, constraints..."
          />
        </section>

        {/* Meta Section */}
        <section className="form-section row">
          <div className="col">
            <label>Difficulty</label>
            <select
              name="difficulty"
              value={problem.difficulty}
              onChange={handleChange}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="col">
            <label>Tags</label>
            <input
              name="tags"
              value={problem.tags}
              onChange={handleChange}
              placeholder="arrays, math, dp"
            />
          </div>
        </section>

        {/* Testcases Section */}
        <section className="form-section">
          <div className="tc-header">
            <h2>Testcases</h2>
            <button type="button" className="btn-add" onClick={addTestcase}>
              + Add Testcase
            </button>
          </div>

          {testcases.map((tc, idx) => (
            <details className="testcase-card" key={idx} open={idx === 0}>
              <summary className="tc-meta">
                <span className="tc-index">Testcase #{idx + 1}</span>
                <div className="tc-actions">
                  <button
                    type="button"
                    onClick={() => removeTestcase(idx)}
                    className="btn-remove"
                  >
                    Remove
                  </button>
                </div>
              </summary>

              <div className="tc-content">
                <label>Input</label>
                <textarea
                  name="input"
                  value={tc.input}
                  onChange={(e) => handleTestcaseChange(idx, e)}
                  rows={4}
                />

                <label>Output</label>
                <textarea
                  name="output"
                  value={tc.output}
                  onChange={(e) => handleTestcaseChange(idx, e)}
                  rows={4}
                />

                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    name="isHidden"
                    checked={!!tc.isHidden}
                    onChange={(e) => handleTestcaseChange(idx, e)}
                  />
                  <span>Hidden testcase</span>
                </label>
              </div>
            </details>
          ))}
        </section>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={status.creating}
          >
            {status.creating ? "Creating..." : "Create Problem"}
          </button>
          <button type="button" onClick={handleReset} className="btn-secondary">
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}