import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import CodeMirror from "@uiw/react-codemirror";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";

import ProblemService from "../services/problem.service";
import TestcaseService from "../services/testcase.service";
import SubmissionService from "../services/solution.service";
import "../styles/ModernCompiler.css";
import Navbar from "./navbar";

import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

function ModernCompiler() {
  const { id } = useParams();
  const [problem, setProblem] = useState(null);
  const [testcases, setTestcases] = useState([]);

  // persistence templates and config
  const STORAGE_PREFIX = "modern_compiler";
  const languageTemplates = {
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {

    return 0;
}`,
    python: `def main():
    pass

if __name__ == "__main__":
    main()`,
    c: `#include <stdio.h>
int main() {
    return 0;
}`,
    java: `public class Main {
    public static void main(String[] args) {
    }
}`,
  };

  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(() => languageTemplates.cpp);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [aiReview, setAiReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [results, setResults] = useState([]);
  const [runResults, setRunResults] = useState([]);
  const [showRunResults, setShowRunResults] = useState(false);
  const [showSubmitResults, setShowSubmitResults] = useState(false);
  const outputRef = useRef(null);

  // UI: Layout state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [activeConsoleTab, setActiveConsoleTab] = useState("console");
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  // Vertical split pane (left/right panels)
  const [splitPosition, setSplitPosition] = useState(() => {
    const saved = localStorage.getItem("splitPosition");
    return saved ? parseFloat(saved) : 50;
  });
  const [isDragging, setIsDragging] = useState(false);
  const splitRef = useRef(null);

  // Horizontal split pane (editor/console)
  const [editorHeight, setEditorHeight] = useState(() => {
    const saved = localStorage.getItem("editorHeight");
    return saved ? parseFloat(saved) : 60;
  });
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false);

  // save debounce ref + savedAt indicator
  const saveTimerRef = useRef(null);
  const [savedAt, setSavedAt] = useState(null);

  const cleanErrorMsg = (msg = "") =>
    String(msg).replace(/\/app\/(codes|inputs|outputs)\/[^\:]*:/g, "").trim();

  const getPayload = (resp) => (resp && (resp.data ?? resp)) ?? null;

  const normalize = (s) =>
    String(s ?? "").replace(/\s+/g, " ").trim();

  const tcInput = (tc) => {
    if (!tc && tc !== 0) return "";
    if (typeof tc === "string" || typeof tc === "number") return String(tc);
    return tc?.input ?? tc?.stdin ?? tc?.input_data ?? tc?.sampleInput ?? tc?.in ?? "";
  };

  const tcExpected = (tc) => {
    if (!tc && tc !== 0) return "";
    if (typeof tc === "string" || typeof tc === "number") return "";
    return tc?.expectedOutput ?? tc?.expected ?? tc?.output ?? tc?.expected_out ?? "";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const probRes = await ProblemService.getProblemById(id);
        const prob = getPayload(probRes) ?? probRes;
        setProblem(prob);

        if (prob && prob.testcases && prob.testcases.length) {
          const filtered = prob.testcases.filter((tc) => !tc.isHidden && tc.input != null);
          setTestcases(filtered);
        } else {
          const tcs = getPayload(probRes) ?? probRes;
          const filtered = (Array.isArray(tcs) ? tcs : []).filter((tc) => !tc.isHidden);
          setTestcases(filtered);
        }
      } catch (err) {
        console.error("Error fetching problem or testcases:", err);
      }
    };

    fetchData();
  }, [id]);

  // ---------- Persistence: load saved code when id or language changes ----------
  useEffect(() => {
    try {
      const key = `${STORAGE_PREFIX}_code_${id}_${language}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setCode(saved);
      } else {
        setCode(languageTemplates[language] ?? languageTemplates.cpp);
      }
    } catch (err) {
      console.warn("Failed to load saved code:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, language]);

  // ---------- Persistence: save code (debounced) ----------
  useEffect(() => {
    const key = `${STORAGE_PREFIX}_code_${id}_${language}`;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, code);
        setSavedAt(Date.now());
      } catch (err) {
        console.warn("Could not persist code to localStorage:", err);
      }
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [code, id, language]);

  // ---------- Save on beforeunload as a final attempt ----------
  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        const key = `${STORAGE_PREFIX}_code_${id}_${language}`;
        localStorage.setItem(key, code);
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [code, id, language]);

  // ---------- Handlers: Run / Submit / AI Review ----------
  const handleRun = useCallback(async () => {
    setLoading(true);
    setOutput("");
    setRunResults([]);
    setVerdict(null);
    setActiveConsoleTab("console");

    try {
      const data = await SubmissionService.runCode(id, code, language, input);
      if (!data) {
        setOutput("No response from server.");
        return;
      }
      if (data.success === false && data.error) {
        setOutput("Compilation Error:\n" + cleanErrorMsg(data.error));
        return;
      }
      if (Array.isArray(data.results) && data.results.length) {
        setRunResults(data.results);
        const first = data.results[0];
        const firstOut = first?.actualOutput ?? first?.got ?? "";
        setOutput(firstOut || "Code executed successfully. Check test results for details.");
        setShowRunResults(true);
        setActiveConsoleTab("testcases");
        return;
      }
      if (typeof data.output === "string") {
        setOutput(data.output);
        return;
      }
      setOutput("Code executed successfully.");
    } catch (err) {
      console.error("Run error:", err);
      const msg = err?.response?.data?.message || err.message || String(err);
      setOutput("Error running code: " + msg);
    } finally {
      setLoading(false);
    }
  }, [id, code, language, input]);

  const handleSubmit = async () => {
    setSubmitLoading(true);
    setResults([]);
    setVerdict(null);
    setActiveConsoleTab("results");

    try {
      const data = await SubmissionService.submitSolution(id, code, language);
      if (!data) {
        setVerdict("No response from server");
        return;
      }
      setVerdict(data.verdict || "No verdict");
      setResults(Array.isArray(data.results) ? data.results : []);
      setShowSubmitResults(true);
    } catch (err) {
      console.error("Submit error:", err);
      setVerdict(
        "Error submitting: " +
          (err?.response?.data?.message || err.message || String(err))
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAiReview = async () => {
    setReviewLoading(true);
    setActiveConsoleTab("ai-review");

    try {
      const { data } = await SubmissionService.aiReview(code, problem.statement || "");
      setAiReview(data.aiReview || "No review returned.");
    } catch (err) {
      console.error("AI review error:", err);
      setAiReview("Error in AI review: " + (err?.message || String(err)));
    } finally {
      setReviewLoading(false);
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output || "");
    } catch (e) {
      console.warn("Copy failed", e);
    }
  };

  const clearOutput = () => {
    setOutput("");
    setRunResults([]);
    setResults([]);
    setVerdict(null);
    setAiReview("");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const mac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      if ((mac && e.metaKey && e.key === "Enter") || (!mac && e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        if (!loading) handleRun();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRun, loading]);

  // Vertical split pane handlers (left/right panels)
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !splitRef.current) return;

      const rect = splitRef.current.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
      const clampedPosition = Math.max(20, Math.min(80, newPosition));
      setSplitPosition(clampedPosition);
      localStorage.setItem("splitPosition", clampedPosition.toString());
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Horizontal split pane handlers (editor/console)
  const handleHorizontalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingHorizontal(true);
  }, []);

  useEffect(() => {
    const handleHorizontalMouseMove = (e) => {
      if (!isDraggingHorizontal) return;

      const rightPanel = document.querySelector(".right-panel");
      if (!rightPanel) return;

      const rect = rightPanel.getBoundingClientRect();
      const newEditorPercent = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedPercent = Math.max(20, Math.min(80, newEditorPercent));

      setEditorHeight(clampedPercent);
      localStorage.setItem("editorHeight", clampedPercent.toString());
    };

    const handleHorizontalMouseUp = () => {
      setIsDraggingHorizontal(false);
    };

    if (isDraggingHorizontal) {
      document.addEventListener('mousemove', handleHorizontalMouseMove);
      document.addEventListener('mouseup', handleHorizontalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleHorizontalMouseMove);
      document.removeEventListener('mouseup', handleHorizontalMouseUp);
    };
  }, [isDraggingHorizontal]);

  if (!problem) {
    return (
      <div className="modern-compiler-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading problem...</div>
      </div>
    );
  }

  const title = problem.title ?? problem.name ?? "Untitled Problem";
  const statement = problem.statement ?? problem.description ?? "";

  const getDifficultyColor = (difficulty) => {
    const diff = String(difficulty).toLowerCase();
    if (diff.includes('easy')) return 'easy';
    if (diff.includes('medium')) return 'medium';
    if (diff.includes('hard')) return 'hard';
    return 'medium';
  };

  const getVerdictColor = (verdict) => {
    if (!verdict) return '';
    const v = verdict.toLowerCase();
    if (v.includes('accepted') || v.includes('pass')) return 'accepted';
    if (v.includes('wrong') || v.includes('fail')) return 'wrong';
    if (v.includes('time')) return 'tle';
    if (v.includes('memory')) return 'mle';
    return 'other';
  };

  // format savedAt as relative/simple string
  const savedLabel = savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : null;

  return (
    <div className="modern-compiler">
      {/* Header */}
      <header className="modern-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
          <h1 className="problem-title">{title}</h1>
          <span className={`difficulty-badge ${getDifficultyColor(problem.difficulty)}`}>
            {String(problem.difficulty)}
          </span>
        </div>

        <div className="header-right">
          <div className="keyboard-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run
          </div>
          {savedLabel && <div className="saved-indicator" title={new Date(savedAt).toString()}>{savedLabel}</div>}
        </div>
      </header>

      {/* Main Content */}
      <div className="modern-main" ref={splitRef}>
        {/* Left Panel */}
        <div
          className={`left-panel ${sidebarCollapsed ? 'collapsed' : ''}`}
          style={{ width: sidebarCollapsed ? '0%' : `${splitPosition}%` }}
        >
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              Description
            </button>
            <button
              className={`tab ${activeTab === 'testcases' ? 'active' : ''}`}
              onClick={() => setActiveTab('testcases')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
              </svg>
              Test Cases
              <span className="tab-count">{testcases.length}</span>
            </button>
          </div>

          <div className="panel-content">
            {activeTab === 'description' && (
              <div className="description-content">
                <div className="problem-statement">
                  {statement || "No description available."}
                </div>

                {problem.examples && problem.examples.length > 0 && (
                  <div className="examples-section">
                    <h3>Examples</h3>
                    {problem.examples.map((ex, i) => (
                      <div key={i} className="example-card">
                        <div className="example-header">Example {i + 1}</div>
                        <div className="example-io">
                          <div className="io-block">
                            <div className="io-label">Input:</div>
                            <code className="io-value">{ex.input}</code>
                          </div>
                          <div className="io-block">
                            <div className="io-label">Output:</div>
                            <code className="io-value">{ex.output}</code>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'testcases' && (
              <div className="testcases-content">
                {testcases.length > 0 ? (
                  testcases.map((tc, i) => (
                    <div key={i} className="testcase-card">
                      <div className="testcase-header">Test Case {i + 1}</div>
                      <div className="testcase-io">
                        <div className="io-block">
                          <div className="io-label">Input:</div>
                          <code className="io-value">{tcInput(tc) || "(empty)"}</code>
                        </div>
                        <div className="io-block">
                          <div className="io-label">Expected Output:</div>
                          <code className="io-value">{tcExpected(tc) || "(not provided)"}</code>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                    </svg>
                    <p>No test cases available</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vertical Splitter */}
        {!sidebarCollapsed && (
          <div
            className={`splitter ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Right Panel */}
        <div
          className="right-panel"
          style={{
            width: sidebarCollapsed ? '100%' : `${100 - splitPosition}%`,
            marginLeft: sidebarCollapsed ? '0' : '4px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Code Editor */}
          <div
            className="editor-container"
            style={{
              height: `${editorHeight}%`,
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="editor-header">
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  try {
                    const prevKey = `${STORAGE_PREFIX}_code_${id}_${language}`;
                    localStorage.setItem(prevKey, code);
                  } catch (err) {
                    console.warn("Could not save previous language code:", err);
                  }
                  setLanguage(newLang);
                }}
                className="language-select"
              >
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>

              <div className="editor-actions">
                <button
                  className="action-btn run-btn"
                  onClick={handleRun}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Run Code
                    </>
                  )}
                </button>

                <button
                  className="action-btn submit-btn"
                  onClick={handleSubmit}
                  disabled={submitLoading}
                >
                  {submitLoading ? (
                    <>
                      <div className="btn-spinner"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="editor-wrapper" style={{ flex: 1, minHeight: 0 }}>
              <CodeMirror
                className="cm-instance"
                value={code}
                height="100%"
                style={{ height: '100%' }}
                theme={oneDark}
                extensions={[
                  language === "cpp" ? cpp() :
                    language === "python" ? python() :
                      language === "c" ? cpp() :
                        language === "java" ? cpp() :
                          cpp()
                ]}
                onChange={(val) => setCode(val)}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  foldGutter: true,
                }}
              />
            </div>

          </div>

          {/* Horizontal Splitter */}
          <div
            className={`h-splitter ${isDraggingHorizontal ? 'dragging' : ''}`}
            onMouseDown={handleHorizontalMouseDown}
            style={{
              height: '4px',
              background: isDraggingHorizontal ? '#0066cc' : '#333',
              cursor: 'ns-resize',
              flexShrink: 0,
              userSelect: 'none'
            }}
          />

          {/* Console */}
          <div
            className="console-container"
            style={{
              height: `${100 - editorHeight}%`,
              minHeight: '150px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="console-header">
              <div className="console-tabs">
                <button
                  className={`console-tab ${activeConsoleTab === 'console' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('console')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9,4V6H21V4H9M9,14H21V12H9V14M9,20H21V18H9V20M5,6H7V4H5A2,2 0 0,0 3,6V18A2,2 0 0,0 5,20H7V18H5V6M11,10H13V8H11V10M11,16H13V14H11V16M15,14H17V16H15V14M15,8H17V10H15V8Z" />
                  </svg>
                  Console
                </button>
                <button
                  className={`console-tab ${activeConsoleTab === 'testcases' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('testcases')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                  </svg>
                  Test Results
                  {runResults.length > 0 && (
                    <span className="tab-badge">{runResults.length}</span>
                  )}
                </button>
                <button
                  className={`console-tab ${activeConsoleTab === 'results' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('results')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z" />
                  </svg>
                  Submission
                  {verdict && (
                    <span className={`tab-badge verdict-${getVerdictColor(verdict)}`}>
                      {verdict.includes('Accepted') ? '✓' : '✗'}
                    </span>
                  )}
                </button>
                <button
                  className={`console-tab ${activeConsoleTab === 'ai-review' ? 'active' : ''}`}
                  onClick={() => setActiveConsoleTab('ai-review')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,2L13.09,8.26L22,9L17,14L18.18,23L12,19.77L5.82,23L7,14L2,9L10.91,8.26L12,2Z" />
                  </svg>
                  AI Review
                </button>
              </div>

              <div className="console-actions">
                <button className="console-action" onClick={copyOutput} title="Copy output">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                  </svg>
                </button>
                <button className="console-action" onClick={clearOutput} title="Clear all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="console-content" style={{ flex: 1, overflow: 'auto' }}>
              {activeConsoleTab === 'console' && (
                <div className="console-panel">
                  <div className="input-section">
                    <label className="input-label">Custom Input:</label>
                    <textarea
                      className="custom-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Enter your custom input here..."
                      rows={4}
                    />
                  </div>

                  <div className="output-section">
                    <label className="output-label">Output:</label>
                    <div className="output-display">
                      <pre className="output-text">
                        {output || "Click 'Run Code' to see output here..."}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeConsoleTab === 'testcases' && (
                <div className="console-panel">
                  {runResults.length > 0 ? (
                    <div className="test-results">
                      {testcases.map((tc, i) => {
                        let run = runResults[i] || null;
                        if (!run && runResults.length) {
                          const tcIn = normalize(tcInput(tc));
                          run = runResults.find((r) => normalize(r.input) === tcIn) || null;
                        }

                        const passed = run ? (run.passed || run.status === "Passed" || String(run.result).toLowerCase().includes("pass")) : null;
                        const actual = run ? (run.actualOutput ?? run.got ?? run.output ?? "") : null;

                        return (
                          <div key={i} className={`test-result ${passed === null ? 'not-run' : (passed ? 'passed' : 'failed')}`}>
                            <div className="result-header">
                              <span className="result-title">Test Case {i + 1}</span>
                              <span className="result-status">
                                {passed === null ? 'Not Run' : (passed ? 'PASSED' : 'FAILED')}
                              </span>
                            </div>
                            <div className="result-body">
                              <div className="result-section">
                                <div className="section-label">Input:</div>
                                <code className="section-value">{tcInput(tc) || "(empty)"}</code>
                              </div>
                              <div className="result-section">
                                <div className="section-label">Expected:</div>
                                <code className="section-value">{tcExpected(tc) || "(not provided)"}</code>
                              </div>
                              <div className="result-section">
                                <div className="section-label">Your Output:</div>
                                <code className={`section-value ${passed ? 'correct' : 'incorrect'}`}>
                                  {actual ?? (passed === null ? "Not run yet" : "(no output)")}
                                </code>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                      </svg>
                      <p>Run your code to see test results</p>
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'results' && (
                <div className="console-panel">
                  {!verdict && results.length === 0 ? (
                    <div className="empty-state">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z" />
                      </svg>
                      <p>Submit your solution to see results</p>
                    </div>
                  ) : (
                    <div className="submission-results">
                      {verdict && (
                        <div className={`verdict-banner verdict-${getVerdictColor(verdict)}`}>
                          <div className="verdict-icon">
                            {verdict.toLowerCase().includes('accepted') ? '🎉' : '❌'}
                          </div>
                          <div className="verdict-text">{verdict}</div>
                        </div>
                      )}

                      {results.length > 0 && (
                        <div className="submission-details">
                          {results.map((r, i) => (
                            <div key={i} className={`submission-result ${r.status === "Passed" ? 'passed' : 'failed'}`}>
                              <div className="result-header">
                                <span className="result-title">Test Case {i + 1}</span>
                                <span className="result-status">
                                  {r.status}
                                </span>
                              </div>
                              <div className="result-body">
                                <div className="result-section">
                                  <div className="section-label">Input:</div>
                                  <code className="section-value">{r.input}</code>
                                </div>
                                <div className="result-section">
                                  <div className="section-label">Expected:</div>
                                  <code className="section-value">{r.expected}</code>
                                </div>
                                <div className="result-section">
                                  <div className="section-label">Your Output:</div>
                                  <code className={`section-value ${r.status === "Passed" ? 'correct' : 'incorrect'}`}>
                                    {r.got}
                                  </code>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'ai-review' && (
                <div className="console-panel">
                  <div className="ai-review-section">
                    <div className="ai-review-header">
                      <h3>AI Code Review</h3>
                      <button
                        className="review-btn"
                        onClick={handleAiReview}
                        disabled={reviewLoading}
                      >
                        {reviewLoading ? (
                          <>
                            <div className="btn-spinner"></div>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12,2L13.09,8.26L22,9L17,14L18.18,23L12,19.77L5.82,23L7,14L2,9L10.91,8.26L12,2Z" />
                            </svg>
                            Get AI Review
                          </>
                        )}
                      </button>
                    </div>

                    <div className="ai-review-content">
                      {aiReview ? (
                        <div className="review-text">
                          <ReactMarkdown
                            children={aiReview}
                            rehypePlugins={[rehypeHighlight]}
                          />
                        </div>
                      ) : (
                        <div className="empty-state">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12,2L13.09,8.26L22,9L17,14L18.18,23L12,19.77L5.82,23L7,14L2,9L10.91,8.26L12,2Z" />
                          </svg>
                          <p>Get AI-powered feedback on your code</p>
                          <small>Click "Get AI Review" to analyze your solution</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModernCompiler;
