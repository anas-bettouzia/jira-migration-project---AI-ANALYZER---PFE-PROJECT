import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Home from './modules/overview/Home';
import Login from './modules/auth/Login';
import ProfilePage from './modules/profile/ProfilePage';
import { AnalysisPage } from './modules/analysis/AnalysisPage';
import { ReportPage } from './modules/reports/ReportPage';
import { reportService } from './services/reportService';

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
            path="/reports"
            element={token ? <ReportsRedirect /> : <Navigate to="/" />}
          />
          <Route 
            path="/login" 
            element={token ? <Navigate to="/" /> : <Login />} 
          />
          <Route path="/reset-password" element={<Home />} />
          <Route path="/verify-email" element={<Home />} />
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

const ReportsRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const openLatestReport = async () => {
      try {
        const response = await reportService.listReports();
        const reportId = response.reports?.find((report) => Boolean(report.report_id))?.report_id;
        if (!isMounted) return;
        navigate(reportId ? `/reports/${reportId}` : '/analysis', { replace: true });
      } catch {
        if (isMounted) navigate('/analysis', { replace: true });
      }
    };

    openLatestReport();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return null;
};

export default App;
