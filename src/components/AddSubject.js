import React, { useEffect, useState } from 'react';
import { Typography, Container, Grid, TextField, MenuItem, Select, Button, InputLabel, FormControl } from '@mui/material';
import { collection, addDoc, Timestamp, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './AddSubject.css';

function AddOpinion() {
  const [studentName, setStudentName] = useState('');
  const [opinion, setOpinion] = useState('');
  const [subject, setSubject] = useState('');
  const [setOpinions] = useState([]);

  const subjects = [
    'אלגברה לינארית 1',
    'אלגברה לינארית 2',
    'אינפי 1',
    'אינפי 2',
    'מבוא לתכנות שפת פייתון',
    'שפה תכנות C',
    'שפה תכנות CPP',
    'שפה תכנות Java',
    'Java OOP',
    'מבני נתונים',
    'אלגוריתמים',
    'מתמטיקה מכינה',
    'מתמטיקה דיסקרטית'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!studentName || !opinion || !subject) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      await addDoc(collection(db, 'opinions'), {
        studentName,
        opinion,
        subject,
        createdAt: Timestamp.now(),
      });

      alert('Your opinion has been submitted!');
      setStudentName('');
      setOpinion('');
      setSubject('');
      fetchOpinions(); // Refresh opinions
    } catch (error) {
      console.error('Error submitting opinion:', error);
      alert('Failed to submit your opinion. Please try again.');
    }
  };

  const fetchOpinions = async () => {
    const q = query(collection(db, 'opinions'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const fetchedOpinions = querySnapshot.docs.map((doc) => doc.data());
    setOpinions(fetchedOpinions);
  };

  useEffect(() => {
    fetchOpinions();
  }, []);

 

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Typography variant="h4" align="center" gutterBottom>
        Share Your Opinion
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Your Name"
              fullWidth
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Your Opinion"
              fullWidth
              multiline
              rows={4}
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Subject</InputLabel>
              <Select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              >
                {subjects.map((subj, index) => (
                  <MenuItem key={index} value={subj}>
                    {subj}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary" fullWidth>
              Submit Opinion
            </Button>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}

export default AddOpinion;
