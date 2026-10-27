import { useEffect, useRef, useState } from "react";

const MODES = {
  focus: { label: "Focus", minutes: 25 },
  break: { label: "Break", minutes: 5 },
};

// Ring size. The circle length is 2 x pi x radius.
const RADIUS = 52;
const CIRCLE = 2 * Math.PI * RADIUS;

function format(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function FocusTimer() {
  const [mode, setMode] = useState("focus");
  const [left, setLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endRef = useRef(0);

  const total = MODES[mode].minutes * 60;
  const progress = 1 - left / total;

  // Ticks while the timer runs. Uses the clock, so it stays correct
  // even if the tab sleeps.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((endRef.current - Date.now()) / 1000),
      );
      setLeft(remaining);
      if (remaining === 0) {
        setRunning(false);
        setFinished(true);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running]);

  function start() {
    endRef.current = Date.now() + left * 1000;
    setFinished(false);
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function switchMode(next) {
    setMode(next);
    setLeft(MODES[next].minutes * 60);
    setRunning(false);
    setFinished(false);
  }

  const message = finished
    ? mode === "focus"
      ? "Great job! Time for a 5-minute break."
      : "Break is over. Ready for another round?"
    : running
      ? mode === "focus"
        ? "You are in the zone. Keep going!"
        : "Stretch, sip water, breathe."
      : "Short rounds help your brain remember more.";

  return (
    <section className="focus" aria-label="Focus timer">
      <h2 className="home-side-title">Focus timer</h2>

      <div className="focus-modes" role="group" aria-label="Timer mode">
        {Object.entries(MODES).map(([id, item]) => (
          <button
            key={id}
            type="button"
            className="focus-mode"
            aria-pressed={mode === id}
            onClick={() => switchMode(id)}
          >
            {item.label} {item.minutes}
          </button>
        ))}
      </div>

      <div className={`focus-ring focus-ring-${mode}`}>
        <svg viewBox="0 0 120 120" width="140" height="140" aria-hidden="true">
          <circle className="focus-track" cx="60" cy="60" r={RADIUS} />
          <circle
            className="focus-bar"
            cx="60"
            cy="60"
            r={RADIUS}
            strokeDasharray={CIRCLE}
            strokeDashoffset={CIRCLE * (1 - progress)}
          />
        </svg>
        <span className="focus-time" role="timer">
          {format(left)}
        </span>
      </div>

      <p className="focus-message muted" aria-live="polite">
        {message}
      </p>

      <div className="focus-actions">
        {running ? (
          <button type="button" className="btn" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start}>
            {left < total && left > 0 ? "Resume" : "Start"}
          </button>
        )}
        <button type="button" className="btn" onClick={() => switchMode(mode)}>
          Reset
        </button>
      </div>
    </section>
  );
}
