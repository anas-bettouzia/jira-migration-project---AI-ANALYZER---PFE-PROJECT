import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Home from './modules/overview/Home';
import Login from './modules/auth/Login';
import VerifyEmail from './modules/auth/VerifyEmail';
import ProfilePage from './modules/profile/ProfilePage';
import { AnalysisPage } from './modules/analysis/AnalysisPage';
import { ReportPage } from './modules/reports/ReportPage';

function App() {
  const token = useAuthStore((state) => state.token);

  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/analysis" 
            element={token ? <AnalysisPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/reports/:reportId" 
            element={token ? <ReportPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/login" 
            element={token ? <Navigate to="/" /> : <Login />} 
          />
          <Route path="/reset-password" element={<Home />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route
            path="/profile"
            element={token ? <ProfilePage /> : <Navigate to="/" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
