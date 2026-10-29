import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Icon from "../components/ui/Icon";

// Your public contact email. Shown on the page.
const CONTACT_EMAIL = "tuoniverse@gmail.com";
const LAST_UPDATED = "October 29, 2026";

// Three happy promises shown at the top.
const PROMISES = [
  { icon: "target", text: "We never sell your data" },
  { icon: "sparkles", text: "No ads. Ever." },
  { icon: "bulb", text: "Delete your data anytime" },
];

export default function Privacy() {
  const { hash } = useLocation();

  // Lets links like /privacy#delete-data jump to the right part.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView();
  }, [hash]);

  return (
    <main className="page privacy">
      <section className="privacy-hero">
        <div>
          <h1>Your privacy, made simple</h1>
          <p className="muted">
            Tuoniverse is a free study app. Here is what we keep and why, in
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

      <ul className="privacy-promises" aria-label="Our promises">
        {PROMISES.map((item) => (
          <li key={item.text} className="privacy-promise">
            <span className="home-icon" aria-hidden="true">
              <Icon name={item.icon} size={22} />
            </span>
            <span>{item.text}</span>
          </li>
        ))}
      </ul>

      <section className="privacy-card">
        <h2>What we keep</h2>
        <ul>
          <li>
            Your name, email, and profile picture from Google or Facebook, or
            the email you sign up with.
          </li>
          <li>The sets, cards, and notes you make.</li>
          <li>
            How many AI requests you use each day (to keep it fair and free).
          </li>
        </ul>
      </section>

      <section className="privacy-card">
        <h2>Why we keep it</h2>
        <p>
          To log you in and to show your study stuff back to you. That is all.
          We do not sell your data. We do not show ads.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Where it is stored</h2>
        <p>
          Your data is stored with Supabase. Only you can read your own sets,
          cards, and notes.
        </p>
      </section>

      <section className="privacy-card">
        <h2>AI features</h2>
        <p>
          When you ask AI to make cards or a summary, the text you choose is
          sent to Google Gemini through our server. Only that text is sent.
        </p>
        <p>
          When file upload arrives, your file is read inside your browser. The
          file itself is never uploaded. Only the text from it is sent to
          Gemini, and only when you click the button.
        </p>
      </section>

      <section className="privacy-card">
        <h2>Cookies and browser storage</h2>
        <p>
          We use your browser storage to keep you logged in and to remember your
          theme (dark or light). We do not use tracking or ad cookies.
        </p>
      </section>

      <section className="privacy-card" id="delete-data">
        <h2>Delete your data</h2>
        <p>
          You can ask us to delete your account and everything in it: your
          profile, sets, cards, and notes.
        </p>
        <ol>
          <li>
            Send an email to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
          <li>
            Write &quot;Delete my Tuoniverse data&quot; and use the same email
            you log in with.
          </li>
          <li>We will delete your data and reply to say it is done.</li>
        </ol>
        <p className="muted">
          If you logged in with Facebook, you can also remove Tuoniverse in your
          Facebook settings under Apps and Websites. Then email us to delete the
          data we kept.
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
