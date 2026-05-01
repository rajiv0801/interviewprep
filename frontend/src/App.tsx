import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import VerifyOTP from './pages/Auth/VerifyOTP';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import Settings from './pages/Settings/Settings';
import MockTest from './pages/MockTest/MockTest';
import MockSession from './pages/MockTest/MockSession';
import MockHistory from './pages/MockTest/MockHistory';
import Problems from './pages/Problems/Problems';
import ProblemSolver from './pages/Problems/ProblemSolver';
import Companies from './pages/Companies/Companies';
import Roadmaps from './pages/Roadmaps/Roadmaps';
import RoadmapDetail from './pages/Roadmaps/RoadmapDetail';
import Mentors from './pages/Mentors/Mentors';
import MentorProfile from './pages/Mentors/MentorProfile';
import BookingCheckout from './pages/Mentors/BookingCheckout';
import Messages from './pages/Messages/Messages';
import Profile from './pages/Profile/Profile';

// Wrapper for page transitions
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="page-wrapper"
    style={{ width: '100%' }}
  >
    {children}
  </motion.div>
);

const AppLayout = () => {
  const location = useLocation();

  // Define logic for showing Navbar
  const isAuthPage = ['/login', '/signup', '/verify-otp', '/forgot-password'].includes(location.pathname) || location.pathname.startsWith('/reset-password/');
  const isSessionPage = location.pathname.startsWith('/mock-test/session/');
  const isProblemSolverPage = location.pathname.startsWith('/problems/') && location.pathname !== '/problems';
  const isRoadmapDetailPage = location.pathname.startsWith('/roadmaps/') && location.pathname !== '/roadmaps';
  const isMessagesPage = location.pathname.startsWith('/messages');

  const showNavbar = !isAuthPage && !isSessionPage && !isProblemSolverPage && !isRoadmapDetailPage && !isMessagesPage;

  return (
    <div className="app">
      {showNavbar && <Navbar />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <PageWrapper>
              {localStorage.getItem('token') ? <Navigate to="/problems" replace /> : <Hero />}
            </PageWrapper>
          } />

          <Route path="/login" element={
            <PageWrapper>
              <Login />
            </PageWrapper>
          } />

          <Route path="/signup" element={
            <PageWrapper>
              <Signup />
            </PageWrapper>
          } />

          <Route path="/verify-otp" element={
            <PageWrapper>
              <VerifyOTP />
            </PageWrapper>
          } />

          <Route path="/forgot-password" element={
            <PageWrapper>
              <ForgotPassword />
            </PageWrapper>
          } />

          <Route path="/reset-password/:token" element={
            <PageWrapper>
              <ResetPassword />
            </PageWrapper>
          } />

          <Route path="/dashboard" element={
            <PageWrapper>
              <Dashboard />
            </PageWrapper>
          } />

          <Route path="/profile" element={
            <PageWrapper>
              <Profile />
            </PageWrapper>
          } />

          <Route path="/settings" element={
            <PageWrapper>
              <Settings />
            </PageWrapper>
          } />

          <Route path="/problems" element={
            <PageWrapper>
              <Problems />
            </PageWrapper>
          } />

          <Route path="/companies" element={
            <PageWrapper>
              <Companies />
            </PageWrapper>
          } />

          <Route path="/roadmaps" element={
            <PageWrapper>
              <Roadmaps />
            </PageWrapper>
          } />

          <Route path="/roadmaps/:slug" element={
            <PageWrapper>
              <RoadmapDetail />
            </PageWrapper>
          } />

          <Route path="/problems/:id" element={
            <PageWrapper>
              <ProblemSolver />
            </PageWrapper>
          } />

          <Route path="/mock-test" element={
            <PageWrapper>
              <MockTest />
            </PageWrapper>
          } />

          <Route path="/mock-test/history" element={
            <PageWrapper>
              <MockHistory />
            </PageWrapper>
          } />

          <Route path="/mock-test/session/new" element={
            <PageWrapper>
              <MockSession />
            </PageWrapper>
          } />

          <Route path="/mock-test/session/:sessionId" element={
            <PageWrapper>
              <MockSession />
            </PageWrapper>
          } />

          {/* Mentor Connect */}
          <Route path="/mentors" element={
            <PageWrapper>
              <Mentors />
            </PageWrapper>
          } />

          <Route path="/mentors/:slug" element={
            <PageWrapper>
              <MentorProfile />
            </PageWrapper>
          } />

          <Route path="/mentors/:slug/book" element={
            <PageWrapper>
              <BookingCheckout />
            </PageWrapper>
          } />

          {/* Chat */}
          <Route path="/messages" element={
            <Messages />
          } />

          <Route path="/messages/:conversationId" element={
            <Messages />
          } />
        </Routes>
      </AnimatePresence>
    </div>
  );
};

function App() {
  return (
    <Router>
      <SocketProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#fff',
              border: '1px solid #333',
            },
          }}
        />
        <AppLayout />
      </SocketProvider>
    </Router>
  );
}

export default App;
