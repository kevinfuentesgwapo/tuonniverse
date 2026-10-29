import { useEffect } from "react";
import { Link } from "react-router-dom";

// Your public contact email. Shown on the page.
const CONTACT_EMAIL = "tuoniverse@gmail.com";
const LAST_UPDATED = "October 29, 2026";

export default function Terms() {
  // Always start at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="page privacy">
      <section className="privacy-hero">
        <div>
          <h1>Terms of use, made simple</h1>
          <p className="muted">
            Tuoniverse is a free study app. These are the rules for using it, in
            plain words.
          </p>
          <p className="muted privacy-updated">Last updated: {LAST_UPDATED}</p>
        </div>
        <img
          className="privacy-planet"
          src="/favicon.svg"
          alt=""
          width="80"
          height="80"
        />
      </section>

      <section className="privacy-card">
        <h2>Using Tuoniverse</h2>
        <p>
          Tuoniverse is free to use. You can make flashcard sets, take quizzes,
          write notes, and use AI to turn your text into cards. Please use it
          for studying.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Your stuff is yours</h2>
        <p>
          The sets, cards, and notes you make belong to you. We only store them
          so you can study with them. Read our{" "}
          <Link to="/privacy">privacy page</Link> to see what we keep.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Please be kind and careful</h2>
        <ul>
          <li>Do not put private information in your sets or notes.</li>
          <li>
            Do not upload anything harmful, illegal, or hurtful to others.
          </li>
          <li>
            Do not try to break the app, get into other people&apos;s data, or
            use it in a way that stops others from studying.
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>AI can make mistakes</h2>
        <p>
          AI cards and summaries are made by a computer, and they can be wrong.
          Always check them against your own notes or book before you trust
          them.
        </p>
        <p>
          AI use is limited each day to keep Tuoniverse free for everyone. The
          limit may change.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Things can change</h2>
        <p>
          Tuoniverse is a small project. We may change, pause, or stop parts of
          it. We will try to give notice when we can. We try our best to keep
          your data safe, but we cannot promise the app will always work or
          never lose data. Keep a copy of anything very important.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Leaving Tuoniverse</h2>
        <p>
          You can stop using Tuoniverse any time. To delete your account and
          data, follow the steps on our{" "}
          <Link to="/privacy#delete-data">privacy page</Link>.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Questions?</h2>
        <p>
          We are happy to help. Write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
