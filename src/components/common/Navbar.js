import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('مستخدم');
  const [role, setRole] = useState('');            // NEW: track role
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const u = snap.data();
          setUserName(`${u.firstName} ${u.lastName}`);
          setRole(u.role || '');                   // NEW: set role
        } else {
          setUserName('مستخدم');
          setRole('');
        }
      } else {
        setIsLoggedIn(false);
        setUserName('');
        setRole('');
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      setRole('');
      navigate('/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        direction: 'rtl',
        backgroundImage: 'linear-gradient(90deg, #1565c0, #1976d2, #1e88e5)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.15)'
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: 64,
          '& .MuiButton-root': {
            fontWeight: 800,
            borderRadius: '999px',
            textTransform: 'none'
          },
        }}
      >
        {/* Nav buttons — row-reverse makes them appear from right to left */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexDirection: 'row-reverse',
          }}
        >
          <Button
            color="inherit"
            component={Link}
            to="/bundles"
            sx={{ px: 2, bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
          >
            الرزمات
          </Button>

          <Button
            color="inherit"
            component={Link}
            to="/courses"
            sx={{ px: 2.25, bgcolor: 'rgba(255,255,255,0.22)', '&:hover': { bgcolor: 'rgba(255,255,255,0.30)' } }}
          >
            الدورات
          </Button>

          <Button
            color="inherit"
            component={Link}
            to="/contact"
            sx={{ px: 2, bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
          >
            اتصل بنا
          </Button>

          {isLoggedIn ? (
            <Button color="inherit" onClick={handleLogout} sx={{ px: 2 }}>
              تسجيل الخروج
            </Button>
          ) : (
            <Button color="inherit" component={Link} to="/login" sx={{ px: 2 }}>
              تسجيل الدخول
            </Button>
          )}

          <Button
            color="inherit"
            component={Link}
            to="/about"
            sx={{ px: 2, bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
          >
            من نحن؟
          </Button>

          {/* NEW: Teacher-only dashboard link */}
          {isLoggedIn && role === 'teacher' && (
            <>
              <Button color="inherit" component={Link} to="/teacher-approvals" sx={{ fontWeight: 800 }}>
                طلبات المعلمين
              </Button>
              <Button color="inherit" component={Link} to="/teacher" sx={{ fontWeight: 800 }}>
                لوحة المدرّس
              </Button>
            </>
          )}

          <Button color="inherit" component={Link} to="/" sx={{ px: 2 }}>
            الصفحة الرئيسية
          </Button>
          
        </Box>




        {isLoggedIn && (
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, mr: 2, letterSpacing: 0.2 }}
          >
            👋 مرحباً {userName}
          </Typography>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
