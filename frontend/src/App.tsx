import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { ThreatsPage } from './pages/ThreatsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AlertsPage } from './pages/AlertsPage';
import { PatternDetail } from './pages/PatternDetail';
import { ChatSimulator } from './pages/ChatSimulator';
import { SessionExplorer } from './pages/SessionExplorer';
import { TechniquesPage } from './pages/TechniquesPage';
import { GuardrailsPage } from './pages/GuardrailsPage';
import { ValidationPage } from './pages/ValidationPage';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/threats"   element={<ThreatsPage />} />
            <Route path="/agents"    element={<AgentsPage />} />
            <Route path="/alerts"    element={<AlertsPage />} />
            <Route path="/sessions"  element={<SessionExplorer />} />
            <Route path="/chat"      element={<ChatSimulator />} />
            <Route path="/pattern/:id" element={<PatternDetail />} />
            <Route path="/techniques" element={<TechniquesPage />} />
            <Route path="/guardrails" element={<GuardrailsPage />} />
            <Route path="/validation" element={<ValidationPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
