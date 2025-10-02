// HomePage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, Typography, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Chip, Snackbar, Alert, Collapse, Card, CardContent,
  LinearProgress, IconButton
} from '@mui/material';
import { Instagram } from '@mui/icons-material';
import GoogleCalendar from '../../components/GoogleCalendar';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, collection, query, where, onSnapshot, getDocs
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import emailjs from 'emailjs-com';
import StudentOpinions from '../../components/common/StudentOpinions';
import AboutTypography from '../../components/common/AboutTypography';
import './HomePage.css';

function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [paymentImage, setPaymentImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [studentEmail, setStudentEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState(''); // 'student' | 'teacher'

  const [appointment, setAppointment] = useState(null); // {name, email, date, time}
  const [snackOpen, setSnackOpen] = useState(false);

  // Student bundle/purchases (live)
  const [purchases, setPurchases] = useState([]);
  const [studentCourses, setStudentCourses] = useState([]);

  // Calendar visibility
  const [showCalendar, setShowCalendar] = useState(false);

  // Opinions visibility (controlled by "تعرف أكثر")
  const [showInfo, setShowInfo] = useState(false);

  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const infoRef = useRef(null);

  // ---------- Auth gate + role ----------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        setStudentEmail(user.email || '');
        setUserId(user.uid);
        try {
          const udoc = await getDoc(doc(db, 'users', user.uid));
          const role = udoc.exists() ? (udoc.data().role || '') : '';
          setUserRole(role);
        } catch (e) {
          console.error('Failed to read user role:', e);
        }
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [navigate]);

  // ---------- Live purchases for student ----------
  useEffect(() => {
    if (!userId || userRole !== 'student') return;

    // Listen by studentId
    const q1 = query(collection(db, 'purchases'), where('studentId', '==', userId));
    const unsub1 = onSnapshot(q1, (snap) => {
      setPurchases(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        snap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
        return Array.from(map.values());
      });
    });

    // Optional: also listen by studentEmail as a fallback for legacy docs
    const unsubs = [unsub1];
    if (studentEmail) {
      const q2 = query(collection(db, 'purchases'), where('studentEmail', '==', studentEmail));
      const unsub2 = onSnapshot(q2, (snap) => {
        setPurchases(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          snap.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
          return Array.from(map.values());
        });
      });
      unsubs.push(unsub2);
    }

    return () => unsubs.forEach(fn => fn && fn());
  }, [userId, studentEmail, userRole]);

  // -------- Student enrolled courses summary --------
  useEffect(() => {
    if (!userId || userRole !== 'student') return;
    (async () => {
      try {
        const q1 = query(collection(db, 'enrollments'), where('studentId', '==', userId), where('status', '==', 'active'));
        const es = await getDocs(q1);
        const courseIds = es.docs.map(d => d.data().courseId);
        if (!courseIds.length) { setStudentCourses([]); return; }
        const cs = await Promise.all(courseIds.map(async (cid) => {
          const cdoc = await getDoc(doc(db, 'courses', cid));
          return cdoc.exists() ? { id: cdoc.id, ...cdoc.data() } : null;
        }));
        setStudentCourses(cs.filter(Boolean));
      } catch (e) {
        console.error('Failed to load student courses', e);
      }
    })();
  }, [userId, userRole]);

  // ---------- Auto-scroll when sections open ----------
  useEffect(() => {
    if (showCalendar) {
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showCalendar]);

  useEffect(() => {
    if (showInfo) {
      infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showInfo]);

  // ---------- Calendar → open dialog + (optional) email ----------
  const handleAppointmentSelect = useCallback((slot) => {
    const picked = {
      name: 'الطالب',
      email: studentEmail,
      date: slot?.date || '10 مارس 2025',
      time: slot?.time || '5:00 مساءً',
    };
    setAppointment(picked);
    setShowPaymentDialog(true);

    // If you prefer sending the email only after confirming payment,
    // move this call into handleConfirmPayment instead.
    sendEmailConfirmation(picked);
  }, [studentEmail]);

  // ---------- EmailJS ----------
  const sendEmailConfirmation = (appt) => {
    const params = {
      to_email: appt.email,
      name: appt.name,
      date: appt.date,
      time: appt.time,
    };
    emailjs
      .send(
        'YOUR_SERVICE_ID',
        'YOUR_TEMPLATE_ID',
        params,
        'YOUR_PUBLIC_KEY'
      )
      .then((res) => {
        // Email sent successfully
      })
      .catch((err) => console.error('Email failed', err));
  };

  // ---------- File selection + preview ----------
  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPaymentImage(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  // ---------- Confirm payment ----------
  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod) {
      alert('الرجاء اختيار طريقة الدفع');
      return;
    }
    if (!paymentImage) {
      alert('الرجاء تحميل صورة لإثبات الدفع');
      return;
    }
    // Payment confirmed
    console.log('Payment details:', {
      method: selectedPaymentMethod,
      fileName: paymentImage.name,
      appointment,
    });
    setSnackOpen(true);
    handleCloseDialog();
  };

  const handleCloseDialog = () => {
    setShowPaymentDialog(false);
    setSelectedPaymentMethod(null);
    setPaymentImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Hide calendar on double-click
  const handleCalendarDoubleClick = () => setShowCalendar(false);
  // Hide opinions on double-click
  const handleInfoDoubleClick = () => setShowInfo(false);

  // ---------- NORMALIZATION HELPERS (fix mixed field names / types) ----------
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizePurchase = useCallback((p) => ({
    id: p.id,
    title: p.bundleTitle ?? p.title ?? 'رزمة',
    purchased: toNum(p.hoursPurchased ?? p.hours ?? 0),
    used: toNum(p.hoursUsed ?? p.usedHours ?? 0),
    price: toNum(p.price ?? 0),
    category: p.category ?? 'tutoring',
    active: p.active !== false,
  }), []);

  // Debug raw vs normalized (optional; comment out if noisy)
  useEffect(() => {
    if (purchases.length) {
      // Debug: purchases data
    }
  }, [purchases, normalizePurchase]);

  // ---------- Derived student bundle info (using normalized values) ----------
  const normalized = purchases.map(normalizePurchase);
  const activeList = normalized.filter(p => p.active);
  const totalPurchased = activeList.reduce((s, p) => s + p.purchased, 0);
  const totalUsed      = activeList.reduce((s, p) => s + p.used, 0);
  const totalRemaining = Math.max(0, totalPurchased - totalUsed);

  if (isLoading) return (
    <Container sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        جاري التحميل...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        يرجى الانتظار بينما نقوم بتحميل بياناتك
      </Typography>
    </Container>
  );

  return (
    <div className="homepage">
      {/* Hero */}
      <Box className="hero" sx={{ position: 'relative' }}>
        {/* Instagram Icon - Top Left */}
        <Box
          sx={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 10,
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

        <Typography variant="h3" className="gradient-title" align="center">
          مرحباً بكم في منصة التعليم الخاصة بي
        </Typography>
        <Typography variant="subtitle1" align="center" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1 }}>
          احجز درسك الخاص مع أفضل المدرسين وبوقت يناسبك
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Button
            className="btn-primary"
            variant="contained"
            onClick={() => setShowCalendar(true)}
            onDoubleClick={() => setShowCalendar(false)}
          >
            احجز الآن
          </Button>
          <Button
            variant="outlined"
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)' }}
            onClick={() => setShowInfo(true)}
            onDoubleClick={() => setShowInfo(false)}
          >
            تعرّف أكثر
          </Button>
        </Stack>
      </Box>

      <Container className="homepage-container glass">
        {userRole === 'student' && (
          <Card elevation={3} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ direction: 'rtl' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                دوراتي
              </Typography>
              {studentCourses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  لا توجد دورات مفعّلة حالياً. يمكنك طلب الوصول من المدرّس أو زيارة صفحة <strong>الدورات</strong>.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {studentCourses.map(c => (
                    <Typography key={c.id} variant="body2">
                      • {c.title}
                    </Typography>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}
        {/* Student bundle status (live, normalized) */}
        {userRole === 'student' && (
          <Card 
            elevation={0} 
            sx={{ 
              mb: 3, 
              borderRadius: 3,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.95))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #1976d2, #00c853, #1976d2)',
                backgroundSize: '200% 100%',
                animation: 'gradientShift 3s ease-in-out infinite',
              }
            }}
          >
            <CardContent sx={{ direction: 'rtl', p: 3 }}>
              {/* Header with icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1976d2, #00c853)',
                  mr: 2,
                  boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)',
                  animation: 'pulseIcon 2s ease-in-out infinite',
                }}>
                  <Typography sx={{ fontSize: 24, color: 'white' }}>📊</Typography>
                </Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #1976d2, #00c853)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: 0.5
                  }}
                >
                  حالتي الحالية
                </Typography>
              </Box>

              {activeList.length === 0 ? (
                <Box sx={{
                  textAlign: 'center',
                  py: 3,
                  px: 2,
                  borderRadius: 2,
                  background: 'rgba(25, 118, 210, 0.05)',
                  border: '1px dashed rgba(25, 118, 210, 0.2)'
                }}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    لا توجد باقات مفعّلة حالياً
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    يمكنك اختيار باقة من صفحة <strong>الرزمات</strong>
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Summary Cards */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                    <Box sx={{
                      flex: 1,
                      minWidth: 120,
                      p: 2,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.1), rgba(0, 200, 83, 0.1))',
                      border: '1px solid rgba(25, 118, 210, 0.2)',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(25, 118, 210, 0.2)'
                      }
                    }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}>
                        {totalPurchased}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ساعات مشتراة
                      </Typography>
                    </Box>

                    <Box sx={{
                      flex: 1,
                      minWidth: 120,
                      p: 2,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 193, 7, 0.1))',
                      border: '1px solid rgba(255, 152, 0, 0.2)',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(255, 152, 0, 0.2)'
                      }
                    }}>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800', mb: 0.5 }}>
                        {totalUsed}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ساعات مُستخدمة
                      </Typography>
                    </Box>

                    <Box sx={{
                      flex: 1,
                      minWidth: 120,
                      p: 2,
                      borderRadius: 2,
                      background: totalRemaining > 0 
                        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(139, 195, 74, 0.1))'
                        : 'linear-gradient(135deg, rgba(158, 158, 158, 0.1), rgba(189, 189, 189, 0.1))',
                      border: totalRemaining > 0 
                        ? '1px solid rgba(76, 175, 80, 0.2)'
                        : '1px solid rgba(158, 158, 158, 0.2)',
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: totalRemaining > 0 
                          ? '0 8px 25px rgba(76, 175, 80, 0.2)'
                          : '0 8px 25px rgba(158, 158, 158, 0.2)'
                      }
                    }}>
                      <Typography variant="h4" sx={{ 
                        fontWeight: 700, 
                        color: totalRemaining > 0 ? '#4caf50' : '#9e9e9e', 
                        mb: 0.5 
                      }}>
                        {totalRemaining}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ساعات متبقية
                      </Typography>
                    </Box>
                  </Box>

                  {/* Progress Bar */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        التقدم الإجمالي
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round((totalUsed / totalPurchased) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(totalUsed / totalPurchased) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: 'linear-gradient(90deg, #1976d2, #00c853)',
                        }
                      }}
                    />
                  </Box>

                  {/* Bundle Details */}
                  <Box sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'rgba(25, 118, 210, 0.05)',
                    border: '1px solid rgba(25, 118, 210, 0.1)'
                  }}>
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 2,
                      color: '#1976d2',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      📋 تفاصيل الرزمات
                    </Typography>
                    <Stack spacing={1.5}>
                      {activeList.map(p => {
                        const rem = Math.max(0, p.purchased - p.used);
                        const progress = p.purchased > 0 ? (p.used / p.purchased) * 100 : 0;
                        return (
                          <Box key={p.id} sx={{
                            p: 2,
                            borderRadius: 2,
                            background: 'rgba(255,255,255,0.7)',
                            border: '1px solid rgba(25, 118, 210, 0.1)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: 'rgba(255,255,255,0.9)',
                              transform: 'translateX(-2px)',
                              boxShadow: '0 4px 12px rgba(25, 118, 210, 0.1)'
                            }
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {p.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {Math.round(progress)}% مكتمل
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                              <Typography variant="body2" sx={{ color: '#1976d2' }}>
                                📦 {p.purchased} ساعة
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#ff9800' }}>
                                ⏱️ {p.used} مستخدمة
                              </Typography>
                              <Typography variant="body2" sx={{ color: rem > 0 ? '#4caf50' : '#9e9e9e' }}>
                                ⏳ {rem} متبقية
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={progress}
                              sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 2,
                                  background: progress > 80 
                                    ? 'linear-gradient(90deg, #ff9800, #f57c00)'
                                    : 'linear-gradient(90deg, #1976d2, #00c853)',
                                }
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calendar (shown only after clicking "احجز الآن") */}
        <Collapse in={showCalendar} timeout={400}>
          <Box
            ref={calendarRef}
            className="calendar-section"
            sx={{ mb: 3 }}
            onDoubleClick={handleCalendarDoubleClick}
          >
            <Typography variant="h5" sx={{ mb: 2, textAlign: 'right', direction: 'rtl', fontWeight: 'bold' }}>
              المواعيد المتاحة
            </Typography>
            {showCalendar && <GoogleCalendar onSelect={handleAppointmentSelect} />}
            <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'left', opacity: 0.7 }}>
              ✨ انقر نقراً مزدوجاً لإخفاء التقويم
            </Typography>
          </Box>
        </Collapse>

        {/* OPINIONS + FEATURES — controlled by "تعرف أكثر" button */}
        <Collapse in={showInfo} timeout={400}>
          <Box
            ref={infoRef}
            className="opinions-section"
            onDoubleClick={handleInfoDoubleClick}
          >
            {/* Intro */}
            <Typography variant="h5" sx={{ textAlign: 'right', direction: 'rtl', fontWeight: 'bold', mb: 1.5 }}>
              ماذا يقول طلابنا؟
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'right', direction: 'rtl', mb: 2 }}>
              آراء الطلبة مهمة بالنسبة لنا—نستخدمها لتحسين التجربة التعليمية باستمرار.
            </Typography>

            {/* Opinions carousel/list */}
            <StudentOpinions />

            {/* Features grid */}
            <AboutTypography />

            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, opacity: 0.7, textAlign: 'left' }}>
              ✨ انقر نقراً مزدوجاً لإخفاء هذه المنطقة
            </Typography>
          </Box>
        </Collapse>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
          <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>
            تأكيد الدفع والحجز
          </DialogTitle>
          <DialogContent>
            {appointment && (
              <Typography variant="body2" sx={{ textAlign: 'right', direction: 'rtl', mb: 1 }}>
                الموعد المختار: <strong>{appointment.date}</strong> الساعة <strong>{appointment.time}</strong>
              </Typography>
            )}

            <Typography variant="body1" sx={{ textAlign: 'right', direction: 'rtl' }}>
              لإكمال الحجز, يرجى دفع <strong>₪33</strong> باستخدام إحدى الطرق التالية:
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip
                label="الدفع عن طريق Bit"
                color={selectedPaymentMethod === 'bit' ? 'primary' : 'default'}
                variant={selectedPaymentMethod === 'bit' ? 'filled' : 'outlined'}
                onClick={() => setSelectedPaymentMethod('bit')}
                sx={{ width: '100%', py: 2, fontWeight: 'bold' }}
              />
              <Chip
                label="التحويل البنكي"
                color={selectedPaymentMethod === 'bank' ? 'primary' : 'default'}
                variant={selectedPaymentMethod === 'bank' ? 'filled' : 'outlined'}
                onClick={() => setSelectedPaymentMethod('bank')}
                sx={{ width: '100%', py: 2, fontWeight: 'bold' }}
              />
            </Stack>

            {(selectedPaymentMethod === 'bit' || selectedPaymentMethod === 'bank') && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ textAlign: 'right', direction: 'rtl', mb: 1 }}>
                  يرجى تحميل صورة لإثبات الدفع.
                </Typography>
                <label className="upload-area">
                  <input type="file" onChange={handleFileChange} hidden />
                  <span>انقر لتحميل الصورة</span>
                </label>
                {previewUrl && (
                  <Box sx={{ mt: 2 }}>
                    <img src={previewUrl} alt="proof" className="upload-preview" />
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                      {paymentImage?.name}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            <Typography variant="body2" sx={{ textAlign: 'right', direction: 'rtl', mt: 2, fontWeight: 'bold' }}>
              ملاحظة: هذا المبلغ <strong>غير قابل للاسترداد</strong> إذا قمت بالإلغاء خلال <strong>48 ساعة</strong> قبل الموعد.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="secondary">
              إلغاء
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirmPayment}
              disabled={!selectedPaymentMethod || !paymentImage}
            >
              تأكيد الدفع
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success snackbar */}
        <Snackbar
          open={snackOpen}
          autoHideDuration={3000}
          onClose={() => setSnackOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSnackOpen(false)} variant="filled">
            تم استلام تأكيد الدفع بنجاح!
          </Alert>
        </Snackbar>
      </Container>
    </div>
  );
}

export default HomePage;


