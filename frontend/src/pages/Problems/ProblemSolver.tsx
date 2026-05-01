import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaPlay, FaArrowLeft, FaBookOpen, FaFlask, FaHistory, FaCopy } from 'react-icons/fa';
import { BsFileText } from "react-icons/bs";
import { MdCloudUpload } from 'react-icons/md';
import './ProblemSolver.css';

// Types
interface TestCase {
    input: string;
    output: string;
    explanation?: string;
}

interface Problem {
    _id: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    description: string;
    constraints: string;
    starterCode: Array<{ language: string; code: string }>;
    visibleTestCases: TestCase[];
    companyTags: string[];
    topics: string[];
    pattern: string[];
    submissionsCount?: number;
    acceptedCount?: number;
    solutions?: Array<{ language: string; code: string }>;
    userSubmissions?: Array<{ 
        _id: string; 
        status: string; 
        language: string; 
        runtime: number; 
        memory: number; 
        createdAt: string; 
    }>;
    hints?: string[];
    memoryLimit?: number;
    timeLimit?: number;
}

interface TestResult {
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    isHidden?: boolean;
    runtime?: number;
    memory?: number;
}

const LANGUAGE_MAP: Record<string, string> = {
    'javascript': 'javascript',
    'python': 'python',
    'java': 'java',
    'c++': 'cpp',
};

const ProblemSolver: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Data state
    const [problem, setProblem] = useState<Problem | null>(null);
    const [loading, setLoading] = useState(true);

    // Editor state
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('javascript');

    // Execution state
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState<TestResult[] | null>(null);
    const [activeTestCase, setActiveTestCase] = useState(0);
    const [executionStatus, setExecutionStatus] = useState<'idle' | 'accepted' | 'wrong' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // UI state
    const [panelWidth, setPanelWidth] = useState(50);
    const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
    const [bottomPanelTab, setBottomPanelTab] = useState<'testcase' | 'result'>('testcase');
    const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'editorial' | 'solutions' | 'submissions'>('description');
    const [editorialLanguage, setEditorialLanguage] = useState<string>('');

    const resizing = useRef(false);
    const bottomResizing = useRef(false);

    const getAuthHeaders = useCallback(() => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }), []);

    // Fetch problem details
    useEffect(() => {
        const fetchProblem = async () => {
            if (!id) return;
            try {
                const response = await axios.get(`/api/problems/${id}`, getAuthHeaders());
                if (response.data.success) {
                    setProblem(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch problem:', error);
                toast.error('Failed to load problem details');
                navigate('/problems');
            } finally {
                setLoading(false);
            }
        };

        fetchProblem();
    }, [id, navigate, getAuthHeaders]);

    // Set starter code and editorial language
    useEffect(() => {
        if (!problem) return;
        
        if (problem.starterCode) {
            const starter = problem.starterCode.find(
                s => s.language.toLowerCase() === language.toLowerCase()
            );
            if (starter) {
                setCode(starter.code);
            } else if (problem.starterCode.length > 0) {
                // Default fallback if selected language not found
                setCode(problem.starterCode[0].code);
            } else {
                setCode('// Write your code here');
            }
        }
        
        if (problem.solutions && problem.solutions.length > 0 && !editorialLanguage) {
            setEditorialLanguage(problem.solutions[0].language);
        }
    }, [language, problem, editorialLanguage]);

    // Run Code
    const runTests = async () => {
        if (!problem) return;
        setIsRunning(true);
        setTestResults(null);
        setBottomPanelTab('result');
        setExecutionStatus('idle');
        setErrorMessage(null);

        try {
            const response = await axios.post(
                `/api/submit/run/${problem._id}`,
                { code, language },
                getAuthHeaders()
            );

            if (response.data.success) {
                const { data } = response.data;
                const result: TestResult = {
                    passed: data.status === 'Accepted',
                    input: data.input || problem.visibleTestCases[0]?.input || '',
                    expected: problem.visibleTestCases[0]?.output || '',
                    actual: data.output || '',
                    runtime: data.runtime,
                    memory: data.memory
                };

                if (data.status !== 'Accepted') {
                    setErrorMessage(data.errorMessage || data.output || 'Runtime Error');
                }

                setTestResults([result]);
                setExecutionStatus(data.status === 'Accepted' ? 'accepted' : 'wrong');
            } else {
                setExecutionStatus('error');
                setErrorMessage(response.data.message || 'Run failed');
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setExecutionStatus('error');
            setErrorMessage(err.response?.data?.message || 'Failed to run code');
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopyCode = () => {
        const solution = problem?.solutions?.find(s => s.language === editorialLanguage);
        if (solution) {
            navigator.clipboard.writeText(solution.code);
            toast.success('Code copied to clipboard!');
        }
    };

    // Submit Code
    const submitCode = async () => {
        if (!problem) return;
        setIsSubmitting(true);
        setTestResults(null);
        setBottomPanelTab('result');
        setExecutionStatus('idle');
        setErrorMessage(null);

        try {
            const response = await axios.post(
                `/api/submit/submit/${problem._id}`,
                { code, language }, // No mockSessionId
                getAuthHeaders()
            );

            if (response.data.success) {
                const { data } = response.data;

                const results: TestResult[] = data.testCasesResults?.map((tc: {
                    status: string;
                    input?: string;
                    expectedOutput?: string;
                    actualOutput?: string;
                    runtime?: number;
                    memory?: number;
                }) => ({
                    passed: tc.status === 'passed',
                    input: tc.input || 'Hidden',
                    expected: tc.expectedOutput || 'Hidden',
                    actual: tc.actualOutput || (tc.status === 'passed' ? tc.expectedOutput : 'Wrong Answer'),
                    isHidden: !tc.input,
                    runtime: tc.runtime,
                    memory: tc.memory
                })) || [];

                setTestResults(results);

                if (data.status === 'Accepted') {
                    setExecutionStatus('accepted');
                    toast.success('Accepted!');
                } else {
                    setExecutionStatus('wrong');
                    setErrorMessage(data.errorMessage);
                }
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } };
            setExecutionStatus('error');
            setErrorMessage(err.response?.data?.message || 'Submission failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resizing logic
    const handleMouseDown = () => {
        resizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizing.current) return;
        const width = (e.clientX / window.innerWidth) * 100;
        setPanelWidth(Math.min(70, Math.max(30, width)));
    };

    const handleMouseUp = () => {
        resizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleBottomMouseDown = () => {
        bottomResizing.current = true;
        document.addEventListener('mousemove', handleBottomMouseMove);
        document.addEventListener('mouseup', handleBottomMouseUp);
    };

    const handleBottomMouseMove = (e: MouseEvent) => {
        if (!bottomResizing.current) return;
        const height = window.innerHeight - e.clientY;
        setBottomPanelHeight(Math.min(600, Math.max(100, height)));
    };

    const handleBottomMouseUp = () => {
        bottomResizing.current = false;
        document.removeEventListener('mousemove', handleBottomMouseMove);
        document.removeEventListener('mouseup', handleBottomMouseUp);
    };

    if (loading) {
        return (
            <div className="problem-solver-page">
                <div className="loading-screen">
                    <div className="loading-spinner"></div>
                    <p>Loading problem...</p>
                </div>
            </div>
        );
    }

    if (!problem) return null; // Should redirect in useEffect

    return (
        <div className="problem-solver-page">
            {/* Header */}
            <header className="solver-header">
                <div className="header-left">
                    <Link to="/problems" className="btn-back">
                        <FaArrowLeft /> Problem List
                    </Link>
                    <div className="problem-title-header">
                        {problem.title}
                    </div>
                </div>
                <div className="header-right">
                    <button
                        className="btn-run"
                        onClick={runTests}
                        disabled={isRunning || isSubmitting}
                    >
                        <FaPlay size={12} /> Run
                    </button>
                    <button
                        className="btn-submit"
                        onClick={submitCode}
                        disabled={isRunning || isSubmitting}
                    >
                        <MdCloudUpload size={16} /> Submit
                    </button>
                </div>
            </header>

            <div className="solver-layout">
                {/* Left Panel */}
                <div className="description-panel" style={{ width: `${panelWidth}%` }}>
                    <div className="left-panel-tabs">
                        <button 
                            className={`left-tab ${activeLeftTab === 'description' ? 'active' : ''}`}
                            onClick={() => setActiveLeftTab('description')}
                        >
                            <BsFileText style={{ color: activeLeftTab === 'description' ? '#4a9eff' : 'inherit' }} /> Description
                        </button>
                        <span className="tab-divider"></span>
                        <button 
                            className={`left-tab ${activeLeftTab === 'editorial' ? 'active' : ''}`}
                            onClick={() => setActiveLeftTab('editorial')}
                        >
                            <FaBookOpen style={{ color: activeLeftTab === 'editorial' ? '#ffa116' : 'inherit' }} /> Editorial
                        </button>
                        <span className="tab-divider"></span>
                        <button 
                            className={`left-tab ${activeLeftTab === 'solutions' ? 'active' : ''}`}
                            onClick={() => setActiveLeftTab('solutions')}
                        >
                            <FaFlask style={{ color: activeLeftTab === 'solutions' ? '#4a9eff' : 'inherit' }} /> Solutions
                        </button>
                        <span className="tab-divider"></span>
                        <button 
                            className={`left-tab ${activeLeftTab === 'submissions' ? 'active' : ''}`}
                            onClick={() => setActiveLeftTab('submissions')}
                        >
                            <FaHistory /> Submissions
                        </button>
                    </div>

                    <div className="panel-content">
                        {activeLeftTab === 'description' && (
                            <>
                                <div className="panel-header">
                                    <h2>{problem.title}</h2>
                                    <div className="header-badges">
                                        <span className={`difficulty-badge ${problem.difficulty}`}>
                                            {problem.difficulty}
                                        </span>
                                        {problem.timeLimit && (
                                            <span className="info-badge">
                                                ⏱️ {problem.timeLimit}ms
                                            </span>
                                        )}
                                        {problem.memoryLimit && (
                                            <span className="info-badge">
                                                💾 {problem.memoryLimit}MB
                                            </span>
                                        )}
                                        {problem.submissionsCount && problem.acceptedCount ? (
                                            <span className="acceptance-badge">
                                                <FaCheckCircle style={{ marginRight: '4px', color: '#00b8a3' }} />
                                                {((problem.acceptedCount / problem.submissionsCount) * 100).toFixed(1)}% Acceptance
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="problem-description" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                    <p>{problem.description}</p>
                                </div>

                                {problem.visibleTestCases.map((tc, idx) => (
                                    <div key={idx} className="example-block">
                                        <h4>Example {idx + 1}:</h4>
                                        <div className="example-content">
                                            <div><strong>Input:</strong> <code>{tc.input}</code></div>
                                            <div><strong>Output:</strong> <code>{tc.output}</code></div>
                                            {tc.explanation && <div><strong>Explanation:</strong> {tc.explanation}</div>}
                                        </div>
                                    </div>
                                ))}

                                <div className="constraints-block">
                                    <h4>Constraints:</h4>
                                    <pre>{problem.constraints}</pre>
                                </div>

                                {problem.hints && problem.hints.length > 0 && (
                                    <div className="hints-block">
                                        <h4>Hints:</h4>
                                        <div className="hints-list">
                                            {problem.hints.map((hint, idx) => (
                                                <details key={idx} className="hint-item">
                                                    <summary>Hint {idx + 1}</summary>
                                                    <div className="hint-content">{hint}</div>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="metadata-section">
                                    {problem.topics.length > 0 && (
                                        <div className="meta-group">
                                    <h4>Topics</h4>
                                    <div className="meta-tags">
                                        {problem.topics.map(t => (
                                            <span key={t} className="tag topic">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {problem.pattern && problem.pattern.length > 0 && (
                                <div className="meta-group">
                                    <h4>Patterns</h4>
                                    <div className="meta-tags">
                                        {problem.pattern.map(p => (
                                            <span key={p} className="tag pattern">{p}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {problem.companyTags && problem.companyTags.length > 0 && (
                                <div className="meta-group">
                                    <h4>Companies</h4>
                                    <div className="meta-tags">
                                        {problem.companyTags.map(c => (
                                            <span key={c} className="tag company">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                            </>
                        )}
                        {activeLeftTab === 'editorial' && (
                            <div className="editorial-container">
                                {problem.solutions && problem.solutions.length > 0 ? (
                                    <>
                                        <div className="editorial-header">
                                            <h3>Official Solution</h3>
                                            <div className="editorial-languages-container">
                                                <span className="lang-label">Language:</span>
                                                <div className="editorial-lang-tabs">
                                                    {problem.solutions.map((sol, index) => (
                                                        <button
                                                            key={index}
                                                            className={`ed-lang-btn ${editorialLanguage === sol.language ? 'active' : ''}`}
                                                            onClick={() => setEditorialLanguage(sol.language)}
                                                        >
                                                            {sol.language}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="editorial-code-block">
                                            <button 
                                                className="copy-code-btn" 
                                                onClick={handleCopyCode}
                                                title="Copy to clipboard"
                                            >
                                                <FaCopy /> Copy
                                            </button>
                                            <pre><code>{problem.solutions.find(s => s.language === editorialLanguage)?.code || '// No solution provided for this language'}</code></pre>
                                        </div>
                                    </>
                                ) : (
                                    <div className="tab-placeholder">
                                        <FaBookOpen size={48} />
                                        <h3>No Editorial Available</h3>
                                        <p>An official solution has not been provided yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeLeftTab === 'solutions' && (
                            <div className="tab-placeholder">
                                <FaFlask size={48} />
                                <h3>Community Solutions</h3>
                                <p>User submitted solutions will appear here.</p>
                            </div>
                        )}
                        {activeLeftTab === 'submissions' && (
                            <div className="submissions-container">
                                <h3>Submission History</h3>
                                {problem.userSubmissions && problem.userSubmissions.length > 0 ? (
                                    <div className="submissions-list">
                                        {problem.userSubmissions.map((sub) => (
                                            <div key={sub._id} className="submission-item">
                                                <div className="submission-header">
                                                    <span className={`status ${sub.status === 'Accepted' ? 'success' : 'error'}`}>
                                                        {sub.status}
                                                    </span>
                                                    <span className="date">
                                                        {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                </div>
                                                <div className="submission-details">
                                                    <span><span className="label">Language:</span> {sub.language}</span>
                                                    <span><span className="label">Runtime:</span> {sub.runtime} ms</span>
                                                    <span><span className="label">Memory:</span> {sub.memory} MB</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="tab-placeholder">
                                        <FaHistory size={48} />
                                        <h3>No Submissions Yet</h3>
                                        <p>Your past submissions for this problem will be listed here.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div 
                    className="panel-resizer" onMouseDown={handleMouseDown} />

                {/* Right Side: Code Editor + Bottom Panel */}
                <div className="editor-panel" style={{ width: `${100 - panelWidth}%` }}>
                    <div className="editor-header">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="language-select"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                            <option value="c++">C++</option>
                        </select>
                    </div>

                    <div className="monaco-container">
                        <Editor
                            height="100%"
                            language={LANGUAGE_MAP[language]}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            theme="vs-dark"
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                tabSize: 2,
                            }}
                        />
                    </div>

                    <div className="bottom-resizer" onMouseDown={handleBottomMouseDown} />

                    <div className="bottom-panel" style={{ height: `${bottomPanelHeight}px` }}>
                        <div className="bottom-tabs">
                            <button
                                className={`bottom-tab ${bottomPanelTab === 'testcase' ? 'active' : ''}`}
                                onClick={() => setBottomPanelTab('testcase')}
                            >
                                <FaCheckCircle size={14} /> Test Cases
                            </button>
                            <button
                                className={`bottom-tab ${bottomPanelTab === 'result' ? 'active' : ''}`}
                                onClick={() => setBottomPanelTab('result')}
                            >
                                <FaPlay size={12} /> Test Result
                            </button>
                        </div>

                        <div className="bottom-content">
                            {bottomPanelTab === 'testcase' ? (
                                <div className="testcase-panel">
                                    <div className="case-tabs">
                                        {problem.visibleTestCases.map((_, i) => (
                                            <button
                                                key={i}
                                                className={`case-btn ${activeTestCase === i ? 'active' : ''}`}
                                                onClick={() => setActiveTestCase(i)}
                                            >
                                                Case {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    {problem.visibleTestCases[activeTestCase] && (
                                        <div className="case-details">
                                            <div className="case-io">
                                                <span className="case-label">Input</span>
                                                <div className="case-value">{problem.visibleTestCases[activeTestCase].input}</div>
                                            </div>
                                            <div className="case-io">
                                                <span className="case-label">Output</span>
                                                <div className="case-value">{problem.visibleTestCases[activeTestCase].output}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="result-panel">
                                    {executionStatus === 'idle' ? (
                                        <div className="result-empty">Run or Submit your code</div>
                                    ) : executionStatus === 'error' ? (
                                        <div className="result-error">
                                            <div className="result-status error">
                                                <FaExclamationTriangle /> Error
                                            </div>
                                            <pre className="case-value">{errorMessage}</pre>
                                        </div>
                                    ) : (
                                        <div className="result-success">
                                            <div className="case-tabs">
                                                {testResults?.map((res, i) => (
                                                    <button
                                                        key={i}
                                                        className={`case-btn ${res.passed ? 'passed' : 'failed'} ${activeTestCase === i ? 'active' : ''}`}
                                                        onClick={() => setActiveTestCase(i)}
                                                    >
                                                        {res.isHidden ? 'Hidden ' : 'Case '} {i + 1}
                                                    </button>
                                                ))}
                                            </div>

                                            {testResults && testResults[activeTestCase] && (
                                                <div className="case-details">
                                                    <div className="result-status-row">
                                                        {testResults[activeTestCase].passed ? (
                                                            <span className="result-status accepted"><FaCheckCircle /> Passed</span>
                                                        ) : (
                                                            <span className="result-status wrong"><FaTimesCircle /> Failed</span>
                                                        )}
                                                        {testResults[activeTestCase].runtime && (
                                                            <span className="metric-value">{testResults[activeTestCase].runtime}ms</span>
                                                        )}
                                                    </div>

                                                    {!testResults[activeTestCase].isHidden ? (
                                                        <>
                                                            <div className="case-io">
                                                                <span className="case-label">Input</span>
                                                                <div className="case-value">{testResults[activeTestCase].input}</div>
                                                            </div>
                                                            <div className="case-io">
                                                                <span className="case-label">Output</span>
                                                                <div className="case-value">{testResults[activeTestCase].actual}</div>
                                                            </div>
                                                            <div className="case-io">
                                                                <span className="case-label">Expected</span>
                                                                <div className="case-value">{testResults[activeTestCase].expected}</div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="hidden-case">
                                                            🔒 Hidden Test Case
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProblemSolver;
