import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, TextField, Typography, Container, Paper, Box,
  InputAdornment, IconButton, Fade, Slide, CircularProgress
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, School as SchoolIcon, Close as CloseIcon, Email as EmailIcon, Instagram } from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/FirebaseService';
import { doc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { AuthError } from '../../components/common/ErrorDisplay';
import useErrorHandler from '../../hooks/useErrorHandler';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  const { error, isLoading, handleError, clearError, executeWithErrorHandling } = useErrorHandler();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formWidth, setFormWidth] = useState(480);
  const [showLoginBox, setShowLoginBox] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const MIN_FORM = 320;
  const MAX_FORM = 900;

  const computeSizeFromImage = useCallback(() => {
    // Since background is now handled by CSS, use viewport-based sizing
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const baseWidth = Math.min(vw * 0.4, vh * 0.6);
    setFormWidth(Math.max(MIN_FORM, Math.min(MAX_FORM, baseWidth)));
  }, []);

  useEffect(() => {
    computeSizeFromImage();
    let t = null;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => computeSizeFromImage(), 150);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [computeSizeFromImage]);

  // Error handling function (kept for reference)


  const handleLogin = async () => {
    clearError();
    
    if (!email || !password) {
      handleError({ code: 'required', message: 'رجاءً املأ كل الحقول المطلوبة.' }, 'validation');
      return;
    }

    setIsNavigating(true);

    const result = await executeWithErrorHandling(async () => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = auth.currentUser;
      
      if (user) {
        try {
          await getDoc(doc(db, 'users', user.uid));
        } catch (e) {
          console.error('Firestore read failed:', e.code, e.message);
        }
      }
      
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/');
      return { success: true };
    }, 'auth');

    if (result?.success) {
      // Success handled above
    } else {
      setIsNavigating(false);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  const scaleFactor = Math.max(0.85, Math.min(1.15, formWidth / 480));

  return (
    <Box
      className={`login-container ${showLoginBox ? 'show-login-box' : ''}`}
      onClick={() => {
        if (!showLoginBox) {
          setShowLoginBox(true);
        }
      }}
    >
      {/* Logo in top-left */}
      <Box className="login-logo">
        <SchoolIcon className="login-logo-icon" />
        <Typography className="login-logo-title">
          المعرفة
        </Typography>
        <Typography className="login-logo-subtitle">
          ms_education
        </Typography>
        
        {/* Instagram Icon below logo */}
        <Box
          sx={{
            position: 'absolute',
            top: '120px',
            left: '20px',
            zIndex: 1000,
          }}
        >
          <IconButton
            onClick={() => window.open('https://www.instagram.com/allinone_mm?igsh=enV2aGs4YnJzdzIy&utm_source=qr', '_blank')}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '50%',
              width: 60,
              height: 60,
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,1)',
                transform: 'scale(1.1)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              }
            }}
          >
            <Instagram sx={{ 
              fontSize: 30, 
              color: '#E4405F',
              transition: 'all 0.3s ease'
            }} />
          </IconButton>
        </Box>
      </Box>

      {/* Click instruction when box is hidden */}
      {!showLoginBox && (
        <Fade in={true} timeout={1000}>
          <Box className="login-instruction-box">
            <Box className="login-instruction-content">
              <LoginIcon className="login-instruction-icon" />
              <Typography className="login-instruction-text">
                اضغط هنا لتسجيل الدخول
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}

      <Slide direction="up" in={showLoginBox} timeout={800}>
        <Container
          disableGutters
          className="login-form-container"
          style={{ width: `${formWidth}px` }}
        >
          <Paper 
            elevation={24}
            className="login-form-paper"
            style={{ padding: `${32 * scaleFactor}px` }}
          >
            {/* Close Button */}
            <IconButton
              onClick={() => setShowLoginBox(false)}
              className="login-close-button"
            >
              <CloseIcon sx={{ fontSize: 20, color: '#666' }} />
            </IconButton>

            {/* Header Section */}
            <Fade in={true} timeout={1000}>
              <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1976d2, #00c853)',
                    mb: 2,
                    boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)', boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)' },
                      '50%': { transform: 'scale(1.05)', boxShadow: '0 12px 40px rgba(25, 118, 210, 0.4)' },
                      '100%': { transform: 'scale(1)', boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)' },
                    }
                  }}
                >
                  <SchoolIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography
                  variant="h4"
                  sx={{ 
                    fontSize: `${(32 * scaleFactor).toFixed(0)}px`,
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #1976d2, #00c853)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    letterSpacing: '0.5px'
                  }}
                >
                  تسجيل الدخول
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ 
                    fontSize: `${(14 * scaleFactor).toFixed(0)}px`,
                    color: 'text.secondary',
                    opacity: 0.8
                  }}
                >
                  مرحباً بك في منصة التعليم الخاصة بي
                </Typography>
              </Box>
            </Fade>

            {/* Error Display */}
            {error && (
              <Fade in={true} timeout={500}>
                <Box sx={{ mb: 3 }}>
                  <AuthError
                    error={error}
                    onDismiss={clearError}
                    actions={[
                      {
                        label: 'إنشاء حساب جديد',
                        onClick: () => navigate('/signup'),
                        variant: 'outlined',
                        color: 'primary'
                      }
                    ]}
                  />
                </Box>
              </Fade>
            )}

            {/* Form Fields */}
            <Box sx={{ mb: 3 }}>
              <TextField
                label="البريد الإلكتروني"
                type="email"
                fullWidth
                margin="normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: `${14 * scaleFactor}px`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                    },
                    '&.Mui-focused': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.2)',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: `${14 * scaleFactor}px`,
                    fontWeight: 500,
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <EmailIcon sx={{ 
                        fontSize: `${20 * scaleFactor}px`,
                        color: 'primary.main',
                        opacity: 0.7
                      }} />
                    </InputAdornment>
                  )
                }}
              />
              
              <TextField
                label="كلمة المرور"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    fontSize: `${14 * scaleFactor}px`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)',
                    },
                    '&.Mui-focused': {
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 20px rgba(25, 118, 210, 0.2)',
                    }
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: `${14 * scaleFactor}px`,
                    fontWeight: 500,
                  }
                }}
                InputProps={{ 
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ 
                          fontSize: `${20 * scaleFactor}px`,
                          color: 'primary.main',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            color: 'primary.dark'
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* Login Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              disabled={isLoading || isNavigating}
              startIcon={(isLoading || isNavigating) ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
              sx={{
                py: `${16 * scaleFactor}px`,
                fontSize: `${16 * scaleFactor}px`,
                fontWeight: 600,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #1976d2, #00c853)',
                boxShadow: '0 8px 24px rgba(25, 118, 210, 0.3)',
                mt: 3,
                mb: 2,
                textTransform: 'none',
                letterSpacing: '0.5px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #1565c0, #00a047)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 32px rgba(25, 118, 210, 0.4)',
                },
                '&:active': {
                  transform: 'translateY(0px)',
                },
                '&:disabled': { 
                  background: 'linear-gradient(135deg, #bdbdbd, #9e9e9e)',
                  transform: 'none',
                  boxShadow: 'none'
                }
              }}
            >
              {isLoading ? 'جاري تسجيل الدخول...' : isNavigating ? 'جاري الانتقال...' : 'تسجيل الدخول'}
            </Button>

            {/* Sign Up Link */}
            <Fade in={true} timeout={1200}>
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography sx={{ 
                  fontSize: `${14 * scaleFactor}px`, 
                  color: 'text.secondary',
                  mb: 1
                }}>
                  ليس لديك حساب؟
                </Typography>
                <Link 
                  to="/signup" 
                  style={{ 
                    color: '#1976d2', 
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: `${15 * scaleFactor}px`,
                    transition: 'all 0.2s ease',
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    background: 'rgba(25, 118, 210, 0.1)',
                    border: '1px solid rgba(25, 118, 210, 0.2)',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(25, 118, 210, 0.2)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(25, 118, 210, 0.1)';
                    e.target.style.transform = 'translateY(0px)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  إنشاء حساب جديد
                </Link>
              </Box>
            </Fade>
          </Paper>
        </Container>
      </Slide>
    </Box>
  );
}

export default LoginPage;
