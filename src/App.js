import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/HomePage';
import About from './components/AboutUs';
import Contact from './components/ContactUs';
import AddSubject from './components/AddSubject';
import LoginPage from './components/LoginPage';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/add-subject" element={<AddSubject />} />
      </Routes>
    </Router>
  );
}

export default App;
