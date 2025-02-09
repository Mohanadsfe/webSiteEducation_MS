// import React, { useEffect, useState } from 'react';
// import { Container, Typography, Grid, Paper } from '@mui/material';
// import CalendarComponent from './CalendarComponent';
// import { onAuthStateChanged } from 'firebase/auth';
// import { auth, db } from '../firebaseConfig';
// import { useNavigate } from 'react-router-dom';
// import { collection, getDocs, orderBy, query } from 'firebase/firestore';
// import SchoolIcon from '@mui/icons-material/School';
// import AccessTimeIcon from '@mui/icons-material/AccessTime';
// import PersonIcon from '@mui/icons-material/Person';
// import './HomePage.css';

// function HomePage() {
//   const [userRole, setUserRole] = useState('');
//   const [isLoading, setIsLoading] = useState(true);
//   const [opinions, setOpinions] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, (user) => {
//       if (!user) {
//         navigate('/login');
//       } else {
//         // Example role; replace with role fetching logic if needed
//         setUserRole('teacher');  
//         setIsLoading(false);
//       }
//     });

//     return unsubscribe;
//   }, [navigate]);

//   useEffect(() => {
//     const fetchOpinions = async () => {
//       const q = query(collection(db, 'opinions'), orderBy('createdAt', 'desc'));
//       const querySnapshot = await getDocs(q);
//       const fetchedOpinions = querySnapshot.docs.map((doc) => doc.data());
//       setOpinions(fetchedOpinions);
//     };

//     fetchOpinions();
//   }, []);

//   if (isLoading) {
//     return <Typography>Loading...</Typography>;
//   }

//   return (
//     <div className="homepage">
//       <Container className="homepage-container">
//         <Typography variant="h3" align="center" gutterBottom>
//           ברוכים הבאים לאתר הלמידה שלי
//         </Typography>

//         <CalendarComponent userRole={userRole} />

//         <Grid container spacing={4} style={{ marginTop: '2rem' }}>
//           <Grid item xs={12} md={4}>
//             <Paper className="homepage-paper">
//               <SchoolIcon fontSize="large" style={{ color: '#1976d2' }} />
//               <Typography variant="h5" gutterBottom>
//                 מורים מומחים
//               </Typography>
//               <Typography variant="body1" paragraph>
//                 למדו ממורים בעלי ניסיון במתמטיקה, פיזיקה ומדעי המחשב.
//               </Typography>
//             </Paper>
//           </Grid>

//           <Grid item xs={12} md={4}>
//             <Paper className="homepage-paper">
//               <AccessTimeIcon fontSize="large" style={{ color: '#1976d2' }} />
//               <Typography variant="h5" gutterBottom>
//                 גמישות בזמנים
//               </Typography>
//               <Typography variant="body1" paragraph>
//                 הזמינו שיעורים בזמן שנוח לכם. אנו מציעים גמישות מלאה בזמני השיעורים.
//               </Typography>
//             </Paper>
//           </Grid>

//           <Grid item xs={12} md={4}>
//             <Paper className="homepage-paper">
//               <PersonIcon fontSize="large" style={{ color: '#1976d2' }} />
//               <Typography variant="h5" gutterBottom>
//                 למידה מותאמת אישית
//               </Typography>
//               <Typography variant="body1" paragraph>
//                 קבלו חווית למידה מותאמת אישית בהתאם לצרכים שלכם ולמטרות הלימודיות שלכם.
//               </Typography>
//             </Paper>
//           </Grid>
//         </Grid>

//         {/* Student Opinions Section */}
//         <Typography variant="h4" align="center" gutterBottom style={{ marginTop: '3rem' }}>
//           Student Opinions
//         </Typography>
//         <div className="student-opinions-carousel">
//           {opinions.map((opinion, index) => (
//             <Paper key={index} className="opinion-box">
//               <Typography variant="h6" style={{ color: '#0d47a1' }}>{opinion.studentName}</Typography>
//               <Typography variant="body1" style={{ marginTop: '0.5rem' }}>{opinion.opinion}</Typography>
//             </Paper>
//           ))}
//         </div>
//       </Container>
//     </div>
//   );
// }

// export default HomePage;
import React, { useEffect, useState } from 'react';
import { Container, Typography, Grid, Paper } from '@mui/material';
import CalendarComponent from './CalendarComponent';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import StudentOpinions from './StudentOpinions';  // Import the slider component
import './HomePage.css';

function HomePage() {
  const [userRole, setUserRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setUserRole('teacher');  // Example role; replace with actual role fetching logic
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

        <CalendarComponent userRole={userRole} />

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

        {/* Student Opinions Section */}
        <StudentOpinions />
      </Container>
    </div>
  );
}

export default HomePage;
