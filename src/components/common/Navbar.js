import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Tooltip, Badge, Chip, keyframes } from '@mui/material';
import { MenuBook, EventNote, AutoAwesome } from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import StudentExamsDialog from './StudentExamsDialog';
import ExamsService from '../../services/ExamsService';
import WhatsNewService, { countUnseenCourses, getSeenAt } from '../../services/WhatsNewService';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { isOwnerAdminEmail } from '../../constants/admin';
import MsEducationIcon from './MsEducationIcon';

const softPulse = keyframes`
  0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.18), 0 0 0 0 rgba(255,255,255,0.45); }
  50% { box-shadow: 0 6px 20px rgba(0,0,0,0.22), 0 0 0 8px rgba(255,255,255,0); }
`;

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('مستخدم');
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [upcomingExams, setUpcomingExams] = useState(0);
  const [examsOpen, setExamsOpen] = useState(false);
  const [courseUpdatesCount, setCourseUpdatesCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    let feedItems = [];
    let courseDocs = [];
    const recount = () => {
      const seenAt = getSeenAt();
      const feedCount = WhatsNewService.countUnseenFeed({ items: feedItems }, seenAt);
      const courseCount = countUnseenCourses(courseDocs, seenAt);
      setCourseUpdatesCount(Math.max(feedCount, courseCount));
    };

    const unsubFeed = onSnapshot(
      doc(db, 'site_settings', 'whats_new'),
      (snap) => {
        feedItems = snap.exists() && Array.isArray(snap.data()?.items) ? snap.data().items : [];
        recount();
      },
      () => recount()
    );

    let unsubCourses = () => {};
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubCourses();
      unsubCourses = () => {};
      if (!user) {
        courseDocs = [];
        recount();
        return;
      }
      unsubCourses = onSnapshot(
        collection(db, 'courses'),
        (snap) => {
          courseDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          recount();
        },
        () => {}
      );
    });

    const onSeen = () => recount();
    window.addEventListener('ms-whats-new-seen', onSeen);
    recount();
    return () => {
      unsubFeed();
      unsubAuth();
      unsubCourses();
      window.removeEventListener('ms-whats-new-seen', onSeen);
    };
  }, [location.pathname]);

  useEffect(() => {
    let unsubExams = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubExams();
      unsubExams = () => {};
      if (user) {
        setIsLoggedIn(true);
        setUserId(user.uid);
        setUserEmail(user.email || '');
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const u = snap.data();
          setUserName(`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'مستخدم');
          setRole(u.role || '');
          setUserEmail(u.email || user.email || '');
          if (u.role === 'student') {
            unsubExams = ExamsService.listenStudentExams(user.uid, (list) => {
              const count = list.filter((e) => {
                const days = ExamsService.daysUntil(e.examDate);
                return days !== null && days >= 0;
              }).length;
              setUpcomingExams(count);
            });
          } else {
            setUpcomingExams(0);
          }
        } else {
          setUserName('مستخدم');
          setRole('');
          setUpcomingExams(0);
        }
      } else {
        setIsLoggedIn(false);
        setUserName('');
        setRole('');
        setUserId('');
        setUserEmail('');
        setUpcomingExams(0);
      }
    });
    return () => {
      unsubscribe();
      unsubExams();
    };
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
    <>
      <AppBar
        position="sticky"
        sx={{
          direction: 'rtl',
          backgroundImage: 'linear-gradient(100deg, #0b3d5c 0%, #1a6bb5 48%, #1a9b8e 100%)',
          boxShadow: '0 8px 28px rgba(11, 61, 92, 0.28)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
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
          {/* Right side (RTL): exams circle + nav links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              component={Link}
              to="/"
              aria-label="MS Education"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <MsEducationIcon size={42} />
              <Box sx={{ lineHeight: 1.05, textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
                <Typography sx={{ fontWeight: 900, fontSize: '0.95rem', color: '#fff' }}>
                  MS Education
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'rgba(255,255,255,0.88)' }}>
                  معهد المعرفة
                </Typography>
              </Box>
            </Box>
            {/* Student exams data button — clear label + circle icon */}
            {isLoggedIn && role === 'student' && (
              <Tooltip
                arrow
                title={t(
                  'بيانات الامتحانات: أضف اسم الامتحان وتاريخه — يظهر للمدرّس ونذكّرك قبل الموعد',
                  'נתוני מבחנים: הוסיפו שם מבחן ותאריך — המורה רואה, ונזכיר לפני המועד'
                )}
              >
                <Button
                  onClick={() => setExamsOpen(true)}
                  aria-label={t('بيانات الامتحانات', 'נתוני מבחנים')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pl: 0.75,
                    pr: 1.5,
                    py: 0.6,
                    minWidth: 0,
                    borderRadius: 999,
                    bgcolor: 'rgba(255,255,255,0.97)',
                    color: '#0d47a1',
                    textTransform: 'none',
                    fontWeight: 800,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    animation: `${softPulse} 2.4s ease-in-out infinite`,
                    border: '2px solid rgba(255,255,255,0.9)',
                    transition: 'transform 0.2s ease, background 0.2s ease',
                    '&:hover': {
                      bgcolor: '#fff',
                      transform: 'scale(1.04)',
                      animation: 'none',
                    },
                  }}
                >
                  <Badge
                    badgeContent={upcomingExams || null}
                    color="error"
                    overlap="circular"
                    sx={{
                      '& .MuiBadge-badge': { fontWeight: 800, fontSize: '0.7rem' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'linear-gradient(145deg, #1565c0, #0d47a1)',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <MenuBook sx={{ fontSize: 22 }} />
                    </Box>
                  </Badge>
                  <Box sx={{ textAlign: 'right', lineHeight: 1.15 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.72rem', sm: '0.82rem' }, color: '#0d47a1' }}>
                      {t('امتحاناتي', 'המבחנים שלי')}
                    </Typography>
                    <Typography sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' }, color: 'rgba(13,71,161,0.75)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                      <EventNote sx={{ fontSize: 12 }} />
                      {t('بيانات · اسم + تاريخ', 'נתונים · שם + תאריך')}
                    </Typography>
                  </Box>
                </Button>
              </Tooltip>
            )}

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
              {t('الرزمات', 'חבילות')}
            </Button>

            <Badge
              color="error"
              badgeContent={
                courseUpdatesCount > 0
                  ? (courseUpdatesCount > 9 ? '9+' : courseUpdatesCount)
                  : 0
              }
              overlap="circular"
              sx={{
                '& .MuiBadge-badge': {
                  fontWeight: 900,
                  fontSize: '0.65rem',
                  minWidth: 18,
                  height: 18,
                  top: 4,
                  insetInlineEnd: 2,
                },
              }}
            >
              <Button
                color="inherit"
                component={Link}
                to="/courses"
                sx={{
                  px: courseUpdatesCount > 0 ? 1.5 : 2.25,
                  py: 0.75,
                  gap: 0.75,
                  bgcolor: courseUpdatesCount > 0
                    ? 'rgba(255, 193, 7, 0.42)'
                    : 'rgba(255,255,255,0.22)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.30)' },
                  fontWeight: 900,
                  animation: courseUpdatesCount > 0 ? `${softPulse} 2.2s ease-in-out infinite` : 'none',
                }}
              >
                {t('الدورات', 'קורסים')}
                {courseUpdatesCount > 0 && (
                  <Chip
                    size="small"
                    icon={<AutoAwesome sx={{ fontSize: '14px !important', color: '#fff !important' }} />}
                    label={t('جديد', 'חדש')}
                    sx={{
                      height: 22,
                      fontWeight: 900,
                      fontSize: '0.72rem',
                      bgcolor: '#c62828',
                      color: '#fff',
                      '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
                    }}
                  />
                )}
              </Button>
            </Badge>

            {isLoggedIn && (
              <Button
                color="inherit"
                component={Link}
                to="/my-bookings"
                sx={{ px: 2, bgcolor: 'rgba(255,255,255,0.14)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, fontWeight: 800 }}
              >
                {t('مواعيدي', 'התורים שלי')}
              </Button>
            )}

            <Button
              color="inherit"
              component={Link}
              to="/contact"
              sx={{ px: 2, bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
            >
              {t('اتصل بنا', 'צור קשר')}
            </Button>

            {isLoggedIn ? (
              <Button color="inherit" onClick={handleLogout} sx={{ px: 2 }}>
                {t('تسجيل الخروج', 'התנתקות')}
              </Button>
            ) : (
              <Button color="inherit" component={Link} to="/login" sx={{ px: 2 }}>
                {t('تسجيل الدخول', 'התחברות')}
              </Button>
            )}

            <Button
              color="inherit"
              component={Link}
              to="/about"
              sx={{ px: 2, bgcolor: 'rgba(255,255,255,0.10)', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
            >
              {t('من نحن؟', 'מי אנחנו?')}
            </Button>

            {isLoggedIn && role === 'student' && (
              <>
                <Button color="inherit" component={Link} to="/me" sx={{ fontWeight: 800 }}>
                  {t('حسابي', 'החשבון שלי')}
                </Button>
                <Button color="inherit" component={Link} to="/me#settings" sx={{ fontWeight: 800 }}>
                  {t('اعدادات', 'הגדרות')}
                </Button>
              </>
            )}

            {isLoggedIn && (role === 'teacher' || isOwnerAdminEmail(userEmail)) && (
              <>
                {role === 'teacher' && (
                  <>
                    <Button color="inherit" component={Link} to="/teacher-approvals" sx={{ fontWeight: 800 }}>
                      {t('طلبات المعلمين', 'בקשות מורים')}
                    </Button>
                    <Button color="inherit" component={Link} to="/teacher" sx={{ fontWeight: 800 }}>
                      {t('لوحة المدرّس', 'לוח מורה')}
                    </Button>
                  </>
                )}
                <Button color="inherit" component={Link} to="/booking-manage" sx={{ fontWeight: 800 }}>
                  {t('إدارة الحجوزات', 'ניהול הזמנות')}
                </Button>
              </>
            )}

            <Button color="inherit" component={Link} to="/" sx={{ px: 2 }}>
              {t('الصفحة الرئيسية', 'דף הבית')}
            </Button>
          </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <LanguageToggle />
            {isLoggedIn && (
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 800, mr: 1, letterSpacing: 0.2 }}
              >
                👋 {t('مرحباً', 'שלום')} {userName}
              </Typography>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <StudentExamsDialog
        open={examsOpen}
        onClose={() => setExamsOpen(false)}
        studentId={userId}
        studentEmail={userEmail}
        studentName={userName}
      />
    </>
  );
}

export default Navbar;
