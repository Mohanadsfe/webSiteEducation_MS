import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import Navbar from './components/common/Navbar';
import Home from './pages/HomePage/HomePage';
import About from './pages/About/AboutUs';
import Contact from './pages/Contact/ContactUs';
import LoginPage from './pages/Auth/LoginPage';
import SignUpPage from './pages/Auth/SignUpPage';
import ForgotPassword from './pages/Auth/ForgotPassword';
import BundlesPage from './pages/Bundles/BundlesPage';
import BundleTermsPage from './pages/Bundles/BundleTermsPage';
import TeacherDashboard from './components/common/TeacherDashboard';
import StudentDashboard from './components/common/StudentDashboard';
import CoursesPage from './pages/Courses/CoursesPage';
import CourseDetail from './pages/Courses/CourseDetail';
import LessonManagePage from './pages/Courses/LessonManagePage';
import EnrollmentManagePage from './pages/Courses/EnrollmentManagePage';
import MyBookingsPage from './pages/Bookings/MyBookingsPage';
import BookingManagePage from './pages/Bookings/BookingManagePage';
import TeacherApprovals from './pages/Admin/TeacherApprovals';
import ExamReminder from './components/common/ExamReminder';
import BookingReminder from './components/common/BookingReminder';
import LecturePush from './components/common/LecturePush';
import { LanguageProvider } from './context/LanguageContext';
import theme from './theme';

function AppContent() {
  const location = useLocation();
  const hideNavbarRoutes = ['/login', '/signup', '/forgot-password'];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {!shouldHideNavbar && <Navbar />}
      {!shouldHideNavbar && <ExamReminder />}
      {!shouldHideNavbar && <BookingReminder />}
      {!shouldHideNavbar && <LecturePush />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/bundles" element={<BundlesPage />} />
        <Route path="/bundles/:bundleId/terms" element={<BundleTermsPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:courseId" element={<CourseDetail />} />
        <Route path="/courses/:courseId/lessons" element={<LessonManagePage />} />
        <Route path="/courses/:courseId/enrollments" element={<EnrollmentManagePage />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher-approvals" element={<TeacherApprovals />} />
        <Route path="/me" element={<StudentDashboard />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/booking-manage" element={<BookingManagePage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <AppContent />
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
