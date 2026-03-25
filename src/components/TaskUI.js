/**
 * TaskUI — renders a Panoptes workflow task as an interactive form.
 *
 * Panoptes workflow.tasks is an object like:
 * {
 *   "T0": {
 *     "type": "single",         // single-answer question
 *     "question": "Is this a spiral galaxy?",
 *     "answers": [{ "label": "Yes" }, { "label": "No" }, { "label": "Star or artifact" }],
 *     "next": "T1",             // next task (or null if last)
 *     "help": "Look for spiral arms..."
 *   },
 *   "T1": {
 *     "type": "multiple",       // multiple-answer (checkboxes)
 *     "question": "Select all that apply:",
 *     "answers": [...]
 *   }
 * }
 *
 * This component handles:
 * - "single" tasks (radio buttons — pick one answer)
 * - "multiple" tasks (checkboxes — pick many)
 * - Unknown types show a fallback with raw JSON
 *
 * The `annotations` prop is the current annotation state (managed by parent).
 * `onAnnotate(taskKey, value)` is called when the user changes their answer.
 */
function TaskUI({ tasks, firstTask, annotations, onAnnotate }) {
  if (!tasks || !firstTask) {
    return <div className="text-muted">No tasks defined for this workflow</div>;
  }

  // Walk the task chain starting from firstTask
  const taskChain = buildTaskChain(tasks, firstTask, annotations);

  return (
    <div className="task-ui">
      {taskChain.map(({ key, task }) => (
        <TaskBlock
          key={key}
          taskKey={key}
          task={task}
          annotation={annotations[key]}
          onAnnotate={onAnnotate}
        />
      ))}
    </div>
  );
}

/**
 * Build the chain of tasks to display. A task's `next` field points to the
 * next task to show (or can be per-answer for branching workflows).
 */
function buildTaskChain(tasks, firstTask, annotations) {
  const chain = [];
  let currentKey = firstTask;
  const visited = new Set();

  while (currentKey && tasks[currentKey] && !visited.has(currentKey)) {
    visited.add(currentKey);
    const task = tasks[currentKey];
    chain.push({ key: currentKey, task });

    // Determine next task
    const annotation = annotations[currentKey];
    if (task.type === 'single' && annotation !== undefined && annotation !== null) {
      // For branching: answer may have its own `next`
      const answer = task.answers?.[annotation];
      currentKey = answer?.next ?? task.next ?? null;
    } else if (task.next) {
      currentKey = task.next;
    } else {
      currentKey = null;
    }
  }

  return chain;
}

function TaskBlock({ taskKey, task, annotation, onAnnotate }) {
  const type = task.type || 'unknown';

  return (
    <div className="task-block">
      {task.question && (
        <h3 className="task-question">{task.question}</h3>
      )}

      {task.instruction && (
        <p className="task-instruction text-muted" style={{ fontSize: '14px' }}>
          {task.instruction}
        </p>
      )}

      {type === 'single' && (
        <SingleTask
          taskKey={taskKey}
          answers={task.answers || []}
          value={annotation}
          onAnnotate={onAnnotate}
        />
      )}

      {type === 'multiple' && (
        <MultipleTask
          taskKey={taskKey}
          answers={task.answers || []}
          value={annotation || []}
          onAnnotate={onAnnotate}
        />
      )}

      {type !== 'single' && type !== 'multiple' && (
        <div className="text-muted" style={{ fontSize: '13px' }}>
          <p>Task type "{type}" — custom rendering not yet implemented.</p>
          <details>
            <summary>Raw task definition</summary>
            <pre className="whitespace-pre-wrap break-words" style={{ fontSize: '12px' }}>
              {JSON.stringify(task, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {task.help && (
        <details className="task-help">
          <summary className="text-muted" style={{ fontSize: '13px', cursor: 'pointer' }}>
            Need help?
          </summary>
          <p style={{ fontSize: '13px' }}>{task.help}</p>
        </details>
      )}
    </div>
  );
}

function SingleTask({ taskKey, answers, value, onAnnotate }) {
  return (
    <div className="task-answers">
      {answers.map((answer, index) => (
        <label key={index} className="task-answer-label">
          <input
            type="radio"
            name={taskKey}
            checked={value === index}
            onChange={() => onAnnotate(taskKey, index)}
          />
          <span>{answer.label}</span>
        </label>
      ))}
    </div>
  );
}

function MultipleTask({ taskKey, answers, value, onAnnotate }) {
  const toggleAnswer = (index) => {
    const current = Array.isArray(value) ? value : [];
    const next = current.includes(index)
      ? current.filter(i => i !== index)
      : [...current, index];
    onAnnotate(taskKey, next);
  };

  return (
    <div className="task-answers">
      {answers.map((answer, index) => (
        <label key={index} className="task-answer-label">
          <input
            type="checkbox"
            checked={Array.isArray(value) && value.includes(index)}
            onChange={() => toggleAnswer(index)}
          />
          <span>{answer.label}</span>
        </label>
      ))}
    </div>
  );
}

export default TaskUI;
