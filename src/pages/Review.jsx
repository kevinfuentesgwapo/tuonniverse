import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useReviewQueue from "../hooks/useReviewQueue";
import useSets from "../hooks/useSets";
import ReviewSession from "../components/review/ReviewSession";

function prettyDate(day) {
  if (!day) return "";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// Page for /review : cards that are due today, plus a few new ones.
export default function Review() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { sets, loading: setsLoading } = useSets();
  // /review?set=ID reviews only that set. A wrong id means "all sets".
  const chosenSet = sets.find((s) => s.id === params.get("set")) || null;
  const setId = chosenSet ? chosenSet.id : null;
  // Wait for the set list first, so the cards load only once.
  const review = useReviewQueue(setsLoading ? undefined : user?.id, setId);
  const [round, setRound] = useState(0);

  function chooseSet(value) {
    setParams(value ? { set: value } : {}, { replace: true });
  }

  function handleMore() {
    setRound((r) => r + 1);
    review.reload();
  }

  const head = (
    <header className="set-view-head">
      <h1>Review</h1>
      <p className="muted">
        Cards come back at the right time, so you remember them for longer.
      </p>
      {sets.length > 1 && (
        <div className="set-field">
          <label className="set-label" htmlFor="review-set">
            Which set?
          </label>
          <select
            id="review-set"
            className="set-input"
            value={setId || ""}
            onChange={(e) => chooseSet(e.target.value)}
          >
            <option value="">All sets</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.cardCount})
              </option>
            ))}
          </select>
        </div>
      )}
    </header>
  );

  if (review.loading) {
    return (
      <main className="set-view">
        {head}
        <p className="muted" aria-live="polite">
          Getting your cards ready…
        </p>
      </main>
    );
  }

  if (review.error) {
    return (
      <main className="set-view">
        {head}
        <section className="set-state">
          <h2>Hmm, that did not load</h2>
          <p className="muted">{review.error}</p>
          <div className="set-success-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={review.reload}
            >
              Try again
            </button>
            <Link to="/sets" className="btn">
              Back to my sets
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (review.totalCards === 0) {
    return (
      <main className="set-view">
        {head}
        <section className="set-state">
          <h2>
            {chosenSet ? "This set has no cards yet" : "No cards to review yet"}
          </h2>
          <p className="muted">
            {chosenSet
              ? "Add a few cards, and Tuo will bring them back at the right time."
              : "Make a set, and Tuo will bring its cards back at the right time."}
          </p>
          {chosenSet ? (
            <div className="set-success-actions">
              <Link
                to={`/sets/${chosenSet.id}/edit`}
                className="btn btn-primary"
              >
                Add cards
              </Link>
              <button
                type="button"
                className="btn"
                onClick={() => chooseSet("")}
              >
                Review all sets
              </button>
            </div>
          ) : (
            <div className="set-success-actions">
              <Link to="/sets/new" className="btn btn-primary">
                Make a set
              </Link>
              <Link to="/ai" className="btn">
                Make cards with AI
              </Link>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (review.queue.length === 0) {
    return (
      <main className="set-view">
        {head}
        <section className="set-state">
          <h2>
            {chosenSet
              ? `You are all caught up with “${chosenSet.title}”!`
              : "You are all caught up!"}
          </h2>
          <p className="muted">
            {review.nextDue
              ? `Your next cards come back on ${prettyDate(review.nextDue)}. Great work today.`
              : "Great work today."}
          </p>
          <div className="set-success-actions">
            <Link to="/sets" className="btn btn-primary">
              Back to my sets
            </Link>
            {chosenSet && (
              <button
                type="button"
                className="btn"
                onClick={() => chooseSet("")}
              >
                Review all sets
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="set-view">
      {head}
      <ReviewSession
        key={`${setId || "all"}-${round}`}
        queue={review.queue}
        userId={user.id}
        hasMore={review.dueTotal + review.newTotal > review.queue.length}
        onMore={handleMore}
      />
    </main>
  );
}
