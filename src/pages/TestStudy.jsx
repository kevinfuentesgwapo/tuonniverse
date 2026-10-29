import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import TestMode from "../components/study/TestMode";
import { getSet } from "../hooks/useSets";
import useAuth from "../hooks/useAuth";
import { saveStudySession } from "../lib/studySessions";

// Page for /sets/:id/test
export default function TestStudy() {
  const { id } = useParams();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const onlyStarred = params.get("starred") === "1";
  const [status, setStatus] = useState("loading"); // loading | ready | missing | error
  const [data, setData] = useState(null);

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
  function handleFinish(cardsDone) {
    return saveStudySession({
      userId: user.id,
      setId: id,
      mode: "test",
      cardsDone,
    });
  }

  if (status === "loading") {
    return (
      <main className="set-view">
        <p className="muted" aria-live="polite">
          Getting your test ready…
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
  // ?starred=1 means: study only the starred cards
  const studyCards = onlyStarred ? cards.filter((c) => c.starred) : cards;

  if (studyCards.length < 4) {
    return (
      <main className="set-view">
        <section className="set-state">
          <h2>
            {onlyStarred
              ? "A starred test needs at least 4 starred cards"
              : "A test needs at least 4 cards"}
          </h2>
          <p className="muted">
            {onlyStarred
              ? "Star a few more cards on the set page, then come back."
              : "Add a few more cards, then come back for a test."}
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
        <h1>Test</h1>
        <p className="muted">{set.title}</p>
        {onlyStarred && <p className="muted">Starred cards only</p>}
      </header>
      <TestMode
        key={`${id}-${onlyStarred}`}
        cards={studyCards}
        onFinish={handleFinish}
      />
    </main>
  );
}
