import React, { useState, useEffect, useCallback } from 'react';
import {
  Button, TextField, Typography, Container, Paper, Box,
  Alert, Chip,
  InputAdornment, IconButton, Fade, Slide, CircularProgress
} from '@mui/material';
import { 
  Visibility, VisibilityOff, PersonAdd as SignUpIcon, 
  School as SchoolIcon, Close as CloseIcon, Email as EmailIcon,
  Person as PersonIcon, Phone as PhoneIcon, Instagram
} from '@mui/icons-material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../services/FirebaseService';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import NotificationService from '../../services/NotificationService';
import { AuthError, ValidationError } from '../../components/common/ErrorDisplay';
import useErrorHandler from '../../hooks/useErrorHandler';
import './SignUpPage.css';

function SignUpPage() {
  const navigate = useNavigate();
  const { error, isLoading, handleError, clearError, executeWithErrorHandling } = useErrorHandler();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('student');
  const [success, setSuccess] = useState('');
  const [formWidth, setFormWidth] = useState(480);
  const [showSignUpBox, setShowSignUpBox] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const MIN_FORM = 320;
  const MAX_FORM = 900;

  const computeSizeFromImage = useCallback(() => {
    // Better sizing for signup form with more fields
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const baseWidth = Math.min(vw * 0.35, vh * 0.55);
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


  const validateForm = () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      handleError({ code: 'required', message: 'رجاءً املأ كل الحقول المطلوبة.' }, 'validation');
      return false;
    }
    
    if (password.length < 6) {
      handleError({ code: 'password', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' }, 'validation');
      return false;
    }
    
    if (password !== confirmPassword) {
      handleError({ code: 'password-mismatch', message: 'كلمات المرور غير متطابقة.' }, 'validation');
      return false;
    }
    
    if (role === 'teacher' && !phoneNumber) {
      handleError({ code: 'required', message: 'رقم الهاتف مطلوب للمعلمين.' }, 'validation');
      return false;
    }
    
    return true;
  };

  const handleSignUp = async () => {
    clearError();
    setSuccess('');
    
    if (isLoading) return; // Prevent multiple submissions
    
    if (!validateForm()) {
      return;
    }
    
    const result = await executeWithErrorHandling(async () => {
      // Create user account
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Prepare user data
      const userData = {
        firstName,
        lastName,
        phoneNumber,
        email: user.email,
        role: role === 'teacher' ? 'pending' : 'student', // Teachers need approval
        createdAt: new Date(),
        status: role === 'teacher' ? 'pending_approval' : 'active'
      };

      // Save user data
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });

      // If teacher, create approval request
      if (role === 'teacher') {
        const approvalData = {
          userId: user.uid,
          firstName,
          lastName,
          email: user.email,
          phoneNumber,
          requestedAt: serverTimestamp(),
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          notes: ''
        };

        await addDoc(collection(db, 'teacher_approvals'), approvalData);

        // Send notification to admin about new teacher request
        try {
          await NotificationService.sendAdminNotification({
            firstName,
            lastName,
            email: user.email,
            phoneNumber
          });
        } catch (notificationError) {
          console.error('Failed to send admin notification:', notificationError);
          // Don't fail the signup if notification fails
        }

        setSuccess('تم إنشاء حسابك بنجاح! طلبك لتصبح معلماً قيد المراجعة. ستحصل على إشعار عند الموافقة.');
      } else {
        setSuccess('تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.');
      }

      // Clear form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhoneNumber('');
      setRole('student');

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

      return { success: true };
    }, 'auth');

    if (result?.success) {
      // Success handled above
    }
  };

  const scaleFactor = Math.max(0.85, Math.min(1.15, formWidth / 480));

  return (
    <Box
      className={`signup-container ${showSignUpBox ? 'show-signup-box' : ''}`}
      onClick={() => {
        if (!showSignUpBox) {
          setShowSignUpBox(true);
        }
      }}
    >
      {/* Logo in top-left */}
      <Box className="signup-logo">
        <SchoolIcon className="signup-logo-icon" />
        <Typography className="signup-logo-title">
          المعرفة
        </Typography>
        <Typography className="signup-logo-subtitle">
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
      {!showSignUpBox && (
        <Fade in={true} timeout={1000}>
          <Box className="signup-instruction-box">
            <Box className="signup-instruction-content">
              <SignUpIcon className="signup-instruction-icon" />
              <Typography className="signup-instruction-text">
                اضغط هنا لإنشاء حساب جديد
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}

      <Slide direction="up" in={showSignUpBox} timeout={800}>
        <Container
          disableGutters
          className="signup-form-container"
          style={{ width: `${formWidth}px` }}
        >
        <Paper 
          elevation={24}
          className="signup-form-paper"
          style={{ padding: `${24 * scaleFactor}px` }}
        >
          {/* Close Button */}
          <IconButton
            onClick={() => setShowSignUpBox(false)}
            className="signup-close-button"
          >
            <CloseIcon sx={{ fontSize: 20, color: '#666' }} />
          </IconButton>

          {/* Header Section */}
          <Fade in={true} timeout={1000}>
            <Box className="signup-header">
              <Box className="signup-header-icon-container">
                <SignUpIcon className="signup-header-icon" />
              </Box>
              <Typography className="signup-header-title">
                إنشاء حساب جديد
              </Typography>
              <Typography className="signup-header-subtitle">
                انضم إلى منصة المعرفة التعليمية
              </Typography>
            </Box>
          </Fade>

          {error && (
            <Box sx={{ mb: 2 }}>
              {error.category === 'validation' ? (
                <ValidationError
                  error={error}
                  onDismiss={clearError}
                  actions={[
                    {
                      label: 'تسجيل الدخول',
                      onClick: () => navigate('/login'),
                      variant: 'outlined',
                      color: 'primary'
                    }
                  ]}
                />
              ) : (
                <AuthError
                  error={error}
                  onDismiss={clearError}
                  actions={[
                    {
                      label: 'تسجيل الدخول',
                      onClick: () => navigate('/login'),
                      variant: 'outlined',
                      color: 'primary'
                    }
                  ]}
                />
              )}
            </Box>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2, fontSize: `${14 * scaleFactor}px` }}>
              {success}
            </Alert>
          )}

          {/* Form Fields */}
          <Box className="signup-form-fields">
            <TextField
              label="الاسم الأول"
              fullWidth
              margin="normal"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="signup-text-field"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <PersonIcon className="signup-person-icon" />
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              label="الاسم الأخير"
              fullWidth
              margin="normal"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="signup-text-field"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <PersonIcon className="signup-person-icon" />
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              label="البريد الإلكتروني"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="signup-text-field"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <EmailIcon className="signup-email-icon" />
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
              className="signup-text-field"
              helperText="يجب أن تكون 6 أحرف على الأقل"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      className="signup-password-icon"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              label="تأكيد كلمة المرور"
              type={showConfirmPassword ? 'text' : 'password'}
              fullWidth
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="signup-text-field"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      className="signup-password-icon"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            
            <TextField
              label="رقم الهاتف"
              type="tel"
              fullWidth
              margin="normal"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="signup-text-field"
              helperText={role === 'teacher' ? 'مطلوب للمعلمين' : 'اختياري'}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <PhoneIcon className="signup-person-icon" />
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          {/* Role Selection */}
          <Box className="signup-role-container">
            <Typography className="signup-role-label">نوع الحساب</Typography>
            <Box className="signup-role-buttons">
              <Button
                className={`signup-role-button ${role === 'student' ? 'selected' : ''}`}
                onClick={() => setRole('student')}
              >
                طالب
              </Button>
              <Button
                className={`signup-role-button ${role === 'teacher' ? 'selected' : ''}`}
                onClick={() => setRole('teacher')}
              >
                معلم
                <Chip 
                  label="يتطلب موافقة" 
                  size="small" 
                  color="warning" 
                  sx={{ ml: 1, fontSize: '10px' }}
                />
              </Button>
            </Box>
          </Box>

          {role === 'teacher' && (
            <Alert severity="info" sx={{ mt: 2, fontSize: `${13 * scaleFactor}px` }}>
              <strong>ملاحظة:</strong> طلبات المعلمين تحتاج موافقة من الإدارة. ستحصل على إشعار عند الموافقة على طلبك.
            </Alert>
          )}

          {/* Sign Up Button */}
          <Button
            variant="contained"
            fullWidth
            onClick={handleSignUp}
            disabled={isLoading}
            className="signup-button"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SignUpIcon />}
          >
            {isLoading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
          </Button>

          {/* Login Link */}
          <Box className="signup-login-container">
            <Typography className="signup-login-text">
              لديك حساب بالفعل؟
            </Typography>
            <Link 
              to="/login" 
              className="signup-login-link"
            >
              تسجيل الدخول
            </Link>
          </Box>
        </Paper>
        </Container>
      </Slide>
    </Box>
  );
}

export default SignUpPage;
