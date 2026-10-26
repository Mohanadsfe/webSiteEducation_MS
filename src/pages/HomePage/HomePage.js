// HomePage.jsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Container, Typography, Button,
  Box, Stack, Collapse, Card, CardContent,
  LinearProgress, IconButton, Paper
} from '@mui/material';
import { Instagram, Payment, EventAvailable } from '@mui/icons-material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, collection, query, where, onSnapshot, getDocs
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import StudentResultsGallery from '../../components/common/StudentResultsGallery';
import AboutTypography from '../../components/common/AboutTypography';
import HourBookingScheduler from '../../components/common/HourBookingScheduler';
import TrackChooser, { TrackBanner } from '../../components/common/TrackChooser';
import LanguageToggle from '../../components/common/LanguageToggle';
import useStudyTrack from '../../hooks/useStudyTrack';
import { matchesTrackCategory } from '../../constants/tracks';
import { useLanguage } from '../../context/LanguageContext';
import './HomePage.css';

function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  const [studentEmail, setStudentEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState(''); // 'student' | 'teacher'
  const [studentProfile, setStudentProfile] = useState({ name: '', phone: '' });

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
  const { track, trackConfig, setTrack, clearTrack, loading: trackLoading } = useStudyTrack();
  const { t } = useLanguage();

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
          if (udoc.exists()) {
            const data = udoc.data();
            setUserRole(data.role || '');
            setStudentProfile({
              name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              phone: data.phoneNumber || '',
            });
          } else {
            setUserRole('');
          }
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
  const activeList = normalized.filter((p) => {
    if (!p.active) return false;
    if (userRole === 'student' && track) return matchesTrackCategory(p.category, track);
    return true;
  });
  const totalPurchased = activeList.reduce((s, p) => s + p.purchased, 0);
  const totalUsed      = activeList.reduce((s, p) => s + p.used, 0);
  const totalRemaining = Math.max(0, totalPurchased - totalUsed);
  const filteredCourses = studentCourses.filter((c) =>
    userRole === 'student' && track ? matchesTrackCategory(c.category, track) : true
  );

  if (isLoading || trackLoading) return (
    <Container sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        جاري التحميل...
      </Typography>
      <Typography variant="body2" color="text.secondary">
        يرجى الانتظار بينما نقوم بتحميل بياناتك
      </Typography>
    </Container>
  );

  // Students must choose Academic vs Bagrut first
  if (userRole === 'student' && !track) {
    return (
      <div className="homepage">
        <TrackChooser onSelect={setTrack} />
      </div>
    );
  }

  return (
    <div className="homepage">
      {/* Hero */}
      <Box
        className="hero"
        sx={{
          position: 'relative',
          ...(trackConfig
            ? {
                backgroundImage: `linear-gradient(160deg, rgba(11,61,92,0.28) 0%, rgba(0,0,0,0.22) 40%, rgba(255,255,255,0.35) 100%), url(${trackConfig.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {}),
        }}
      >
        {/* Language: عربي / עברית — only one active */}
        <Box sx={{ position: 'absolute', top: { xs: 16, md: 24 }, right: { xs: 16, md: 24 }, zIndex: 10 }}>
          <LanguageToggle size="large" light={!!trackConfig} />
        </Box>

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
              width: 64,
              height: 64,
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
              fontSize: 32, 
              color: '#E4405F',
              transition: 'all 0.3s ease'
            }} />
          </IconButton>
        </Box>

        <Typography
          className="gradient-title"
          align="center"
          sx={{
            mt: { xs: 7, md: 3 },
            ...(trackConfig
              ? {
                  color: '#fff',
                  WebkitTextFillColor: '#fff',
                  textShadow: '0 4px 22px rgba(0,0,0,0.45)',
                }
              : {
                  background: 'linear-gradient(90deg, #0b3d5c, #1a6bb5, #1a9b8e)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: 'none',
                }),
          }}
        >
          {trackConfig
            ? t(trackConfig.titleAr, trackConfig.titleHe)
            : t('مرحباً بكم في منصة التعليم الخاصة بي', 'ברוכים הבאים לפלטפורמת הלמידה')}
        </Typography>
        <Typography
          align="center"
          sx={{
            color: trackConfig ? 'rgba(255,255,255,0.95)' : '#5a6f82',
            textShadow: trackConfig ? '0 2px 12px rgba(0,0,0,0.35)' : 'none',
            mt: 2,
            mb: 1,
            fontSize: { xs: '1.1rem', md: '1.35rem' },
            fontWeight: 600,
            maxWidth: 720,
            lineHeight: 1.7,
            px: 2,
          }}
        >
          {trackConfig
            ? t(trackConfig.descriptionAr, trackConfig.descriptionHe)
            : t('احجز درسك الخاص مع أفضل المدرسين وبوقت يناسبك', 'הזמינו שיעור פרטי בזמן שמתאים לכם')}
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3.5 }} flexWrap="wrap" useFlexGap>
          <Button
            className="btn-primary"
            variant="contained"
            size="large"
            onClick={() => setShowCalendar(true)}
            onDoubleClick={() => setShowCalendar(false)}
          >
            {t('عرض الجدول / احجز الآن', 'לוח זמנים / הזמנה')}
          </Button>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#1a6bb5',
              color: '#fff',
              fontWeight: 900,
              borderRadius: 999,
              px: 3,
              py: 1.2,
              fontSize: '1.05rem',
              '&:hover': { bgcolor: '#155a9a', color: '#fff' },
            }}
            onClick={() => navigate('/bundles')}
          >
            {track === 'bagrut'
              ? t('رزمات בגרויות', 'חבילות בגרות')
              : t('رزمات أكاديمية', 'חבילות אקדמיות')}
          </Button>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#e8a317',
              color: '#fff',
              fontWeight: 900,
              borderRadius: 999,
              px: 3,
              py: 1.2,
              fontSize: '1.05rem',
              '&:hover': { bgcolor: '#d49412', color: '#fff' },
            }}
            onClick={() => {
              setShowInfo(true);
              setTimeout(() => infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
            }}
            onDoubleClick={() => setShowInfo(false)}
          >
            {t('نتائج الطلاب', 'תוצאות תלמידים')}
          </Button>
          <Button
            variant="contained"
            size="large"
            sx={{
              bgcolor: '#1a9b8e',
              color: '#fff',
              fontWeight: 800,
              borderRadius: 999,
              px: 3,
              py: 1.1,
              fontSize: '1.05rem',
              '&:hover': { bgcolor: '#15887c', color: '#fff' },
            }}
            onClick={() => setShowInfo(true)}
            onDoubleClick={() => setShowInfo(false)}
          >
            {t('تعرّف أكثر', 'למידע נוסף')}
          </Button>
        </Stack>
      </Box>

      <Container className="homepage-container glass">
        {userRole === 'student' && trackConfig && (
          <TrackBanner trackConfig={trackConfig} onChangeTrack={clearTrack} />
        )}

        {userRole === 'student' && (
          <Card elevation={3} sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ direction: 'rtl' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                {track === 'bagrut'
                  ? t('دوراتي — בגרויות / مدرسة', 'הקורסים שלי — בגרות / תיכון')
                  : t('دوراتي الأكاديمية', 'הקורסים האקדמיים שלי')}
              </Typography>
              {filteredCourses.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t(
                    'لا توجد دورات مفعّلة لهذا المسار. زر صفحة الدورات أو تواصل للدفع.',
                    'אין קורסים פעילים למסלול זה. עברו לדף הקורסים או פנו לתשלום.'
                  )}
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {filteredCourses.map(c => (
                    <Typography key={c.id} variant="body2">
                      • {c.title}
                    </Typography>
                  ))}
                </Stack>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button size="small" variant="outlined" onClick={() => navigate('/courses')}>
                  {t('الدورات', 'קורסים')}
                </Button>
                <Button size="small" variant="outlined" onClick={() => navigate('/me')}>
                  {t('حسابي', 'החשבון שלי')}
                </Button>
                {track === 'bagrut' && (
                  <Button size="small" variant="contained" color="error" onClick={() => navigate('/bundles')}>
                    {t('امتحاناتي / رزمات بجروت', 'מבחנים / חבילות בגרות')}
                  </Button>
                )}
              </Stack>
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
              {track === 'bagrut'
                ? t('جدول الدروس والتحضير للبجروت', 'לוח שיעורים והכנה לבגרות')
                : t('المواعيد المتاحة — مسار أكاديمي', 'תורים פנויים — מסלול אקדמי')}
            </Typography>

            <Paper
              elevation={0}
              sx={{
                mb: 2.5,
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                direction: 'rtl',
                textAlign: 'right',
                color: '#fff',
                background: 'linear-gradient(120deg, #0b3d5c 0%, #1a6bb5 45%, #1a9b8e 100%)',
                boxShadow: '0 14px 36px rgba(11, 61, 92, 0.28)',
                border: '2px solid rgba(255,255,255,0.35)',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    border: '2px solid rgba(255,255,255,0.55)',
                  }}
                >
                  <EventAvailable sx={{ fontSize: 28 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1.45 }}>
                    {t(
                      'اختر يوماً وساعة متاحة من الجدول (المحجوز لا يظهر) — بياناتك من حسابك ثم ادفع Visa أو واتساب.',
                      'בחרו יום ושעה פנויה מהלוח (תפוס לא מוצג) — הפרטים מהחשבון ואז Visa או וואטסאפ.'
                    )}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        bgcolor: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: 999,
                        px: 1.5,
                        py: 0.6,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      <Payment sx={{ fontSize: 18 }} />
                      Visa
                    </Box>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                        bgcolor: 'rgba(37,211,102,0.25)',
                        border: '1px solid rgba(255,255,255,0.45)',
                        borderRadius: 999,
                        px: 1.5,
                        py: 0.6,
                        fontWeight: 800,
                        fontSize: '0.85rem',
                      }}
                    >
                      واتساب المالك · וואטסאפ
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {showCalendar && <HourBookingScheduler />}
            <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'left', opacity: 0.7 }}>
              ✨ انقر نقراً مزدوجاً لإخفاء الجدول
            </Typography>
          </Box>
        </Collapse>

        {/* Student results images + features — controlled by "تعرف أكثر" */}
        <Collapse in={showInfo} timeout={400}>
          <Box
            ref={infoRef}
            className="opinions-section"
            onDoubleClick={handleInfoDoubleClick}
          >
            <StudentResultsGallery />

            <AboutTypography />

            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, opacity: 0.7, textAlign: 'left' }}>
              ✨ انقر نقراً مزدوجاً لإخفاء هذه المنطقة
            </Typography>
          </Box>
        </Collapse>

      </Container>
    </div>
  );
}

export default HomePage;


