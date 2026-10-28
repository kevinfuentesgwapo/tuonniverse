import { Link } from "react-router-dom";
import useSets from "../hooks/useSets";
import SetTile from "../components/flashcards/SetTile";
import Icon from "../components/ui/Icon";

export default function Sets() {
  const { sets, loading, error, reload } = useSets();

  return (
    <main className="sets-page">
      <header className="sets-head">
        <div>
          <h1>Your sets</h1>
          <p className="muted">
            {sets.length > 0
              ? `${sets.length} ${sets.length === 1 ? "set" : "sets"} in your universe.`
              : "All your flashcard sets live here."}
          </p>
        </div>
        <Link to="/sets/new" className="btn btn-primary create-btn">
          <Icon name="plus" size={18} />
          New set
        </Link>
      </header>

      {loading ? (
        <p className="muted" aria-live="polite">
          Loading your sets…
        </p>
      ) : error ? (
        <section className="set-state">
          <h2>Hmm, that did not load</h2>
          <p className="muted">
            Check your internet, then try again. Your sets are safe.
          </p>
          <button type="button" className="btn btn-primary" onClick={reload}>
            Try again
          </button>
        </section>
      ) : sets.length === 0 ? (
        <section className="set-state">
          <img
            className="set-state-planet"
            src="/favicon.svg"
            alt=""
            width="80"
            height="80"
          />
          <h2>Your first set is waiting</h2>
          <p className="muted">
            Make a set with a few cards. It only takes a minute.
          </p>
          <Link to="/sets/new" className="btn btn-primary">
            Make my first set
          </Link>
        </section>
      ) : (
        <div className="set-grid">
          {sets.map((set) => (
            <SetTile key={set.id} set={set} />
          ))}
        </div>
      )}
    </main>
  );
}
