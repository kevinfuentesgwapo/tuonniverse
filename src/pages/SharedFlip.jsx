import { useParams } from "react-router-dom";
import FlipCards from "../components/flashcards/FlipCards";
import SharedStudyPage from "../components/study/SharedStudyPage";

// Practice a shared set with flip cards: /s/:code/flip
// Anyone with the link can do it, even logged out. Nothing is saved.
export default function SharedFlip() {
  const { code } = useParams();

  return (
    <SharedStudyPage
      code={code}
      heading="Flip cards"
      loadingText="Getting the cards ready…"
      minCards={1}
      tooFewTitle="This set has no cards yet"
      tooFewText="There is nothing to flip here yet."
    >
      {(cards) => <FlipCards key={code} cards={cards} canStar={false} />}
    </SharedStudyPage>
  );
}
