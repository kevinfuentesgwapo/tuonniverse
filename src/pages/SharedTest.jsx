import { useParams } from "react-router-dom";
import TestMode from "../components/study/TestMode";
import SharedStudyPage from "../components/study/SharedStudyPage";

// Practice a shared set with a test: /s/:code/test
// Anyone with the link can do it, even logged out. Nothing is saved.
export default function SharedTest() {
  const { code } = useParams();

  return (
    <SharedStudyPage
      code={code}
      heading="Test"
      loadingText="Getting your test ready…"
      minCards={4}
      tooFewTitle="A test needs at least 4 cards"
      tooFewText="This shared set does not have enough cards for a test yet. You can still flip them."
    >
      {(cards) => <TestMode key={code} cards={cards} canStar={false} />}
    </SharedStudyPage>
  );
}
