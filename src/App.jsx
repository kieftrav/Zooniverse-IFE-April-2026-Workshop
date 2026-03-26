import { useState, useEffect, useCallback } from 'react';
import panoptesService from './services/panoptesService';
import SubjectViewer from './components/SubjectViewer.jsx';
import TaskUI from './components/TaskUI.jsx';
import config from './config';

function App() {
  // Core state
  const [project, setProject] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [subjectIndex, setSubjectIndex] = useState(0);
  const [annotations, setAnnotations] = useState({});
  const [classificationStartedAt, setClassificationStartedAt] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [environment, setEnvironment] = useState(config.environment);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [classified, setClassified] = useState(0);
  const [activeTab, setActiveTab] = useState('classify');
  const [authUser, setAuthUser] = useState(null);
  const [exporting, setExporting] = useState({});

  const currentSubject = subjects[subjectIndex] || null;
  const firstTask = workflow?.first_task || (workflow?.tasks ? Object.keys(workflow.tasks)[0] : null);
  // Not gatekeeping on annotations — allow submitting empty/partial classifications.
  // Task-type-specific validation belongs in TaskUI if needed later.
  const hasAnnotation = true;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project') || config.projectId;
    const workflowId = params.get('workflow') || config.workflowId;
    const env = params.get('env') || config.environment;

    setEnvironment(env);

    if (projectId) {
      initialize(projectId, workflowId, env);
    } else {
      setLoading(false);
      setError('No project ID. Add ?project=YOUR_PROJECT_ID to the URL, or set it in src/config.js');
    }
  }, []);

  const initialize = async (projectId, workflowId, env) => {
    setLoading(true);
    setError(null);

    try {
      // Auto-auth from .env if credentials present
      const username = import.meta.env.VITE_PANOPTES_USERNAME;
      const password = import.meta.env.VITE_PANOPTES_PASSWORD;
      if (username && password && !panoptesService.isAuthenticated()) {
        try {
          const { user } = await panoptesService.signIn(username, password, env);
          setAuthUser(user?.login || username);
        } catch (authErr) {
          console.warn('Auto-auth failed, continuing as anonymous:', authErr.message);
        }
      }

      const projectData = await panoptesService.getProject(projectId, env);
      setProject(projectData);

      let workflowData;
      if (workflowId) {
        workflowData = await panoptesService.getWorkflow(workflowId, env);
      } else {
        workflowData = await panoptesService.getActiveWorkflow(projectId, env);
      }
      setWorkflow(workflowData);

      const subjectData = await panoptesService.getSubjects(
        workflowData.id, env, config.subjectBatchSize
      );
      setSubjects(subjectData);
      setClassificationStartedAt(new Date().toISOString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    setExporting(prev => ({ ...prev, [type]: true }));
    try {
      let data, filename;
      if (type === 'project') {
        data = await panoptesService.getProject(project.id, environment);
        filename = `project-${project.id}.json`;
      } else if (type === 'workflow') {
        data = await panoptesService.getWorkflow(workflow.id, environment);
        filename = `workflow-${workflow.id}.json`;
      } else if (type === 'subject-sets') {
        data = await panoptesService.getSubjectSets(workflow.id, environment);
        filename = `subject-sets-${workflow.id}.json`;
      } else if (type === 'subjects') {
        data = await panoptesService.getSubjects(workflow.id, environment, config.subjectBatchSize);
        filename = `subjects-${workflow.id}.json`;
      }
      await fetch('/__export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data })
      });
    } catch (err) {
      console.error(`Export ${type} failed:`, err.message);
    } finally {
      setExporting(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleAnnotate = useCallback((taskKey, value) => {
    setAnnotations(prev => ({ ...prev, [taskKey]: value }));
    setSubmissionResult(null);
  }, []);

  const advanceSubject = useCallback(() => {
    if (subjectIndex < subjects.length - 1) {
      setSubjectIndex(prev => prev + 1);
    } else {
      setSubjectIndex(0);
    }
    setAnnotations({});
    setSubmissionResult(null);
    setClassificationStartedAt(new Date().toISOString());
  }, [subjectIndex, subjects.length]);

  const handleSubmit = async () => {
    if (!currentSubject || !workflow || !hasAnnotation) return;

    setSubmitting(true);
    setSubmissionResult(null);

    try {
      // Build annotations from user input; if none, send each workflow task with an empty value
      // so Panoptes doesn't reject "Annotations can't be blank".
      const userAnnotations = Object.entries(annotations).map(([task, value]) => ({ task, value }));
      const fallbackAnnotations = Object.keys(workflow.tasks || {}).map(task => ({ task, value: [] }));
      const classificationData = {
        annotations: userAnnotations.length > 0 ? userAnnotations : fallbackAnnotations,
        metadata: {
          workflow_version: workflow.version || '1.0',
          started_at: classificationStartedAt,
          finished_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          user_language: navigator.language,
          utc_offset: String(new Date().getTimezoneOffset() * 60),
          source: 'zoo-playground',
          viewport: { width: window.innerWidth, height: window.innerHeight }
        },
        links: {
          project: project.id,
          workflow: workflow.id,
          subjects: [currentSubject.id]
        },
        completed: true
      };

      const result = await panoptesService.createClassification(classificationData, environment);
      setSubmissionResult({ success: true, data: result });
      setClassified(prev => prev + 1);

      setTimeout(() => advanceSubject(), 800);
    } catch (err) {
      setSubmissionResult({ success: false, error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const talkUrl = config.links.talkBoard ||
    (project ? `https://www.zooniverse.org/projects/${project.slug}/talk` : null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 style={{ fontSize: '18px', margin: 0 }}>
            {project?.display_name || config.title}
          </h1>
          <span className="text-muted" style={{ fontSize: '12px' }}>
            {environment} · {classified} classified · {authUser ? `signed in as ${authUser}` : 'anonymous'}
          </span>
        </div>
        <nav className="header-nav">
          <button
            onClick={() => setActiveTab('classify')}
            className={`tab-button ${activeTab === 'classify' ? 'active' : ''}`}
          >
            Classify
          </button>
          {project && (
            <button
              onClick={() => setActiveTab('project')}
              className={`tab-button ${activeTab === 'project' ? 'active' : ''}`}
            >
              About
            </button>
          )}
          {talkUrl && (
            <a href={talkUrl} target="_blank" rel="noopener noreferrer" className="tab-button">
              Talk
            </a>
          )}
        </nav>
      </header>

      <main className="app-main">
        {loading && (
          <div className="center-state">
            <p>Loading project from {environment}...</p>
          </div>
        )}

        {error && !loading && (
          <div className="center-state">
            <h2>Something went wrong</h2>
            <p className="text-error">{error}</p>
            <p className="text-muted" style={{ fontSize: '14px' }}>
              Try: ?project=21852 or ?project=2007&env=staging&workflow=3789
            </p>
          </div>
        )}

        {!loading && !error && activeTab === 'classify' && (
          <div className="classify-layout">
            <div className="classify-subject">
              <SubjectViewer subject={currentSubject} />
              {subjects.length > 0 && (
                <div className="subject-progress">
                  <span className="text-muted" style={{ fontSize: '12px' }}>
                    {subjectIndex + 1} / {subjects.length}
                  </span>
                </div>
              )}
            </div>

            <div className="classify-task">
              {workflow?.tasks ? (
                <>
                  <TaskUI
                    tasks={workflow.tasks}
                    firstTask={firstTask}
                    annotations={annotations}
                    onAnnotate={handleAnnotate}
                  />

                  <div className="classify-actions">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !hasAnnotation}
                      className="submit-button"
                    >
                      {submitting ? 'Submitting...' : 'Done'}
                    </button>
                    <button
                      onClick={advanceSubject}
                      disabled={submitting}
                      className="skip-button"
                    >
                      Skip
                    </button>
                  </div>

                  {submissionResult && (
                    <div className={`mt-sm p-sm rounded-sm ${submissionResult.success ? 'success' : 'error'}`}>
                      <span className={submissionResult.success ? 'success-text' : 'error-text'}
                            style={{ fontSize: '13px' }}>
                        {submissionResult.success
                          ? 'Classification submitted!'
                          : `Error: ${submissionResult.error}`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted">No tasks defined for this workflow.</p>
              )}
            </div>
          </div>
        )}

        {!loading && !error && activeTab === 'project' && project && (
          <div className="about-page">
            <h2>{project.display_name}</h2>
            {project.description && (
              <p style={{ fontSize: '14px' }}>{project.description}</p>
            )}
            {project.introduction && (
              <div style={{ fontSize: '14px' }}>{project.introduction}</div>
            )}
            <div className="about-links">
              <a href={`https://www.zooniverse.org/projects/${project.slug}`}
                 target="_blank" rel="noopener noreferrer">
                View on Zooniverse
              </a>
              {config.links.privacyPolicy && (
                <a href={config.links.privacyPolicy} target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              )}
              {config.links.termsOfUse && (
                <a href={config.links.termsOfUse} target="_blank" rel="noopener noreferrer">
                  Terms of Use
                </a>
              )}
            </div>
            <details className="mt-lg">
              <summary className="text-muted" style={{ fontSize: '13px', cursor: 'pointer' }}>
                Raw project data
              </summary>
              <pre className="whitespace-pre-wrap break-words" style={{ fontSize: '12px' }}>
                {JSON.stringify(project, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </main>

      {!loading && !error && project && workflow && (
          <div className="export-bar">
            <span className="text-muted" style={{ fontSize: '12px' }}>Export to ./exports/</span>
            <div className="export-buttons">
              {['project', 'workflow', 'subject-sets', 'subjects'].map(type => (
                <button
                  key={type}
                  onClick={() => handleExport(type)}
                  disabled={exporting[type]}
                  className="export-button"
                >
                  {exporting[type] ? '...' : type}
                </button>
              ))}
            </div>
          </div>
        )}

      <footer className="app-footer">
        <span className="text-muted" style={{ fontSize: '11px' }}>
          Powered by Zooniverse · Panoptes API · zoo-playground
        </span>
      </footer>
    </div>
  );
}

export default App;