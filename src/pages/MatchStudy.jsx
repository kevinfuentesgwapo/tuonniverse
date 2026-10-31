import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import MatchGame from "../components/study/MatchGame";
import { getSet } from "../hooks/useSets";
import useAuth from "../hooks/useAuth";
import { saveStudySession } from "../lib/studySessions";

// Page for /sets/:id/match
export default function MatchStudy() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const onlyStarred = params.get("starred") === "1";
  const [status, setStatus] = useState("loading"); // loading | ready | missing | error
  const [data, setData] = useState(null);
  const [game, setGame] = useState(0); // a new number = a new round

  const load = useCallback(async () => {
    try {
      const result = await getSet(id);
      if (!result) {
        setStatus("missing");
        return;
      }
      setData(result);
      setStatus("ready");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function retry() {
    setStatus("loading");
    load();
  }

  // Called once when a round is finished.
  function handleFinish(pairs) {
    if (!user) return Promise.resolve();
    return saveStudySession({
      userId: user.id,
      setId: id,
      mode: "match",
      cardsDone: pairs,
    });
  }

  if (status === "loading") {
    return (
      <main className="set-view">
        <p className="muted" aria-live="polite">
          Getting your cards ready…
        </p>
      </main>
    );
  }

  if (status === "missing" || status === "error") {
    return (
      <main className="set-view">
        <section className="set-state">
          <h2>
            {status === "missing"
              ? "We could not find this set"
              : "Hmm, that did not load"}
          </h2>
          <p className="muted">
            {status === "missing"
              ? "It may have been deleted. Your other sets are safe."
              : "Check your internet, then try again."}
          </p>
          <div className="set-success-actions">
            {status === "error" && (
              <button type="button" className="btn btn-primary" onClick={retry}>
                Try again
              </button>
            )}
            <Link to="/sets" className="btn">
              Back to my sets
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { set, cards } = data;
  const studyCards = onlyStarred ? cards.filter((c) => c.starred) : cards;

  // The game needs at least 2 pairs.
  if (studyCards.length < 2) {
    return (
      <main className="set-view">
        <section className="set-state">
          <h2>
            {onlyStarred
              ? "Star at least 2 cards first"
              : "Add at least 2 cards first"}
          </h2>
          <p className="muted">
            Match needs 2 or more cards to make pairs. Add a few, then come
            back.
          </p>
          <div className="set-success-actions">
            <Link to={`/sets/${id}`} className="btn btn-primary">
              Back to the set
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="set-view">
      <Link to={`/sets/${id}`} className="set-back">
        ← Back to the set
      </Link>
      <header className="set-view-head">
        <h1>Match</h1>
        <p className="muted">{set.title}</p>
        {onlyStarred && <p className="muted">Starred cards only</p>}
      </header>
      <MatchGame
        key={`${id}-${onlyStarred}-${game}`}
        cards={studyCards}
        setId={id}
        onAgain={() => setGame((n) => n + 1)}
        onFinish={handleFinish}
      />
    </main>
  );
}
