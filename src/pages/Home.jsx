import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useSets from "../hooks/useSets";
import useStudyProgress from "../hooks/useStudyProgress";
import useDueToday from "../hooks/useDueToday";
import useNotes from "../hooks/useNotes";
import useAiUsage from "../hooks/useAiUsage";
import useSettings from "../hooks/useSettings";
import Icon from "../components/ui/Icon";
import SetTile from "../components/flashcards/SetTile";
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

// Tools. A tool with  to: "/page"  is a real link. The rest say "Opening soon".
const LAUNCH_PAD = [
  {
    icon: "sets",
    tone: "violet",
    title: "New set",
    text: "Make flashcards with a term and a definition.",
    to: "/sets/new",
  },
  {
    icon: "notes",
    tone: "cyan",
    title: "New note",
    text: "Write notes or keep summaries in one place.",
    to: "/notes/new",
  },
  {
    icon: "sparkles",
    tone: "yellow",
    id: "ai",
    title: "Generate with AI",
    text: "Turn text or files into cards fast.",
    to: "/ai",
  },
];

// Getting started quests. "set" turns green by itself when you have a set.
// The others turn on when the tool is built and we can really check them.
const QUESTS = [
  { id: "join", text: "Join Tuoniverse", done: true },
  { id: "set", text: "Make your first set", done: false },
  { id: "note", text: "Write your first note", done: false },
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
const WEEK_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// How each saved mode is named, and which page it opens.
const MODE_INFO = {
  flashcards: { label: "Flip cards", path: "flip" },
  quiz: { label: "Quiz", path: "quiz" },
  write: { label: "Write", path: "write" },
  match: { label: "Match", path: "match" },
  test: { label: "Test", path: "test" },
};

// Colors for a day you studied. Colors come only from CSS variables.
const DONE_DOT = {
  background: "var(--accent)",
  color: "var(--accent-text)",
  borderColor: "var(--accent)",
};

// Daily goal ring. Fills as you finish cards today.
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
function LoggedInHome({ user }) {
  const name = getFirstName(user);
  const {
    sets,
    loading: setsLoading,
    error: setsError,
    totalCards,
  } = useSets();
  const progress = useStudyProgress();
  const { notes } = useNotes();
  const due = useDueToday();
  const aiUsage = useAiUsage(user.id);
  const { settings } = useSettings();
  const goalCards = settings.dailyGoal;
  const [taps, setTaps] = useState(0);
  const [mood, setMood] = useState(null);
  const [tipIndex, setTipIndex] = useState(new Date().getDate() % TIPS.length);

  const mascotLine =
    taps === 0 ? INTRO_LINE : MASCOT_LINES[(taps - 1) % MASCOT_LINES.length];
  const moodReply = MOODS.find((item) => item.id === mood)?.reply;

  const quests = QUESTS.map((quest) => {
    if (quest.id === "set") return { ...quest, done: sets.length > 0 };
    if (quest.id === "note") return { ...quest, done: notes.length > 0 };
    if (quest.id === "study") return { ...quest, done: progress.hasStudied };
    return quest;
  });
  const doneCount = quests.filter((quest) => quest.done).length;
  const percent = Math.round((doneCount / quests.length) * 100);

  // Monday is the first dot. getDay() gives Sunday = 0.
  const todayIndex = (new Date().getDay() + 6) % 7;

  // "Continue studying": the last set you practiced, if it still exists.
  const lastSet = progress.last
    ? sets.find((set) => set.id === progress.last.setId)
    : null;
  const lastMode = progress.last ? MODE_INFO[progress.last.mode] : null;
  // Quiz and Match need 2+ cards. Test needs 4+. If the set is too small now,
  // open the set page instead.
  const needCards = progress.last
    ? ({ quiz: 2, match: 2, test: 4 }[progress.last.mode] ?? 1)
    : 1;
  const continueTo =
    lastSet && lastMode
      ? lastSet.cardCount < needCards
        ? `/sets/${lastSet.id}`
        : `/sets/${lastSet.id}/${lastMode.path}`
      : null;

  // "Cards due today" (spaced repetition). Friendly, never guilty.
  const hasDue = due.dueTotal > 0;
  const hasNew = due.newTotal > 0;
  const cardWord = (n) => (n === 1 ? "card" : "cards");
  let reviewTitle = "All caught up!";
  let reviewNote =
    "Nothing to review today. Come back tomorrow, or make a new set.";
  let reviewButton = "";
  if (hasDue) {
    reviewTitle = `${due.dueTotal} ${cardWord(due.dueTotal)} ready to review`;
    reviewNote = hasNew
      ? `Plus ${due.newTotal} new ${cardWord(due.newTotal)} to learn. Today's round: ${due.sessionSize} cards.`
      : `Today's round: ${due.sessionSize} ${cardWord(due.sessionSize)}.`;
    reviewButton = "Start review";
  } else if (hasNew) {
    reviewTitle = "Nothing due. Nice!";
    reviewNote = `${due.newTotal} new ${cardWord(due.newTotal)} waiting when you feel ready.`;
    reviewButton = "Learn new cards";
  }

  // AI tries left today.
  const aiLeftText =
    aiUsage.loading || aiUsage.error
      ? ""
      : aiUsage.left > 0
        ? `${aiUsage.left} of ${aiUsage.limit} AI tries left today`
        : "No AI tries left today. They refill tomorrow.";

  // Daily goal ring.
  const goalShare = Math.min(1, progress.cardsToday / goalCards);
  const goalLeft = Math.max(0, goalCards - progress.cardsToday);
  const goalText =
    goalLeft === 0
      ? "Daily goal done. Amazing!"
      : `${goalLeft} more to go today`;

  const streakNote = progress.studiedToday
    ? "You studied today. Nice work!"
    : progress.streak > 0
      ? "Study a little today to keep your streak growing."
      : "Study a little today and your streak starts.";

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

        {sets.length > 0 && (
          <section className="home-review" aria-label="Cards due today">
            {due.loading ? (
              <p className="muted" aria-live="polite">
                Checking your cards…
              </p>
            ) : due.error ? (
              <p className="muted">
                We could not check your cards just now. Refresh to try again.
              </p>
            ) : (
              <>
                <div className="home-review-count" aria-hidden="true">
                  {hasDue ? due.dueTotal : "✓"}
                </div>
                <div className="home-review-text">
                  <h2 className="home-quests-title">{reviewTitle}</h2>
                  <p className="muted">{reviewNote}</p>
                </div>
                {reviewButton && (
                  <Link to="/review" className="btn btn-primary">
                    {reviewButton}
                  </Link>
                )}
              </>
            )}
          </section>
        )}

        {continueTo && (
          <section className="home-quests" aria-label="Continue studying">
            <h2 className="home-quests-title">Continue studying</h2>
            <p className="muted">
              Last time: {lastMode.label} with “{lastSet.title}”.
            </p>
            <Link to={continueTo} className="btn btn-primary">
              Keep going
            </Link>
          </section>
        )}

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
              {doneCount} of {quests.length} done
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
            {quests.map((quest) => (
              <li
                key={quest.id}
                className={quest.done ? "home-quest is-done" : "home-quest"}
              >
                <span className="home-check" aria-hidden="true">
                  {quest.done ? "✓" : ""}
                </span>
                <span>{quest.text}</span>
                {!quest.done && quest.id === "ai" && (
                  <Link to="/ai" className="home-go">
                    Start
                  </Link>
                )}
                {!quest.done && quest.id === "set" && (
                  <Link to="/sets/new" className="home-go">
                    Start
                  </Link>
                )}
                {!quest.done && quest.id === "note" && (
                  <Link to="/notes/new" className="home-go">
                    Start
                  </Link>
                )}
                {!quest.done && quest.id === "study" && (
                  <Link to="/sets" className="home-go">
                    Start
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Launch pad">
          <h2 className="home-heading">Launch pad</h2>
          <div className="home-grid">
            {LAUNCH_PAD.map((tool) => {
              const inside = (
                <>
                  <span className="home-icon" aria-hidden="true">
                    <Icon name={tool.icon} size={24} />
                  </span>
                  <h3>{tool.title}</h3>
                  <p className="muted">{tool.text}</p>
                  {tool.id === "ai" && aiLeftText && (
                    <p className="home-tile-note">{aiLeftText}</p>
                  )}
                  {tool.to ? (
                    <span className="home-go">Open →</span>
                  ) : (
                    <span className="home-badge">Opening soon</span>
                  )}
                </>
              );

              return tool.to ? (
                <Link
                  key={tool.title}
                  to={tool.to}
                  className={`home-tile is-link tone-${tool.tone}`}
                >
                  {inside}
                </Link>
              ) : (
                <article
                  key={tool.title}
                  className={`home-tile tone-${tool.tone}`}
                >
                  {inside}
                </article>
              );
            })}
          </div>
        </section>

        <section aria-label="Your sets">
          <div className="home-sets-head">
            <h2 className="home-heading">Your sets</h2>
            {sets.length > 0 && (
              <Link to="/sets" className="home-see-all">
                See all
              </Link>
            )}
          </div>

          {setsLoading ? (
            <p className="muted" aria-live="polite">
              Loading your sets…
            </p>
          ) : setsError ? (
            <div className="home-empty">
              <h3>Hmm, your sets did not load</h3>
              <p className="muted">
                Check your internet and refresh the page. Your sets are safe.
              </p>
            </div>
          ) : sets.length === 0 ? (
            <div className="home-empty">
              <h3>Your first set is waiting</h3>
              <p className="muted">
                When you make a set, it will land here. Get ready for liftoff!
              </p>
              <Link to="/sets/new" className="btn btn-primary">
                Make my first set
              </Link>
              <div className="home-ghosts" aria-hidden="true">
                {[0, 1, 2].map((slot) => (
                  <div key={slot} className="home-ghost">
                    <span className="home-ghost-line wide" />
                    <span className="home-ghost-line" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="set-grid">
              {sets.slice(0, 3).map((set) => (
                <SetTile key={set.id} set={set} />
              ))}
            </div>
          )}
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
              <strong>{progress.streak}</strong>
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
                style={progress.weekDone[index] ? DONE_DOT : undefined}
                title={`${WEEK_NAMES[index]}${progress.weekDone[index] ? ": studied" : ""}`}
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="muted home-side-note">{streakNote}</p>

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
                strokeDashoffset={GOAL_CIRCLE * (1 - goalShare)}
              />
            </svg>
            <div>
              <strong>
                {progress.cardsToday} / {goalCards}
              </strong>
              <p className="muted">{goalText}</p>
            </div>
          </div>

          <div className="home-mini-stats">
            <div className="home-mini-stat">
              <strong>{sets.length}</strong>
              <span className="muted">Sets</span>
            </div>
            <div className="home-mini-stat">
              <strong>{totalCards}</strong>
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
