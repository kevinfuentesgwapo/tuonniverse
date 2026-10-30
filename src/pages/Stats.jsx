import { useMemo } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/ui/Icon";
import useSets from "../hooks/useSets";
import useStats from "../hooks/useStats";
import {
  KNOWN_DAYS,
  MODES,
  MODE_LABELS,
  computeStats,
  knownBySet,
} from "../lib/stats";

const BAR_MAX = 110; // tallest bar in the 14 day chart, in pixels
const MAX_SETS = 10;

// One row with a name, a sentence and a bar. The sentence is the real answer,
// so the bar never has to carry the meaning alone.
function BarRow({ label, to, text, value, max }) {
  const share = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <li className="sx-row">
      <div className="sx-row-head">
        {to ? (
          <Link to={to} className="sx-row-name">
            {label}
          </Link>
        ) : (
          <span className="sx-row-name">{label}</span>
        )}
        <span className="muted">{text}</span>
      </div>
      <div
        className="sx-track"
        role="progressbar"
        aria-label={`${label}: ${text}`}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <span className="sx-fill" style={{ width: `${share}%` }} />
      </div>
    </li>
  );
}

// Page for /stats. Honest numbers from your own study rounds.
export default function Stats() {
  const { loading, error, sessions, progress, reload } = useStats();
  const { sets, loading: setsLoading, error: setsError } = useSets();

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const known = useMemo(() => knownBySet(progress), [progress]);

  const setRows = useMemo(() => {
    return sets
      .filter((set) => set.cardCount > 0)
      .map((set) => ({
        ...set,
        known: Math.min(known.get(set.id) || 0, set.cardCount),
      }))
      .sort(
        (a, b) =>
          b.known / b.cardCount - a.known / a.cardCount ||
          a.title.localeCompare(b.title),
      )
      .slice(0, MAX_SETS);
  }, [sets, known]);

  const chartMax = Math.max(1, ...stats.last14.map((day) => day.cards));
  const modeMax = Math.max(1, ...MODES.map((mode) => stats.modeRounds[mode]));

  let body;
  if (loading || setsLoading) {
    body = (
      <p className="muted" aria-live="polite">
        Counting your stars…
      </p>
    );
  } else if (error || setsError) {
    body = (
      <div className="sx-card">
        <p>We could not load your numbers just now. Your stuff is safe.</p>
        <button type="button" className="btn btn-primary" onClick={reload}>
          Try again
        </button>
      </div>
    );
  } else if (stats.totalRounds === 0) {
    body = (
      <div className="sx-card">
        <h2>Your numbers will show up here</h2>
        <p className="muted">
          Study one round and Tuo will start counting. Every small step counts!
        </p>
        <Link to="/sets" className="btn btn-primary sx-start">
          Pick a set to study
        </Link>
      </div>
    );
  } else {
    body = (
      <>
        <div className="sx-tiles">
          <div className="sx-tile">
            <span className="sx-num">
              <Icon name="flame" size={24} /> {stats.streak}
            </span>
            <span className="sx-label">
              {stats.streak === 1 ? "day in a row" : "days in a row"}
            </span>
          </div>
          <div className="sx-tile">
            <span className="sx-num">{stats.bestStreak}</span>
            <span className="sx-label">best streak (days)</span>
          </div>
          <div className="sx-tile">
            <span className="sx-num">{stats.daysStudied}</span>
            <span className="sx-label">
              {stats.daysStudied === 1 ? "day studied" : "days studied"}
            </span>
          </div>
          <div className="sx-tile">
            <span className="sx-num">{stats.totalCards}</span>
            <span className="sx-label">cards done in total</span>
          </div>
        </div>

        <section className="sx-card" aria-labelledby="sx-chart-title">
          <h2 id="sx-chart-title">Last 14 days</h2>
          <p className="muted">
            Cards you finished each day. Today is underlined.
          </p>
          <div className="sx-chart-scroll">
            <ol className="sx-chart">
              {stats.last14.map((day) => {
                const height =
                  day.cards === 0
                    ? 3
                    : Math.max(6, Math.round((day.cards / chartMax) * BAR_MAX));
                const full = day.date.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <li
                    key={day.key}
                    className={`sx-day${day.isToday ? " is-today" : ""}`}
                  >
                    <span className="sx-sr">
                      {full}: {day.cards} {day.cards === 1 ? "card" : "cards"}
                      {day.isToday ? " (today)" : ""}
                    </span>
                    <span className="sx-count" aria-hidden="true">
                      {day.cards}
                    </span>
                    <span
                      className={`sx-bar${day.cards === 0 ? " is-zero" : ""}`}
                      style={{ height: `${height}px` }}
                      aria-hidden="true"
                    />
                    <span className="sx-dlabel" aria-hidden="true">
                      <span>
                        {day.date.toLocaleDateString(undefined, {
                          weekday: "narrow",
                        })}
                      </span>
                      <span>{day.date.getDate()}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="muted sx-note">
            Every card in every round counts, so a card you study twice counts
            twice.
          </p>
        </section>

        <section className="sx-card" aria-labelledby="sx-modes-title">
          <h2 id="sx-modes-title">How you like to study</h2>
          {stats.favoriteMode && (
            <p className="muted">
              {MODE_LABELS[stats.favoriteMode]} is your most used way so far.
            </p>
          )}
          <ul className="sx-rows">
            {MODES.map((mode) => (
              <BarRow
                key={mode}
                label={MODE_LABELS[mode]}
                text={`${stats.modeRounds[mode]} ${stats.modeRounds[mode] === 1 ? "round" : "rounds"}`}
                value={stats.modeRounds[mode]}
                max={modeMax}
              />
            ))}
          </ul>
        </section>

        <section className="sx-card" aria-labelledby="sx-sets-title">
          <h2 id="sx-sets-title">Your sets</h2>
          <p className="muted">
            A card counts as known well when Review lets it wait {KNOWN_DAYS}{" "}
            days or more. Use Review to grow these bars.
          </p>
          {setRows.length === 0 ? (
            <p className="muted">You have no sets with cards yet.</p>
          ) : (
            <ul className="sx-rows">
              {setRows.map((set) => (
                <BarRow
                  key={set.id}
                  label={set.title}
                  to={`/sets/${set.id}`}
                  text={`${set.known} of ${set.cardCount} known well`}
                  value={set.known}
                  max={set.cardCount}
                />
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }

  return (
    <main className="set-view">
      <header className="set-view-head">
        <h1>Your stats</h1>
        <p className="muted">Real numbers from your own study. No tricks.</p>
      </header>
      {body}
    </main>
  );
}
