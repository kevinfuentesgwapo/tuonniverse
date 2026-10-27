import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Icon from "../components/ui/Icon";
import FocusTimer from "../components/home/FocusTimer";

// Three cards for visitors who are not logged in.
const FEATURES = [
  {
    icon: "sparkles",
    title: "AI flashcards",
    text: "Turn your notes and files into flashcards in seconds.",
  },
  {
    icon: "study",
    title: "Many ways to study",
    text: "Flip cards, take quizzes, and practice writing answers.",
  },
  {
    icon: "target",
    title: "Free to use",
    text: "Study as much as you want. No payment needed.",
  },
];

// Three simple steps shown to visitors.
const STEPS = [
  {
    number: "1",
    title: "Add your notes",
    text: "Type them, paste them, or upload a file.",
  },
  {
    number: "2",
    title: "Make cards",
    text: "Write your own or let AI do it for you.",
  },
  {
    number: "3",
    title: "Study and win",
    text: "Flip, quiz, and write until it sticks.",
  },
];

// Tools we will build. They get a real link when each one is ready.
const LAUNCH_PAD = [
  {
    icon: "sets",
    tone: "violet",
    title: "New set",
    text: "Make flashcards with a term and a definition.",
  },
  {
    icon: "notes",
    tone: "cyan",
    title: "New note",
    text: "Write notes or keep summaries in one place.",
  },
  {
    icon: "sparkles",
    tone: "yellow",
    title: "Generate with AI",
    text: "Turn text or files into cards fast.",
  },
];

// Getting started quests. Only "Join" is true today. The rest turn
// on when the tool is built and we can really check them.
const QUESTS = [
  { id: "join", text: "Join Tuoniverse", done: true },
  { id: "set", text: "Make your first set", done: false },
  { id: "ai", text: "Try AI flashcards", done: false },
  { id: "study", text: "Finish a study round", done: false },
];

// How are you feeling? Each answer gets a kind reply.
const MOODS = [
  {
    id: "sleepy",
    icon: "moon",
    label: "Sleepy",
    reply: "That is okay. Try one tiny 5-minute round. Small wins count!",
  },
  {
    id: "okay",
    icon: "sun",
    label: "Okay",
    reply: "Nice and steady. A 25-minute focus round would be perfect.",
  },
  {
    id: "pumped",
    icon: "flame",
    label: "Pumped",
    reply: "Love that energy! Let's make today a big one.",
  },
];

// What the planet says when you tap it.
const INTRO_LINE = "Tap my planet to say hi!";
const MASCOT_LINES = [
  "Hi! I am Tuo. Nice to meet you!",
  "Ooh, that tickles!",
  "You are doing great today.",
  "Ready when you are, explorer!",
  "Tiny study rounds beat long ones.",
  "Zoom zoom! Let's learn something.",
];

// One tip per day to start. The button shows the next tip.
const TIPS = [
  "Study in short rounds. 25 minutes on, 5 minutes off.",
  "Say the answer out loud before you flip the card.",
  "Hard cards? Star them and practice them more.",
  "Sleep helps your brain save what you learned.",
  "Explain a card to a friend. If you can teach it, you know it.",
  "Mix up your cards. Do not learn them in the same order.",
  "Small and often beats one giant study night.",
];

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

// Daily goal ring. Real progress comes when study is built.
const GOAL_CARDS = 10;
const GOAL_RADIUS = 26;
const GOAL_CIRCLE = 2 * Math.PI * GOAL_RADIUS;

// Gets a friendly first name from the user.
function getFirstName(user) {
  const meta = user.user_metadata || {};
  const fullName = meta.full_name || meta.name || "";
  const first = fullName.trim().split(" ")[0];
  if (first) return first;
  if (user.email) return user.email.split("@")[0];
  return "friend";
}

// Says hello based on the time of day.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// What a visitor sees before logging in.
function LoggedOutHome() {
  return (
    <main className="page">
      <section className="hero">
        <img
          className="hero-planet"
          src="/favicon.svg"
          alt=""
          width="120"
          height="120"
        />
        <h1>Welcome to Tuoniverse</h1>
        <p className="muted">
          Your free study universe. Make flashcards, quiz yourself, and let AI
          help you learn faster.
        </p>
        <div className="row">
          <Link to="/login" className="btn btn-primary">
            Sign up / Log in
          </Link>
        </div>
      </section>

      <section className="home-grid" aria-label="Features">
        {FEATURES.map((item) => (
          <article key={item.title} className="home-card">
            <span className="home-icon" aria-hidden="true">
              <Icon name={item.icon} size={24} />
            </span>
            <h2>{item.title}</h2>
            <p className="muted">{item.text}</p>
          </article>
        ))}
      </section>

      <section aria-label="How it works">
        <h2 className="home-heading">How it works</h2>
        <ol className="home-steps">
          {STEPS.map((step) => (
            <li key={step.number} className="home-step">
              <span className="home-step-num">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p className="muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

// What a logged-in student sees. Two columns on big screens.
// Tools turn from "Opening soon" into real links when they are built.
function LoggedInHome({ user }) {
  const name = getFirstName(user);
  const [taps, setTaps] = useState(0);
  const [mood, setMood] = useState(null);
  const [tipIndex, setTipIndex] = useState(new Date().getDate() % TIPS.length);

  const mascotLine =
    taps === 0 ? INTRO_LINE : MASCOT_LINES[(taps - 1) % MASCOT_LINES.length];
  const moodReply = MOODS.find((item) => item.id === mood)?.reply;

  const doneCount = QUESTS.filter((quest) => quest.done).length;
  const percent = Math.round((doneCount / QUESTS.length) * 100);

  // Monday is the first dot. getDay() gives Sunday = 0.
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div className="home-dash">
      {/* ---------- Main column ---------- */}
      <div className="home-main">
        <section className="home-banner">
          <div className="home-banner-text">
            <p className="home-eyebrow">{getGreeting()}</p>
            <h1>Hi, {name}</h1>
            <p className="home-bubble" aria-live="polite">
              {mascotLine}
            </p>
          </div>
          <button
            type="button"
            className="home-mascot"
            aria-label="Tap the planet to say hi"
            onClick={() => setTaps((count) => count + 1)}
          >
            <img
              key={taps}
              className={taps > 0 ? "home-mascot-img pop" : "home-mascot-img"}
              src="/favicon.svg"
              alt=""
              width="96"
              height="96"
            />
          </button>
        </section>

        <section className="home-mood" aria-label="How are you feeling?">
          <h2 className="home-mood-title">How are you feeling today?</h2>
          <div className="home-mood-row">
            {MOODS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="home-mood-btn"
                aria-pressed={mood === item.id}
                onClick={() => setMood(item.id)}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </button>
            ))}
          </div>
          <p className="muted home-mood-reply" aria-live="polite">
            {moodReply || "Pick one. I will cheer you on."}
          </p>
        </section>

        <section className="home-quests" aria-label="Getting started">
          <div className="home-quests-head">
            <h2 className="home-quests-title">Getting started</h2>
            <span className="muted">
              {doneCount} of {QUESTS.length} done
            </span>
          </div>
          <div
            className="home-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Getting started progress"
          >
            <span className="home-bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <ul className="home-quest-list">
            {QUESTS.map((quest) => (
              <li
                key={quest.id}
                className={quest.done ? "home-quest is-done" : "home-quest"}
              >
                <span className="home-check" aria-hidden="true">
                  {quest.done ? "✓" : ""}
                </span>
                <span>{quest.text}</span>
                {!quest.done && <span className="home-badge">Soon</span>}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Launch pad">
          <h2 className="home-heading">Launch pad</h2>
          <div className="home-grid">
            {LAUNCH_PAD.map((tool) => (
              <article
                key={tool.title}
                className={`home-tile tone-${tool.tone}`}
              >
                <span className="home-icon" aria-hidden="true">
                  <Icon name={tool.icon} size={24} />
                </span>
                <h3>{tool.title}</h3>
                <p className="muted">{tool.text}</p>
                <span className="home-badge">Opening soon</span>
              </article>
            ))}
          </div>
        </section>

        <section aria-label="Your sets">
          <h2 className="home-heading">Your sets</h2>
          <div className="home-empty">
            <h3>Your first set is waiting</h3>
            <p className="muted">
              When you make a set, it will land here. Get ready for liftoff!
            </p>
            <div className="home-ghosts" aria-hidden="true">
              {[0, 1, 2].map((slot) => (
                <div key={slot} className="home-ghost">
                  <span className="home-ghost-line wide" />
                  <span className="home-ghost-line" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---------- Side column ---------- */}
      <aside className="home-side" aria-label="Progress, timer and tip">
        <section className="home-side-card">
          <h2 className="home-side-title">Your progress</h2>
          <div className="home-streak">
            <span className="home-streak-icon" aria-hidden="true">
              <Icon name="flame" size={28} />
            </span>
            <div>
              <strong>0</strong>
              <span className="muted"> day streak</span>
            </div>
          </div>

          <div className="home-week" aria-label="This week">
            {WEEK.map((letter, index) => (
              <span
                key={index}
                className={
                  index === todayIndex ? "home-day is-today" : "home-day"
                }
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="muted home-side-note">
            Study a little today and your streak starts. Streaks are coming
            soon.
          </p>

          <div className="home-goal">
            <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
              <circle
                className="home-goal-track"
                cx="32"
                cy="32"
                r={GOAL_RADIUS}
              />
              <circle
                className="home-goal-bar"
                cx="32"
                cy="32"
                r={GOAL_RADIUS}
                strokeDasharray={GOAL_CIRCLE}
                strokeDashoffset={GOAL_CIRCLE}
              />
            </svg>
            <div>
              <strong>0 / {GOAL_CARDS}</strong>
              <p className="muted">cards today</p>
            </div>
          </div>

          <div className="home-mini-stats">
            <div className="home-mini-stat">
              <strong>0</strong>
              <span className="muted">Sets</span>
            </div>
            <div className="home-mini-stat">
              <strong>0</strong>
              <span className="muted">Cards</span>
            </div>
          </div>
        </section>

        <FocusTimer />

        <section className="home-tip" aria-label="Study tip">
          <span className="home-icon home-icon-tip" aria-hidden="true">
            <Icon name="bulb" size={22} />
          </span>
          <div>
            <h3>Tip of the day</h3>
            <p className="muted">{TIPS[tipIndex]}</p>
            <button
              type="button"
              className="home-tip-btn"
              onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
            >
              Another tip
            </button>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  return user ? <LoggedInHome user={user} /> : <LoggedOutHome />;
}
