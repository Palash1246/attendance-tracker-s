import React, { useEffect, useState, useCallback, useRef } from "react";
import "./App.css";
import { fetchWordOfTheDay, submitGuess } from "./api.js";
import { buildKeyStates } from "./utils/helpers.js";
import { WIN_MESSAGES, getLossMessage } from "./utils/messages.js";

const keyboardLayout = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["Enter","Z","X","C","V","B","N","M","←"]
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

// localStorage key scoped to today's UTC date — auto-invalidates tomorrow
function getTodayKey() {
  return `wordle_state_${new Date().toISOString().slice(0, 10)}`;
}

function getInitialState() {
  try {
    const saved = localStorage.getItem(getTodayKey());
    if (saved) {
      const parsed = JSON.parse(saved);
      // Restore saved state but always start with loading: true
      // so the server ping still happens on mount
      return { ...parsed, loading: true, error: "" };
    }
  } catch (_) {
    // Corrupted storage — start fresh
  }
  return {
    guesses: [],     // [{ guess: string, result: string[] }]
    current: "",
    gameOver: false,
    message: "",
    answer: "",
    error: "",
    loading: true,
  };
}

export default function App() {
  const [state, setState] = useState(getInitialState);
  const [shakeRowIndex, setShakeRowIndex] = useState(null);

  // Destructure for convenience
  const { guesses, current, gameOver, message, error, loading } = state;

  const triggerShake = (rowIndex) => {
    setShakeRowIndex(rowIndex);
    setTimeout(() => {
      setShakeRowIndex(null);
    }, 600);
  };

  // Fetch word metadata on mount (length only — answer stays on server)
  useEffect(() => {
    fetchWordOfTheDay()
      .then(() => setState(s => ({ ...s, loading: false })))
      .catch(() =>
        setState(s => ({
          ...s,
          loading: false,
          error: "Could not connect to the server. Make sure the backend is running.",
        }))
      );
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist game state to localStorage on every change (skip during loading)
  useEffect(() => {
    if (state.loading) return;
    const { guesses, gameOver, message, answer } = state;
    localStorage.setItem(
      getTodayKey(),
      JSON.stringify({ guesses, gameOver, message, answer, current: "" })
    );
  }, [state]);

  const handleAdd = useCallback((key) => {
    const { gameOver, current } = stateRef.current;
    if (gameOver || current.length >= WORD_LENGTH) return;
    setState(s => ({ ...s, current: s.current + key.toLowerCase(), error: "" }));
  }, []);

  const handleDelete = useCallback(() => {
    const { gameOver, current } = stateRef.current;
    if (gameOver || current.length === 0) return;
    setState(s => ({ ...s, current: s.current.slice(0, -1), error: "" }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const { current, guesses, gameOver } = stateRef.current;

    if (gameOver) return;

    if (current.length !== WORD_LENGTH) {
      setState(s => ({ ...s, error: "Not enough letters" }));
      triggerShake(guesses.length);
      return;
    }

    // Prevent re-submitting an already-guessed word
    const alreadyGuessed = guesses.some(
      (g) => g.guess.toLowerCase() === current.toLowerCase()
    );
    if (alreadyGuessed) {
      setState(s => ({ ...s, error: "You already tried that word!" }));
      triggerShake(guesses.length);
      return;
    }

    setState(s => ({ ...s, error: "" }));

    try {
      const attemptCount = guesses.length + 1;
      const data = await submitGuess(current, attemptCount);

      const newGuesses = [...guesses, { guess: current, result: data.result }];

      if (data.isWin) {
        setState(s => ({
          ...s,
          guesses: newGuesses,
          current: "",
        }));
        setTimeout(() => {
          const winMsg = WIN_MESSAGES[newGuesses.length - 1] || "Great! 👏";
          setState(s => ({
            ...s,
            gameOver: true,
            message: winMsg,
            answer: "",
          }));
        }, 1700);
      } else if (newGuesses.length >= MAX_GUESSES) {
        setState(s => ({
          ...s,
          guesses: newGuesses,
          current: "",
        }));
        setTimeout(() => {
          setState(s => ({
            ...s,
            gameOver: true,
            message: getLossMessage(),
            answer: data.answer || "",
          }));
        }, 1700);
      } else {
        setState(s => ({
          ...s,
          guesses: newGuesses,
          current: "",
        }));
      }
    } catch (err) {
      const errorMsg = err.message || "Server error. Please try again.";
      setState(s => ({
        ...s,
        error: errorMsg,
      }));
      triggerShake(guesses.length);
    }
  }, []);

  const handleKeyClick = useCallback((key) => {
    if (key === "Enter") handleSubmit();
    else if (key === "←") handleDelete();
    else handleAdd(key);
  }, [handleSubmit, handleDelete, handleAdd]);

  // Keyboard listener — stable dependency array
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ENTER") handleSubmit();
      else if (key === "BACKSPACE") handleDelete();
      else if (/^[A-Z]$/.test(key)) handleAdd(key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSubmit, handleDelete, handleAdd]);

  // Build rows for the board
  const rows = [
    ...guesses,
    ...Array(Math.max(0, MAX_GUESSES - guesses.length)).fill({ guess: "", result: [] }),
  ];
  if (guesses.length < MAX_GUESSES && !gameOver) {
    rows[guesses.length] = { guess: current, result: [] };
  }

  const keyStates = buildKeyStates(guesses);

  if (loading) {
    return (
      <div className="game">
        <h1 className="title">WORDLE</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="game">
      <h1 className="title">WORDLE</h1>

      {error && <p className="error-message">{error}</p>}

      <div className="board">
        {rows.map((row, i) => {
          const isCommitted = row.result && row.result.length > 0;
          return (
            <div key={i} className={`row ${i === shakeRowIndex ? "shake" : ""}`}>
              {Array.from({ length: WORD_LENGTH }).map((_, j) => {
                const letter = row.guess[j] || "";
                const state = row.result[j] || "";
                return (
                  <div
                    key={j}
                    className={`tile ${state} ${isCommitted ? "revealed" : ""}`}
                    style={isCommitted ? { animationDelay: `${j * 300}ms`, '--delay': `${j * 300}ms` } : {}}
                  >
                    {letter.toUpperCase()}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="keyboard">
        {keyboardLayout.map((row, i) => (
          <div key={i} className="key-row">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKeyClick(key)}
                className={keyStates[key] || ""}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {gameOver && (
        <div className="end-screen">
          <div className="end-box">
            <p>{message}</p>
            {state.answer && (
              <div className="answer-reveal">{state.answer.toUpperCase()}</div>
            )}
            <p className="come-back-msg">Come back tomorrow for a new word! 📅</p>
          </div>
        </div>
      )}
    </div>
  );
}
