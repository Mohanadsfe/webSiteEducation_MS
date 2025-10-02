import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Home from './pages/HomePage/HomePage';
import About from './pages/About/AboutUs';
import Contact from './pages/Contact/ContactUs';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ForgotPassword from './pages/Auth/ForgotPassword';
import BundlesPage from './pages/Bundles/BundlesPage';
import TeacherDashboard from './components/common/TeacherDashboard';
import StudentDashboard from './components/common/StudentDashboard';
import CoursesPage from './pages/Courses/CoursesPage';
import CourseDetail from './pages/Courses/CourseDetail';
import TeacherApprovals from './pages/Admin/TeacherApprovals';

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ['/login', '/signup', '/forgot-password'];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/bundles" element={<BundlesPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetail />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher-approvals" element={<TeacherApprovals />} />
        <Route path="/me" element={<StudentDashboard />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AppContent />
    </Router>
  );
}

export default App;
