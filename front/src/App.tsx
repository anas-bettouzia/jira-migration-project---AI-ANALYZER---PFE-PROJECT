import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Home from './modules/overview/Home';
import Login from './modules/auth/Login';
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
            element={<ReportPage />} 
          />
          <Route 
            path="/login" 
            element={token ? <Navigate to="/" /> : <Login />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;