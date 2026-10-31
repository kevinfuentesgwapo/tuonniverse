import { useParams } from "react-router-dom";
import WriteMode from "../components/study/WriteMode";
import SharedStudyPage from "../components/study/SharedStudyPage";

// Practice a shared set by writing: /s/:code/write
// Anyone with the link can do it, even logged out. Nothing is saved.
export default function SharedWrite() {
  const { code } = useParams();

  return (
    <SharedStudyPage
      code={code}
      heading="Write"
      loadingText="Getting your cards ready…"
      minCards={1}
      tooFewTitle="This set has no cards yet"
      tooFewText="There is nothing to write about here yet."
    >
      {(cards) => <WriteMode key={code} cards={cards} canStar={false} />}
    </SharedStudyPage>
  );
}
