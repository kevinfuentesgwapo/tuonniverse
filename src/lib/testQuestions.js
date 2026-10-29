import { grade } from "./gradeAnswer";

// A test has at most this many questions.
export const MAX_QUESTIONS = 10;

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Other definitions in the set (used for wrong choices and false statements).
function otherDefinitions(card, pool) {
  return [
    ...new Set(
      pool
        .filter((c) => c.id !== card.id && c.definition !== card.definition)
        .map((c) => c.definition),
    ),
  ];
}

// Builds a mixed test: multiple choice, true or false, and typed answers.
// Each question: { kind: "mc" | "tf" | "write", card, answer, ... }
export function buildTest(cards) {
  const picked = shuffle(cards).slice(0, MAX_QUESTIONS);
  const kinds = shuffle(picked.map((_, i) => ["mc", "tf", "write"][i % 3]));
  const tfFlags = shuffle([true, false, true, false, true, false]);
  let tfCount = 0;

  return picked.map((card, i) => {
    const wrongs = otherDefinitions(card, cards);
    const kind = kinds[i];

    if (kind === "mc" && wrongs.length > 0) {
      return {
        kind: "mc",
        card,
        answer: card.definition,
        options: shuffle([card.definition, ...shuffle(wrongs).slice(0, 3)]),
      };
    }

    if (kind === "tf" && wrongs.length > 0) {
      const isTrue = tfFlags[tfCount % tfFlags.length];
      tfCount += 1;
      return {
        kind: "tf",
        card,
        answer: card.definition,
        isTrue,
        shown: isTrue ? card.definition : shuffle(wrongs)[0],
      };
    }

    // Typed answer (also used when there are no other definitions to pick from)
    return { kind: "write", card, answer: card.definition };
  });
}

// Did the student give any answer?
export function isAnswered(answer) {
  return (
    answer !== undefined &&
    answer !== null &&
    !(typeof answer === "string" && answer.trim() === "")
  );
}

// Marks one answer. Small typos in typed answers still count as right.
export function gradeQuestion(question, answer) {
  if (!isAnswered(answer)) return { right: false, close: false };
  if (question.kind === "mc") {
    return {
      right: question.options[answer] === question.answer,
      close: false,
    };
  }
  if (question.kind === "tf") {
    return { right: answer === question.isTrue, close: false };
  }
  const result = grade(answer, question.answer);
  return { right: result !== "wrong", close: result === "close" };
}

// Words to show for "Your answer" in the review list.
export function describeAnswer(question, answer) {
  if (!isAnswered(answer)) return "No answer";
  if (question.kind === "mc") return question.options[answer];
  if (question.kind === "tf") {
    return `${answer ? "True" : "False"} to “${question.shown}”`;
  }
  return answer;
}
