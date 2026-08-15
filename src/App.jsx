import { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { chapters, exercises, exercisesByChapter, getExercise } from './data/exercises.js';
import { tableCatalog } from './data/database.js';
import { getExpectedResult, getTablePreview, gradeExercise, loadSqlEngine } from './lib/grader.js';
import { sqlEditorTheme, sqlSyntaxHighlighting } from './lib/editorTheme.js';

const levelLabels = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' };
const sqlEditorExtensions = [sql({ dialect: SQLite }), keymap.of([indentWithTab]), sqlSyntaxHighlighting];
const storage = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
  },
};

function initialExerciseId() {
  const id = window.location.hash.replace('#', '');
  return exercises.some((item) => item.id === id) ? id : exercises[0].id;
}

function ResultTable({ result }) {
  if (!result?.columns?.length) {
    return (
      <div className="empty-result">
        <span className="empty-glyph">⌁</span>
        <p>Kết quả query sẽ xuất hiện ở đây.</p>
      </div>
    );
  }
  return (
    <table className="result-table">
      <thead><tr>{result.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
      <tbody>
        {result.values.map((row, rowIndex) => (
          <tr key={rowIndex}>{row.map((value, columnIndex) => (
            <td key={columnIndex} className={value === null ? 'null-value' : ''}>{value === null ? 'NULL' : String(value)}</td>
          ))}</tr>
        ))}
      </tbody>
    </table>
  );
}

function SchemaCard({ table }) {
  const columns = tableCatalog[table] || [];
  return (
    <div className="schema-card">
      <div className="schema-name"><span>TABLE</span>{table}</div>
      <div className="schema-columns">
        {columns.map((column) => {
          const [name, ...type] = column.split(' ');
          return <div key={column}><b>{name}</b><span>{type.join(' ')}</span></div>;
        })}
      </div>
    </div>
  );
}

function TableBrowser({ tables }) {
  const [activeTable, setActiveTable] = useState(tables[0]);
  const [preview, setPreview] = useState(null);
  const [previewState, setPreviewState] = useState('loading');

  useEffect(() => {
    setActiveTable(tables[0]);
  }, [tables]);

  useEffect(() => {
    if (!activeTable) return;
    let active = true;
    setPreview(null);
    setPreviewState('loading');
    getTablePreview(activeTable).then((data) => {
      if (active) {
        setPreview(data);
        setPreviewState('ready');
      }
    }).catch(() => {
      if (active) setPreviewState('error');
    });
    return () => { active = false; };
  }, [activeTable]);

  if (!tables.length) return null;
  return (
    <div className="table-browser">
      <div className="table-browser-head">
        <span>Xem dữ liệu bảng</span>
        <small>{preview ? `${preview.values.length}/${preview.totalRows} hàng` : 'Đang tải…'}</small>
      </div>
      <div className="table-tabs">
        {tables.map((table) => (
          <button key={table} className={activeTable === table ? 'active' : ''} onClick={() => setActiveTable(table)}>{table}</button>
        ))}
      </div>
      <div className="table-data-scroll">
        {previewState === 'loading' && <p className="preview-message">Đang tải dữ liệu…</p>}
        {previewState === 'error' && <p className="preview-message error">Không thể đọc bảng dữ liệu.</p>}
        {previewState === 'ready' && <ResultTable result={preview} />}
      </div>
    </div>
  );
}

function ExpectedResult({ exercise }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewState, setPreviewState] = useState('idle');

  useEffect(() => {
    setOpen(false);
    setPreview(null);
    setPreviewState('idle');
  }, [exercise.id]);

  async function togglePreview() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || preview || previewState === 'loading') return;
    setPreviewState('loading');
    try {
      setPreview(await getExpectedResult(exercise));
      setPreviewState('ready');
    } catch {
      setPreviewState('error');
    }
  }

  return (
    <section className="expected-section">
      <button className="section-toggle" onClick={togglePreview} aria-expanded={open}>
        <span>Bảng kết quả tham khảo</span><b>{open ? '−' : '+'}</b>
      </button>
      {open && (
        <div className="expected-box">
          <div className="expected-note">
            <span>Kết quả kỳ vọng</span>
            <small>Dữ liệu tham khảo · không hiển thị SQL</small>
          </div>
          {previewState === 'loading' && <p className="preview-message">Đang tạo bảng kết quả…</p>}
          {previewState === 'error' && <p className="preview-message error">Không thể tạo bảng tham khảo.</p>}
          {previewState === 'ready' && (
            <div className="expected-scroll">
              <ResultTable result={preview} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Sidebar({ chapter, selectedId, completed, queryFilter, setQueryFilter, levelFilter, setLevelFilter, onSelect }) {
  const list = useMemo(() => exercisesByChapter[chapter].filter((item) => {
    const textMatch = `${item.number} ${item.title} ${item.tags.join(' ')}`.toLowerCase().includes(queryFilter.toLowerCase());
    return textMatch && (levelFilter === 'all' || item.level === levelFilter);
  }), [chapter, queryFilter, levelFilter]);

  return (
    <aside className="sidebar app-panel" aria-label="Danh sách bài tập">
      <div className="sidebar-tools">
        <label className="search-field">
          <span>⌕</span>
          <input value={queryFilter} onChange={(event) => setQueryFilter(event.target.value)} placeholder="Tìm bài tập…" />
        </label>
        <div className="level-tabs" aria-label="Lọc độ khó">
          {[['all','Tất cả'],['beginner','Cơ bản'],['intermediate','Trung'],['advanced','Khó']].map(([value,label]) => (
            <button key={value} className={levelFilter === value ? 'active' : ''} onClick={() => setLevelFilter(value)}>{label}</button>
          ))}
        </div>
      </div>
      <div className="exercise-list">
        {list.length ? list.map((item) => (
          <button key={item.id} className={`exercise-row ${selectedId === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)}>
            <span className="exercise-number">{String(item.number).padStart(2, '0')}</span>
            <span className="exercise-copy"><b>{item.title}</b><small>{levelLabels[item.level]} · {item.minutes} phút</small></span>
            <span className={`completion-dot ${completed.has(item.id) ? 'done' : ''}`} aria-label={completed.has(item.id) ? 'Đã hoàn thành' : 'Chưa hoàn thành'}>{completed.has(item.id) ? '✓' : '·'}</span>
          </button>
        )) : <p className="no-match">Không có bài phù hợp.</p>}
      </div>
      <div className="sidebar-foot">
        <span>{completed.size}/{exercises.length} bài đã hoàn thành</span>
        <div className="mini-progress"><i style={{ width: `${completed.size / exercises.length * 100}%` }} /></div>
      </div>
    </aside>
  );
}

function Lesson({ exercise, showReference, setShowReference, showSolution, setShowSolution, onUseSolution }) {
  return (
    <article className="lesson app-panel">
      <div className="lesson-inner">
        <div className="folio"><span>Bài {String(exercise.number).padStart(2, '0')}</span><span>{exercise.minutes} phút</span></div>
        <div className={`difficulty ${exercise.level}`}>{levelLabels[exercise.level]}</div>
        <h1>{exercise.title}</h1>
        <p className="chapter-kicker">Chương {exercise.chapter} · {chapters.find((c) => c.id === exercise.chapter)?.title}</p>
        <div className="ornament"><i /></div>

        <section className="context-block">
          <h2>Bối cảnh</h2>
          <p>{exercise.context}</p>
        </section>

        <section className="lesson-section">
          <h2>Yêu cầu</h2>
          <div className="task-box">
            <p>{exercise.task}</p>
            {exercise.tables.length > 0 && <div className="task-source">Dữ liệu: {exercise.tables.join(' · ')}</div>}
            <div className="tags">{exercise.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </section>

        <section className="lesson-section criteria">
          <h2>Tiêu chí hoàn thành</h2>
          <p>{exercise.success}</p>
        </section>

        <section className="reference-section">
          <button className="section-toggle" onClick={() => setShowReference((value) => !value)} aria-expanded={showReference}>
            <span>Tài liệu tham chiếu</span><b>{showReference ? '−' : '+'}</b>
          </button>
          {showReference && <div className="schemas">
            {exercise.tables.length ? exercise.tables.map((table) => <SchemaCard key={table} table={table} />) : <p className="schema-empty">Bài này tự tạo cấu trúc mới; không cần bảng nguồn.</p>}
            <TableBrowser tables={exercise.tables} />
          </div>}
        </section>

        <ExpectedResult exercise={exercise} />

        <section className="solution-section">
          <button className="section-toggle" onClick={() => setShowSolution((value) => !value)} aria-expanded={showSolution}>
            <span>Đáp án tham khảo</span><b>{showSolution ? '−' : '+'}</b>
          </button>
          {showSolution && (
            <div className="solution-box">
              <p>Hãy thử tự giải trước khi xem đáp án.</p>
              <pre>{exercise.solutionSql}</pre>
              <button onClick={onUseSolution}>Đưa vào trình soạn thảo</button>
            </div>
          )}
        </section>
      </div>
    </article>
  );
}

function Workspace({ exercise, query, setQuery, status, running, result, onRun, onHint, onReset }) {
  function onKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      onRun();
    }
  }

  const statusClass = status.kind === 'correct' ? 'correct' : status.kind === 'error' || status.kind === 'wrong' ? 'wrong' : '';
  return (
    <section className="workspace app-panel">
      <div className="workspace-head">
        <div><span className="eyebrow">SQL Workspace</span><b>SQLite · bộ nhớ tạm</b></div>
        <span className="shortcut">Ctrl ↵ để chạy</span>
      </div>
      <div className="editor-wrap">
        <div className="editor-label"><span>query.sql</span><span>UTF-8 · SQL</span></div>
        <div className="sql-editor" onKeyDownCapture={onKeyDown}>
          <CodeMirror
            key={exercise.id}
            value={query}
            height="100%"
            theme={sqlEditorTheme}
            extensions={sqlEditorExtensions}
            onChange={setQuery}
            autoFocus
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              bracketMatching: true,
              closeBrackets: false,
              autocompletion: false,
              indentOnInput: true,
            }}
            aria-label="Trình soạn thảo SQL"
          />
        </div>
      </div>
      <div className="query-toolbar">
        <div className={`run-status ${statusClass}`}><i /> <span>{status.message}</span></div>
        <div className="query-actions">
          <button onClick={onReset}>Đặt lại</button>
          <button onClick={onHint}>Gợi ý</button>
          <button className="run-button" onClick={onRun} disabled={running}>{running ? 'Đang chạy…' : 'Chạy query'} <span>▶</span></button>
        </div>
      </div>
      <div className="results-wrap">
        <div className="results-head">
          <span>Result ledger</span>
          <span>{result?.values?.length || 0} hàng · {result?.columns?.length || 0} cột</span>
        </div>
        <div className="result-scroll"><ResultTable result={result} /></div>
      </div>
    </section>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => storage.read('ct-theme', window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [selectedId, setSelectedId] = useState(initialExerciseId);
  const exercise = getExercise(selectedId);
  const chapter = chapters.find((item) => item.id === exercise.chapter);
  const [completed, setCompleted] = useState(() => new Set(storage.read('ct-completed', [])));
  const [drafts, setDrafts] = useState(() => storage.read('ct-drafts', {}));
  const [query, setQueryState] = useState(() => drafts[selectedId] || exercise.starterSql);
  const [status, setStatus] = useState({ kind: 'ready', message: 'Sẵn sàng thực thi' });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [queryFilter, setQueryFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showReference, setShowReference] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [mobilePanel, setMobilePanel] = useState('lesson');

  useEffect(() => {
    loadSqlEngine().then(() => setStatus({ kind: 'ready', message: 'SQLite đã sẵn sàng' })).catch(() => setStatus({ kind: 'error', message: 'Không thể tải máy SQL' }));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    storage.write('ct-theme', theme);
  }, [theme]);

  function setQuery(value) {
    setQueryState(value);
    const next = { ...drafts, [selectedId]: value };
    setDrafts(next);
    storage.write('ct-drafts', next);
  }

  function selectExercise(id) {
    const nextExercise = getExercise(id);
    setSelectedId(id);
    setQueryState(drafts[id] || nextExercise.starterSql);
    setResult(null);
    setStatus({ kind: 'ready', message: 'Sẵn sàng thực thi' });
    setShowSolution(false);
    setMobilePanel('lesson');
    window.history.replaceState(null, '', `#${id}`);
  }

  function selectChapter(chapterId) {
    selectExercise(exercisesByChapter[chapterId][0].id);
    setQueryFilter('');
  }

  async function runQuery() {
    if (running) return;
    setRunning(true);
    setStatus({ kind: 'running', message: 'Đang thực thi trong database mới…' });
    const outcome = await gradeExercise(exercise, query);
    setResult(outcome.result);
    setStatus({ kind: outcome.correct ? 'correct' : outcome.error ? 'error' : 'wrong', message: outcome.message });
    if (outcome.correct) {
      const next = new Set(completed).add(exercise.id);
      setCompleted(next);
      storage.write('ct-completed', [...next]);
    }
    setRunning(false);
  }

  function showHint() {
    setStatus({ kind: 'hint', message: `Gợi ý: ${exercise.hint}` });
  }

  const chapterCompleted = exercisesByChapter[exercise.chapter].filter((item) => completed.has(item.id)).length;
  const overallPercent = Math.round(completed.size / exercises.length * 100);

  return (
    <div className="app-shell" data-theme={theme}>
      <header className="topbar">
        <div className="brand">
          <div className="seal"><span>CT</span></div>
          <div><b>Common Table</b><span>SQL Study Manual</span></div>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
        <nav className="chapter-nav" aria-label="Chọn chương">
          {chapters.map((item) => <button key={item.id} className={item.id === exercise.chapter ? 'active' : ''} onClick={() => selectChapter(item.id)}><span>{item.roman}</span><small>{item.short}</small></button>)}
        </nav>
        <div className="header-progress">
          <div><span>Tiến độ</span><b>{overallPercent}%</b></div>
          <div className="header-progress-bar"><i style={{ width: `${overallPercent}%` }} /></div>
        </div>
      </header>

      <div className={`main-grid mobile-${mobilePanel}`}>
        <Sidebar chapter={exercise.chapter} selectedId={selectedId} completed={completed} queryFilter={queryFilter} setQueryFilter={setQueryFilter} levelFilter={levelFilter} setLevelFilter={setLevelFilter} onSelect={selectExercise} />
        <Lesson exercise={exercise} showReference={showReference} setShowReference={setShowReference} showSolution={showSolution} setShowSolution={setShowSolution} onUseSolution={() => { setQuery(exercise.solutionSql); setMobilePanel('editor'); }} />
        <Workspace exercise={exercise} query={query} setQuery={setQuery} status={status} running={running} result={result} onRun={runQuery} onHint={showHint} onReset={() => { setQuery(exercise.starterSql); setResult(null); setStatus({ kind: 'ready', message: 'Đã đặt lại bài tập' }); }} />
      </div>

      <div className="chapter-meter">
        <span>Chương {chapter.roman}</span><b>{chapterCompleted}/36</b><i><em style={{ width: `${chapterCompleted / 36 * 100}%` }} /></i>
      </div>
      <nav className="mobile-nav" aria-label="Chế độ xem di động">
        <button className={mobilePanel === 'list' ? 'active' : ''} onClick={() => setMobilePanel('list')}>Danh sách</button>
        <button className={mobilePanel === 'lesson' ? 'active' : ''} onClick={() => setMobilePanel('lesson')}>Đề bài</button>
        <button className={mobilePanel === 'editor' ? 'active' : ''} onClick={() => setMobilePanel('editor')}>SQL Lab</button>
      </nav>
    </div>
  );
}
