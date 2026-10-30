import { Routes, Route, Outlet } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import SharedSet from "./pages/SharedSet";
import SetEditor from "./pages/SetEditor";
import Sets from "./pages/Sets";
import SetView from "./pages/SetView";
import FlipStudy from "./pages/FlipStudy";
import QuizStudy from "./pages/QuizStudy";
import WriteStudy from "./pages/WriteStudy";
import MatchStudy from "./pages/MatchStudy";
import TestStudy from "./pages/TestStudy";
import Notes from "./pages/Notes";
import NoteEditor from "./pages/NoteEditor";
import AiCards from "./pages/AiCards";
import Review from "./pages/Review";
import Settings from "./pages/Settings";
import SearchPage from "./pages/SearchPage";
import NotFound from "./pages/NotFound";
import Navbar from "./components/layout/Navbar";
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import useTheme from "./hooks/useTheme";
import useAuth from "./hooks/useAuth";
import useSettings from "./hooks/useSettings";

// Picks the frame around the page.
// Logged in = app shell (sidebar + top bar).
// Logged out = simple Navbar.
function Layout({ theme, onToggleTheme }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="page">
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (user) {
    return <AppShell theme={theme} onToggleTheme={onToggleTheme} />;
  }

  return (
    <>
      <Navbar theme={theme} onToggleTheme={onToggleTheme} />
      <Outlet />
    </>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  // Keeps calm mode on for every page.
  useSettings();

  return (
    <Routes>
      {/* Full-screen pages. No navbar, no sidebar. */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Pages inside the frame. */}
      <Route element={<Layout theme={theme} onToggleTheme={toggleTheme} />}>
        {/* Public pages. */}
        <Route path="/" element={<Home />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/s/:code" element={<SharedSet />} />

        {/* Private pages. Logged-out visitors are sent to /login. */}
        <Route
          path="/sets"
          element={
            <ProtectedRoute>
              <Sets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sets/new"
          element={
            <ProtectedRoute>
              <SetEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sets/:id/edit"
          element={
            <ProtectedRoute>
              <SetEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sets/:id"
          element={
            <ProtectedRoute>
              <SetView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sets/:id/flip"
          element={
            <ProtectedRoute>
              <FlipStudy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sets/:id/quiz"
          element={
            <ProtectedRoute>
              <QuizStudy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sets/:id/write"
          element={
            <ProtectedRoute>
              <WriteStudy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sets/:id/match"
          element={
            <ProtectedRoute>
              <MatchStudy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sets/:id/test"
          element={
            <ProtectedRoute>
              <TestStudy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/new"
          element={
            <ProtectedRoute>
              <NoteEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notes/:id"
          element={
            <ProtectedRoute>
              <NoteEditor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AiCards />
            </ProtectedRoute>
          }
        />

        <Route
          path="/review"
          element={
            <ProtectedRoute>
              <Review />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
