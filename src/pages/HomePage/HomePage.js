// HomePage.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Container, Typography, Button,
  Box, Stack, Collapse, Card, CardContent,
  IconButton, Paper
} from '@mui/material';
import { Instagram, Payment, EventAvailable } from '@mui/icons-material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, collection, query, where, getDocs
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

  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState(''); // 'student' | 'teacher'
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
        setUserId(user.uid);
        try {
          const udoc = await getDoc(doc(db, 'users', user.uid));
          setUserRole(udoc.exists() ? (udoc.data().role || '') : '');
        } catch (e) {
          console.error('Failed to read user role:', e);
        }
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [navigate]);

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
                <Button size="small" variant="outlined" onClick={() => navigate('/me#settings')}>
                  {t('اعدادات', 'הגדרות')}
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
                      'اختر يوماً وساعة متاحة من الجدول (المحجوز لا يظهر) — بياناتك تُؤخذ من حسابك.',
                      'בחרו יום ושעה פנויה מהלוח (תפוס לא מוצג) — הפרטים נלקחים מהחשבון.'
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


