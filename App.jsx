import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cloneBoard, generatePuzzle, getConflicts, isBoardComplete, dateSeed } from "./sudoku.js";

const STORAGE = {
  theme: "sudoku-master-theme",
  scores: "sudoku-master-scores",
  stats: "sudoku-master-stats"
};
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const blankNotes = () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []));

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function sameBox(a, b) {
  return Math.floor(a[0] / 3) === Math.floor(b[0] / 3) &&
    Math.floor(a[1] / 3) === Math.floor(b[1] / 3);
}
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE.theme) || "light");
  const [difficulty, setDifficulty] = useState("Easy");
  const [dailyMode, setDailyMode] = useState(false);
  const [puzzle, setPuzzle] = useState(() => generatePuzzle("Easy"));
  const [board, setBoard] = useState(() => cloneBoard(generatePuzzle("Easy").puzzle));
  const [solution, setSolution] = useState(() => generatePuzzle("Easy").solution);
  const [notes, setNotes] = useState(blankNotes);
  const [notesMode, setNotesMode] = useState(false);
  const [selected, setSelected] = useState([0, 0]);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [mistakes, setMistakes] = useState(0);
  const [showErrors, setShowErrors] = useState(true);
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(false);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [scores, setScores] = useState(() => readJSON(STORAGE.scores, []));
  const [stats, setStats] = useState(() => readJSON(STORAGE.stats, { played: 0, won: 0 }));
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const timerRef = useRef(null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("sudoku-player-name") || "Player");

  const conflicts = useMemo(() => getConflicts(board), [board]);
  const fixed = useMemo(() => puzzle.puzzle.map(row => row.map(v => v !== 0)), [puzzle]);
  const [r, c] = selected;
  const selectedValue = board[r]?.[c] || 0;

  useEffect(() => {
    localStorage.setItem(STORAGE.theme, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!running || completed) return;
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [running, completed]);

  useEffect(() => {
    localStorage.setItem(STORAGE.scores, JSON.stringify(scores));
  }, [scores]);
  useEffect(() => {
    localStorage.setItem(STORAGE.stats, JSON.stringify(stats));
  }, [stats]);

  const startGame = useCallback((level = difficulty, daily = false) => {
    const generated = generatePuzzle(level, daily ? dateSeed() : null);
    setDifficulty(level);
    setDailyMode(daily);
    setPuzzle({ puzzle: generated.puzzle, solution: generated.solution });
    setBoard(cloneBoard(generated.puzzle));
    setSolution(generated.solution);
    setNotes(blankNotes());
    setSelected([0, 0]);
    setSeconds(0);
    setMistakes(0);
    setCompleted(false);
    setRunning(true);
    setNotesMode(false);
    setHistory([]);
    setFuture([]);
    setMessage(daily ? "Daily challenge started. Good luck!" : `${level} puzzle ready. Good luck!`);
  }, [difficulty]);

  // Keep the first board and solution from the same generated puzzle.
  useEffect(() => {
    const initial = generatePuzzle("Easy");
    setPuzzle(initial);
    setBoard(cloneBoard(initial.puzzle));
    setSolution(initial.solution);
  }, []);

  const saveHistory = (nextBoard, nextNotes) => {
    setHistory(h => [...h.slice(-49), { board: cloneBoard(board), notes: notes.map(row => row.map(cell => cell.slice())) }]);
    setFuture([]);
    setBoard(nextBoard);
    if (nextNotes) setNotes(nextNotes);
  };

  const checkWin = (nextBoard) => {
    if (isBoardComplete(nextBoard) && nextBoard.every((row, i) => row.every((v, j) => v === solution[i][j]))) {
      setCompleted(true);
      setRunning(false);
      setMessage("Puzzle solved! Brilliant work.");
      setStats(s => ({ played: s.played + 1, won: s.won + 1 }));
      setScores(prev => [...prev, { name: playerName || "Player", difficulty: dailyMode ? "Daily" : difficulty, time: seconds, mistakes, date: new Date().toISOString() }]
        .sort((a, b) => a.time - b.time).slice(0, 10));
    }
  };

  const enterNumber = (num) => {
    if (completed || fixed[r][c]) return;
    const next = cloneBoard(board);
    const nextNotes = notes.map(row => row.map(cell => cell.slice()));
    if (notesMode && num !== 0) {
      const current = nextNotes[r][c];
      nextNotes[r][c] = current.includes(num) ? current.filter(n => n !== num) : [...current, num].sort();
      saveHistory(next, nextNotes);
      return;
    }
    next[r][c] = num;
    nextNotes[r][c] = [];
    if (num !== 0 && num !== solution[r][c]) {
      setMistakes(m => m + 1);
      setMessage("That number doesn't match the solution.");
    } else {
      setMessage("");
    }
    saveHistory(next, nextNotes);
    checkWin(next);
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture(f => [...f, { board: cloneBoard(board), notes: notes.map(row => row.map(cell => cell.slice())) }]);
    setBoard(previous.board);
    setNotes(previous.notes);
    setHistory(h => h.slice(0, -1));
    setCompleted(false);
    setRunning(true);
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setHistory(h => [...h, { board: cloneBoard(board), notes: notes.map(row => row.map(cell => cell.slice())) }]);
    setBoard(next.board);
    setNotes(next.notes);
    setFuture(f => f.slice(0, -1));
  };

  const giveHint = () => {
    if (completed) return;
    let target = fixed[r][c] ? null : [r, c];
    if (!target || board[target[0]][target[1]] === solution[target[0]][target[1]]) {
      outer: for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) {
        if (!fixed[i][j] && board[i][j] !== solution[i][j]) { target = [i, j]; break outer; }
      }
    }
    if (!target) return;
    setSelected(target);
    const next = cloneBoard(board);
    next[target[0]][target[1]] = solution[target[0]][target[1]];
    const nextNotes = notes.map(row => row.map(cell => cell.slice()));
    nextNotes[target[0]][target[1]] = [];
    saveHistory(next, nextNotes);
    setMessage("Hint used: one correct number revealed.");
    checkWin(next);
  };

  const erase = () => enterNumber(0);
  const handleKey = useCallback((event) => {
    if (event.key >= "1" && event.key <= "9") enterNumber(Number(event.key));
    else if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") erase();
    else if (event.key === "ArrowUp") setSelected(([row, col]) => [Math.max(0, row - 1), col]);
    else if (event.key === "ArrowDown") setSelected(([row, col]) => [Math.min(8, row + 1), col]);
    else if (event.key === "ArrowLeft") setSelected(([row, col]) => [row, Math.max(0, col - 1)]);
    else if (event.key === "ArrowRight") setSelected(([row, col]) => [row, Math.min(8, col + 1)]);
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); undo(); }
  });
  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const numberCounts = Array.from({ length: 10 }, (_, n) => n === 0 ? 0 : board.flat().filter(v => v === n).length);
  const selectedConflict = conflicts.has(`${r}-${c}`);
  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span>9</span><span>×</span><span>9</span></div>
          <div><strong>Sudoku<span>Master</span></strong><small>MAKE EVERY MOVE COUNT</small></div>
        </div>
        <div className="top-actions">
          <button className="icon-button" title="How to play" onClick={() => setShowHelp(true)}>?</button>
          <button className="icon-button" title="Leaderboard" onClick={() => setShowLeaderboard(true)}>♜</button>
          <button className="icon-button theme-toggle" title="Toggle theme" onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>{theme === "light" ? "☾" : "☀"}</button>
        </div>
      </header>

      <main className="main-layout">
        <section className="intro">
          <div>
            <p className="eyebrow">{dailyMode ? "DAILY CHALLENGE" : "THE CLASSIC NUMBER PUZZLE"}</p>
            <h1>{dailyMode ? "Your daily brain boost." : "Find your flow."}</h1>
            <p className="subtitle">{dailyMode ? dateLabel : "A fresh grid. A clear mind. One satisfying solution."}</p>
          </div>
          <div className="stats-strip">
            <div><span className="stat-icon">◷</span><div><small>TIME</small><strong>{formatTime(seconds)}</strong></div></div>
            <div><span className="stat-icon">✦</span><div><small>MISTAKES</small><strong>{mistakes}</strong></div></div>
            <div><span className="stat-icon">▦</span><div><small>FILLED</small><strong>{board.flat().filter(Boolean).length}<em>/81</em></strong></div></div>
          </div>
        </section>

        <section className="game-layout">
          <div className="board-panel">
            <div className="board-heading">
              <div className="difficulty-tabs">
                {DIFFICULTIES.map(level => <button key={level} className={difficulty === level && !dailyMode ? "active" : ""} onClick={() => startGame(level)}>{level}</button>)}
              </div>
              <button className="daily-button" onClick={() => startGame("Medium", true)}>✦ Daily puzzle</button>
            </div>

            <div className="board-wrap">
              <div className="sudoku-board" role="grid" aria-label="Sudoku board">
                {board.map((row, rowIndex) => row.map((value, colIndex) => {
                  const isSelected = r === rowIndex && c === colIndex;
                  const sameNumber = selectedValue && value === selectedValue;
                  const related = r === rowIndex || c === colIndex || sameBox(selected, [rowIndex, colIndex]);
                  const conflict = conflicts.has(`${rowIndex}-${colIndex}`);
                  const wrong = showErrors && value && !fixed[rowIndex][colIndex] && value !== solution[rowIndex][colIndex];
                  const cellNotes = notes[rowIndex][colIndex];
                  return <button
                    key={`${rowIndex}-${colIndex}`}
                    role="gridcell"
                    aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}, ${value || "empty"}`}
                    className={[
                      "cell",
                      rowIndex % 3 === 2 && rowIndex !== 8 ? "box-bottom" : "",
                      colIndex % 3 === 2 && colIndex !== 8 ? "box-right" : "",
                      related ? "related" : "",
                      isSelected ? "selected" : "",
                      sameNumber && !isSelected ? "same-number" : "",
                      fixed[rowIndex][colIndex] ? "given" : "editable",
                      (conflict || wrong) ? "error" : ""
                    ].join(" ")}
                    onClick={() => setSelected([rowIndex, colIndex])}
                  >
                    {value ? <span>{value}</span> : cellNotes.length ? <span className="notes-grid">{Array.from({ length: 9 }, (_, i) => <i key={i}>{cellNotes.includes(i + 1) ? i + 1 : ""}</i>)}</span> : null}
                  </button>;
                }))}
              </div>
              {completed && <div className="win-overlay"><div className="win-card"><div className="win-star">✦</div><h2>Well solved!</h2><p>You completed the puzzle in {formatTime(seconds)}.</p><button className="primary-button" onClick={() => startGame(difficulty, dailyMode)}>Play another</button></div></div>}
            </div>

            <div className="number-pad">
              {Array.from({ length: 9 }, (_, i) => i + 1).map(num => <button key={num} className={`number-key ${selectedValue === num ? "number-active" : ""}`} onClick={() => enterNumber(num)} disabled={numberCounts[num] >= 9}>{num}<small>{9 - numberCounts[num]}</small></button>)}
            </div>
            <div className="board-footer">
              <span><i className="legend-dot given-dot"></i> Given</span>
              <span><i className="legend-dot selected-dot"></i> Selected</span>
              <span><i className="legend-dot error-dot"></i> Conflict</span>
              <span className="keyboard-hint">Tip: use keys 1–9</span>
            </div>
          </div>

          <aside className="control-panel">
            <div className="panel-card">
              <div className="panel-title"><div><p className="eyebrow">YOUR SESSION</p><h2>Game controls</h2></div><span className="live-dot"></span></div>
              <div className="control-grid">
                <button onClick={undo} disabled={!history.length}><b>↶</b><span>Undo</span></button>
                <button onClick={redo} disabled={!future.length}><b>↷</b><span>Redo</span></button>
                <button onClick={erase} disabled={fixed[r][c]}><b>⌫</b><span>Erase</span></button>
                <button onClick={giveHint}><b>✧</b><span>Hint</span></button>
              </div>
              <button className={`wide-control ${notesMode ? "toggled" : ""}`} onClick={() => setNotesMode(v => !v)}><span className="wide-icon">✎</span><span><strong>Notes mode</strong><small>Write candidate numbers</small></span><span className="switch"><i></i></span></button>
              <button className={`wide-control ${showErrors ? "toggled" : ""}`} onClick={() => setShowErrors(v => !v)}><span className="wide-icon">◎</span><span><strong>Error detection</strong><small>Highlight conflicts and wrong entries</small></span><span className="switch"><i></i></span></button>
              <div className="control-divider"></div>
              <button className="primary-button new-game" onClick={() => startGame(difficulty, false)}>＋ New game</button>
              <button className="secondary-button" onClick={() => { setBoard(cloneBoard(puzzle.puzzle)); setNotes(blankNotes()); setSeconds(0); setMistakes(0); setCompleted(false); setRunning(true); setHistory([]); setFuture([]); setMessage("Puzzle restarted."); }}>↻ Restart puzzle</button>
              {message && <p className={`message ${selectedConflict ? "message-error" : ""}`}>{message}</p>}
            </div>

            <div className="panel-card progress-card">
              <div className="panel-title"><div><p className="eyebrow">PUZZLE PROGRESS</p><h2>Keep it going</h2></div><span className="progress-percent">{Math.round(board.flat().filter(Boolean).length / 81 * 100)}%</span></div>
              <div className="progress-track"><div style={{ width: `${board.flat().filter(Boolean).length / 81 * 100}%` }}></div></div>
              <div className="progress-meta"><span>{board.flat().filter(Boolean).length} of 81 cells</span><span>{difficulty}</span></div>
              <div className="mini-stats"><div><strong>{stats.played}</strong><small>Games played</small></div><div><strong>{stats.won}</strong><small>Games won</small></div><div><strong>{stats.played ? Math.round(stats.won / stats.played * 100) : 0}%</strong><small>Win rate</small></div></div>
            </div>
            <div className="quote-card"><span>✦</span><p>“Great things are done by a series of small things brought together.”</p><small>— Vincent van Gogh</small></div>
          </aside>
        </section>
        <footer className="footer"><span>© 2026 Sudoku Master</span><span>Built for curious minds <b>♥</b></span><button onClick={() => setShowLeaderboard(true)}>View leaderboard ↗</button></footer>
      </main>

      {showLeaderboard && <div className="modal-backdrop" onClick={() => setShowLeaderboard(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowLeaderboard(false)}>×</button><p className="eyebrow">TOP PERFORMANCES</p><h2>Leaderboard</h2><p className="modal-subtitle">Your best completed games on this device.</p><label className="name-label">Player name<input value={playerName} maxLength={18} onChange={e => { setPlayerName(e.target.value); localStorage.setItem("sudoku-player-name", e.target.value); }} /></label>{scores.length ? <div className="score-list">{scores.map((score, i) => <div className="score-row" key={`${score.date}-${i}`}><span className="rank">{i + 1}</span><strong>{score.name}</strong><span className="score-level">{score.difficulty}</span><b>{formatTime(score.time)}</b></div>)}</div> : <div className="empty-state"><span>♜</span><strong>No scores yet</strong><p>Complete a puzzle to add your first score.</p></div>}<button className="secondary-button full-button" onClick={() => setScores([])}>Clear leaderboard</button></div></div>}

      {showHelp && <div className="modal-backdrop" onClick={() => setShowHelp(false)}><div className="modal help-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowHelp(false)}>×</button><p className="eyebrow">QUICK GUIDE</p><h2>How to play Sudoku</h2><p className="modal-subtitle">Fill every row, column and 3×3 box with numbers 1 through 9.</p><div className="help-list"><div><b>01</b><p><strong>Choose a cell</strong><br/>Tap any empty square on the board.</p></div><div><b>02</b><p><strong>Enter a number</strong><br/>Select a number below the board or press a key from 1 to 9.</p></div><div><b>03</b><p><strong>Use notes</strong><br/>Turn on Notes mode to pencil in possible numbers.</p></div><div><b>04</b><p><strong>Need a nudge?</strong><br/>Use Hint to reveal a correct value.</p></div></div><button className="primary-button full-button" onClick={() => setShowHelp(false)}>Got it</button></div></div>}
    </div>
  );
}
