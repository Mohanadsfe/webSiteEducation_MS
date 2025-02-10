import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Paper } from '@mui/material';
import GoogleCalendar from '../components/GoogleCalendar';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import StudentOpinions from './StudentOpinions';
import './HomePage.css';

function HomePage() {
  const [userRole='teacher', setUserRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setUserRole(userRole);  // Example role; replace with actual role fetching logic
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [navigate]);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <div className="homepage">
      <Container className="homepage-container">
        <Typography variant="h3" align="center" gutterBottom>
          ברוכים הבאים לאתר הלמידה שלי
        </Typography>

        <GoogleCalendar />

        <Grid container spacing={4} style={{ marginTop: '2rem' }}>
          <Grid item xs={12} md={4}>
            <Paper className="homepage-paper">
              <SchoolIcon fontSize="large" style={{ color: '#1976d2' }} />
              <Typography variant="h5" gutterBottom>
                מורים מומחים
              </Typography>
              <Typography variant="body1" paragraph>
                למדו ממורים בעלי ניסיון במתמטיקה, פיזיקה ומדעי המחשב.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className="homepage-paper">
              <AccessTimeIcon fontSize="large" style={{ color: '#1976d2' }} />
              <Typography variant="h5" gutterBottom>
                גמישות בזמנים
              </Typography>
              <Typography variant="body1" paragraph>
                הזמינו שיעורים בזמן שנוח לכם. אנו מציעים גמישות מלאה בזמני השיעורים.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper className="homepage-paper">
              <PersonIcon fontSize="large" style={{ color: '#1976d2' }} />
              <Typography variant="h5" gutterBottom>
                למידה מותאמת אישית
              </Typography>
              <Typography variant="body1" paragraph>
                קבלו חווית למידה מותאמת אישית בהתאם לצרכים שלכם ולמטרות הלימודיות שלכם.
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <StudentOpinions />
      </Container>
    </div>
  );
}

export default HomePage;
