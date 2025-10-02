import React, { useState } from 'react';
import {
  Button, TextField, Typography, Container, Paper, Box,
  Alert, CircularProgress, Link
} from '@mui/material';
import { Email as EmailIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/FirebaseService';
import { useNavigate } from 'react-router-dom';
import useErrorHandler from '../../hooks/useErrorHandler';
import './ForgotPassword.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const { error, isLoading, handleError, clearError, executeWithErrorHandling } = useErrorHandler();
  
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleForgotPassword = async () => {
    clearError();
    
    if (!email.trim()) {
      handleError(new Error('يرجى إدخال البريد الإلكتروني'));
      return;
    }

    const result = await executeWithErrorHandling(async () => {
      await sendPasswordResetEmail(auth, email.trim());
      setIsEmailSent(true);
    });

    if (result.success) {
      // Success handled above
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleForgotPassword();
    }
  };

  return (
    <Box className="forgot-password-container">
      {/* Instagram Icon */}
      <Box
        sx={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1000,
        }}
      >
        <Button
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
            minWidth: 'auto',
            padding: 0,
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,1)',
              transform: 'scale(1.1)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
            }
          }}
        >
          <EmailIcon sx={{ 
            fontSize: 30, 
            color: '#E4405F',
            transition: 'all 0.3s ease'
          }} />
        </Button>
      </Box>

      <Container maxWidth="sm" className="forgot-password-form-container">
        <Paper elevation={3} className="forgot-password-form-paper">
          {/* Back Button */}
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/login')}
              sx={{ color: '#1976d2' }}
            >
              العودة لتسجيل الدخول
            </Button>
          </Box>

          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1976d2, #00c853)',
              mb: 2,
              boxShadow: '0 6px 24px rgba(25, 118, 210, 0.3)',
            }}>
              <EmailIcon sx={{ fontSize: 35, color: 'white' }} />
            </Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1976d2, #00c853)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}>
              إعادة تعيين كلمة المرور
            </Typography>
            <Typography variant="body1" color="text.secondary">
              أدخل بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور
            </Typography>
          </Box>

          {/* Success Message */}
          {isEmailSent && (
            <Alert severity="success" sx={{ mb: 3 }}>
              تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Email Input */}
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isEmailSent}
            className="forgot-password-text-field"
            InputProps={{
              endAdornment: (
                <EmailIcon sx={{ color: 'action.active', mr: 1 }} />
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Submit Button */}
          <Button
            fullWidth
            variant="contained"
            onClick={handleForgotPassword}
            disabled={isLoading || isEmailSent}
            className="forgot-password-button"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isLoading ? 'جاري الإرسال...' : isEmailSent ? 'تم الإرسال' : 'إرسال رابط إعادة التعيين'}
          </Button>

          {/* Login Link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              تذكرت كلمة المرور؟{' '}
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
                sx={{ 
                  color: '#1976d2',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                تسجيل الدخول
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default ForgotPassword;
