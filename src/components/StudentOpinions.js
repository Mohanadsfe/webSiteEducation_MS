import React, { useEffect, useState } from 'react';
import { Typography, Paper } from '@mui/material';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './AddSubject';

function StudentOpinions() {
  const [opinions, setOpinions] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchOpinions = async () => {
      const q = query(collection(db, 'opinions'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedOpinions = querySnapshot.docs.map((doc) => doc.data());
      setOpinions(fetchedOpinions);
    };

    fetchOpinions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => (prevSlide + 1) % opinions.length);
    }, 3000); // Change slide every 3 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [opinions.length]);

  if (opinions.length === 0) return null;

  return (
    <div className="carousel-container">
      <Typography variant="h4" align="center" style={{ marginTop: '3rem' }}>
        Student Opinions
      </Typography>
      <div className="carousel">
        <div className="carousel-slide">
          <Paper className="opinion-box">
            <Typography variant="h6" className="opinion-name">
              {opinions[currentSlide].studentName} - {opinions[currentSlide].subject}
            </Typography>
            <Typography variant="body1" className="opinion-text">
              {opinions[currentSlide].opinion}
            </Typography>
          </Paper>
        </div>
      </div>
    </div>
  );
}

export default StudentOpinions;
