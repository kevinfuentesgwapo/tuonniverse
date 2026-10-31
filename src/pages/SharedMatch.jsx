import { useState } from "react";
import { useParams } from "react-router-dom";
import MatchGame from "../components/study/MatchGame";
import SharedStudyPage from "../components/study/SharedStudyPage";

// One game, and "Play again" starts a fresh one.
function SharedMatchGame({ code, cards }) {
  const [game, setGame] = useState(0);
  return (
    <MatchGame
      key={`${code}-${game}`}
      cards={cards}
      onAgain={() => setGame((n) => n + 1)}
      backTo={`/s/${code}`}
      backLabel="Back to the shared set"
    />
  );
}

// Practice a shared set with the match game: /s/:code/match
// Anyone with the link can do it, even logged out. Nothing is saved.
export default function SharedMatch() {
  const { code } = useParams();

  return (
    <SharedStudyPage
      code={code}
      heading="Match"
      loadingText="Getting your cards ready…"
      minCards={2}
      tooFewTitle="Match needs at least 2 cards"
      tooFewText="This shared set does not have enough cards to make pairs yet. You can still flip them."
    >
      {(cards) => <SharedMatchGame code={code} cards={cards} />}
    </SharedStudyPage>
  );
}
