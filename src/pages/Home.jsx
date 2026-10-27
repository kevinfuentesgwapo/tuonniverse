import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

// Three cards for visitors who are not logged in.
const FEATURES = [
  {
    icon: "🤖",
    title: "AI flashcards",
    text: "Turn your notes and files into flashcards in seconds.",
  },
  {
    icon: "🧠",
    title: "Many ways to study",
    text: "Flip cards, take quizzes, and practice writing answers.",
  },
  {
    icon: "🆓",
    title: "Free to use",
    text: "Study as much as you want. No payment needed.",
  },
];

// Gets a friendly first name from the user.
function getFirstName(user) {
  const meta = user.user_metadata || {};
  const fullName = meta.full_name || meta.name || "";
  const first = fullName.trim().split(" ")[0];
  if (first) return first;
  if (user.email) return user.email.split("@")[0];
  return "friend";
}

// What a visitor sees before logging in.
function LoggedOutHome() {
  return (
    <main className="page">
      <section className="hero">
        <img src="/favicon.svg" alt="" />
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
              {item.icon}
            </span>
            <h2>{item.title}</h2>
            <p className="muted">{item.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

// What a logged-in student sees.
function LoggedInHome({ user }) {
  const name = getFirstName(user);

  return (
    <main className="page">
      <section className="home-top">
        <h1>Hi, {name} 👋</h1>
        <p className="muted">What do you want to study today?</p>
      </section>

      <section aria-label="Quick actions">
        <div className="home-actions">
          <button type="button" className="btn btn-primary" disabled>
            New set
          </button>
          <button type="button" className="btn" disabled>
            New note
          </button>
          <button type="button" className="btn" disabled>
            Generate with AI
          </button>
          <span className="home-tag">Coming soon</span>
        </div>
      </section>

      <section className="home-grid" aria-label="Your progress">
        <article className="home-card home-card-off">
          <span className="home-icon" aria-hidden="true">
            🔥
          </span>
          <h2>Study streak</h2>
          <p className="home-big">0 days</p>
          <span className="home-tag">Coming soon</span>
        </article>
        <article className="home-card home-card-off">
          <span className="home-icon" aria-hidden="true">
            ⏰
          </span>
          <h2>Cards due today</h2>
          <p className="home-big">0</p>
          <span className="home-tag">Coming soon</span>
        </article>
        <article className="home-card home-card-off">
          <span className="home-icon" aria-hidden="true">
            ✨
          </span>
          <h2>AI uses left today</h2>
          <p className="home-big">--</p>
          <span className="home-tag">Coming soon</span>
        </article>
      </section>

      <section aria-label="Your sets">
        <h2 className="home-heading">Your sets</h2>
        <div className="home-empty">
          <span className="home-icon" aria-hidden="true">
            🪐
          </span>
          <h3>No sets yet</h3>
          <p className="muted">
            Your flashcard sets will show up here. Soon you can make your first
            one.
          </p>
        </div>
      </section>
    </main>
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
