import { useParams } from "react-router-dom";
import QuizMode from "../components/study/QuizMode";
import SharedStudyPage from "../components/study/SharedStudyPage";

// Practice a shared set with a quiz: /s/:code/quiz
// Anyone with the link can do it, even logged out. Nothing is saved.
export default function SharedQuiz() {
  const { code } = useParams();

  return (
    <SharedStudyPage
      code={code}
      heading="Quiz"
      loadingText="Getting your quiz ready…"
      minCards={2}
      tooFewTitle="A quiz needs at least 2 cards"
      tooFewText="This shared set does not have enough cards for a quiz yet. You can still flip them."
    >
      {(cards) => <QuizMode key={code} cards={cards} canStar={false} />}
    </SharedStudyPage>
  );
}
