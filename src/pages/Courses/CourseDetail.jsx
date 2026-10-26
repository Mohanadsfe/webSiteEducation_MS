import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Typography, Box, Button, Chip, Stack, TextField, Alert,
  Divider, LinearProgress
} from '@mui/material';
import {
  PlayArrow, Description, Lock, NavigateBefore, NavigateNext,
  CheckCircle, WhatsApp, ArrowBack
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import DriveVideoPlayer from '../../components/courses/DriveVideoPlayer';
import CoursesService from '../../services/CoursesService';
import EnrollmentsService from '../../services/EnrollmentsService';
import UsersService from '../../services/UsersService';
import PaymentMethodDialog from '../../components/common/PaymentMethodDialog';
import { isOwnerAdminEmail } from '../../constants/admin';
import CourseContentLicense from '../../components/courses/CourseContentLicense';
import CourseLicenseAgreementDialog from '../../components/courses/CourseLicenseAgreementDialog';

const OWNER_WHATSAPP = '972548010225';

function unlockKey(courseId, uid) {
  return `ms_course_unlock_${courseId}_${uid}`;
}

function lessonIsFree(index) {
  return index === 0;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [enrollment, setEnrollment] = useState(null);
  const [enrollmentStatus, setEnrollmentStatus] = useState('none');
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [purchaseNext, setPurchaseNext] = useState('');
  const [personalCode, setPersonalCode] = useState('');
  const [gateCode, setGateCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [showUnlockPanel, setShowUnlockPanel] = useState(false);
  const navigate = useNavigate();

  const isOwner = isOwnerAdminEmail(user?.email);
  /** Owners (and teachers) can watch all videos; only owners see manage buttons */
  const isAdmin = isOwner || role === 'teacher';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      if (!current) {
        navigate('/login');
        return;
      }
      setUser(current);
      const userData = await UsersService.getUser(current.uid);
      const r = userData?.role || '';
      setRole(r);
      const admin = r === 'teacher' || isOwnerAdminEmail(current.email);

      const courseData = await CoursesService.getCourse(courseId);
      if (!courseData) {
        navigate('/courses');
        return;
      }
      setCourse(courseData);

      // Full lessons if allowed; otherwise public catalog + free first preview on the course doc
      let lessonsData = [];
      try {
        lessonsData = await CoursesService.listLessonsForViewer(courseId, courseData);
      } catch (e) {
        console.error('listLessonsForViewer failed', e);
        lessonsData = [];
      }
      setLessons(lessonsData);

      if (admin) {
        setEnrollmentStatus('active');
        setUnlocked(true);
        if (lessonsData[0]) setSelectedLesson(lessonsData[0]);
      } else {
        try {
          const enr = await EnrollmentsService.getEnrollment(current.uid, courseId);
          setEnrollment(enr);
          const status = enr?.status || 'none';
          setEnrollmentStatus(status);

          const key = unlockKey(courseId, current.uid);
          const saved = localStorage.getItem(key);
          // Owner revoke clears server access — drop any local unlock cache
          if (status === 'active' && enr?.accessCode && saved === '1') {
            setUnlocked(true);
          } else {
            localStorage.removeItem(key);
            setUnlocked(false);
          }
        } catch {
          setEnrollmentStatus('none');
          setUnlocked(false);
        }

        // Free preview: auto-select first video for regular users
        if (lessonsData[0]) setSelectedLesson(lessonsData[0]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [courseId, navigate]);

  const selectedIndex = useMemo(() => {
    if (!selectedLesson) return -1;
    return lessons.findIndex((l) => l.id === selectedLesson.id);
  }, [lessons, selectedLesson]);

  const canWatchIndex = (index) => {
    if (isAdmin) return true;
    if (lessonIsFree(index)) return true;
    return enrollmentStatus === 'active' && Boolean(enrollment?.accessCode) && unlocked;
  };

  // Re-check enrollment so owner revoke takes effect without a full page reload
  useEffect(() => {
    if (!user?.uid || isAdmin) return undefined;
    let cancelled = false;
    const refreshAccess = async () => {
      try {
        const enr = await EnrollmentsService.getEnrollment(user.uid, courseId);
        if (cancelled) return;
        setEnrollment(enr);
        const status = enr?.status || 'none';
        setEnrollmentStatus(status);
        const key = unlockKey(courseId, user.uid);
        if (status !== 'active' || !enr?.accessCode) {
          localStorage.removeItem(key);
          setUnlocked(false);
        }
      } catch {
        /* ignore transient errors */
      }
    };
    refreshAccess();
    const onFocus = () => refreshAccess();
    window.addEventListener('focus', onFocus);
    const t = setInterval(refreshAccess, 15000);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      clearInterval(t);
    };
  }, [user?.uid, courseId, isAdmin]);

  // If access was revoked while watching a paid video, fall back to the free first lesson
  useEffect(() => {
    if (isAdmin || unlocked || enrollmentStatus === 'active') return;
    if (selectedIndex > 0 && lessons[0]) {
      setSelectedLesson(lessons[0]);
    }
  }, [unlocked, enrollmentStatus, isAdmin, selectedIndex, lessons]);

  const tryUnlock = async () => {
    setCodeError('');
    // Always re-fetch so a revoked code cannot unlock from stale UI state
    let live = enrollment;
    try {
      live = await EnrollmentsService.getEnrollment(user.uid, courseId);
      setEnrollment(live);
      setEnrollmentStatus(live?.status || 'none');
    } catch {
      /* use cached */
    }
    if (live?.status !== 'active' || !live?.accessCode) {
      localStorage.removeItem(unlockKey(courseId, user.uid));
      setUnlocked(false);
      setCodeError(
        live?.status === 'revoked'
          ? 'تم إلغاء وصولك من المالك — الكود لم يعد صالحاً.'
          : 'ليس لديك كود بعد — تواصل مع المالك بعد الدفع ليحصل لك على كود شخصي لهذه الدورة فقط.'
      );
      setShowUnlockPanel(true);
      return;
    }
    if (personalCode.trim().toUpperCase() !== String(live.accessCode).toUpperCase()) {
      setCodeError('الكود الشخصي غير صحيح');
      return;
    }
    if (course?.courseGateCode) {
      if (gateCode.trim() !== String(course.courseGateCode)) {
        setCodeError('كود الدورة السحابي غير صحيح');
        return;
      }
    }
    localStorage.setItem(unlockKey(courseId, user.uid), '1');
    setUnlocked(true);
    setShowUnlockPanel(false);
    setCodeError('');
    // Reload full lesson media now that enrollment allows reading lessons
    try {
      const full = await CoursesService.listLessons(courseId);
      if (full.length) {
        setLessons(full);
        const keep = selectedLesson
          ? full.find((l) => l.id === selectedLesson.id) || full[0]
          : full[0];
        if (keep) setSelectedLesson(keep);
      }
    } catch {
      /* keep catalog preview */
    }
  };

  const handleLessonClick = (lesson, index) => {
    if (canWatchIndex(index)) {
      setSelectedLesson(lesson);
      setShowUnlockPanel(false);
      return;
    }
    setShowUnlockPanel(true);
    setCodeError('');
  };

  const goPrev = () => {
    if (selectedIndex <= 0) return;
    const prev = lessons[selectedIndex - 1];
    if (canWatchIndex(selectedIndex - 1)) setSelectedLesson(prev);
  };

  const goNext = () => {
    if (selectedIndex < 0 || selectedIndex >= lessons.length - 1) return;
    const nextIdx = selectedIndex + 1;
    if (canWatchIndex(nextIdx)) {
      setSelectedLesson(lessons[nextIdx]);
    } else {
      setShowUnlockPanel(true);
    }
  };

  const requestPurchase = (next) => {
    setPurchaseNext(next);
    setLicenseOpen(true);
  };

  const continuePurchase = () => {
    const next = purchaseNext;
    setLicenseOpen(false);
    if (next === 'whatsapp') whatsappAskCode();
    if (next === 'pay') setPaymentOpen(true);
  };

  const whatsappAskCode = () => {
    const name = user?.displayName || user?.email || '';
    const text = encodeURIComponent(
      `مرحباً، أريد كود شخصي لفتح باقي فيديوهات الدورة:\n${course?.title || ''}\nاسمي / بريدي: ${name}`
    );
    window.open(`https://wa.me/${OWNER_WHATSAPP}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>جاري التحميل...</Typography>
      </Container>
    );
  }

  if (!course) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography align="center">الدورة غير موجودة</Typography>
      </Container>
    );
  }

  const progressPct =
    lessons.length > 0 && selectedIndex >= 0
      ? Math.round(((selectedIndex + 1) / lessons.length) * 100)
      : 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        direction: 'rtl',
        background:
          'radial-gradient(1200px 500px at 100% -10%, rgba(26,107,181,0.14), transparent 55%), radial-gradient(900px 420px at 0% 100%, rgba(14,165,233,0.1), transparent 50%), linear-gradient(180deg, #f7fbff 0%, #ffffff 45%)',
        pb: 6,
      }}
    >
      <Container maxWidth="xl" sx={{ pt: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap spacing={1}>
          <Button startIcon={<ArrowBack />} onClick={() => navigate('/courses')} sx={{ fontWeight: 800 }}>
            الدورات
          </Button>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {course.syllabusUrl && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<Description />}
                onClick={() => window.open(course.syllabusUrl, '_blank', 'noopener,noreferrer')}
              >
                المنهج
              </Button>
            )}
            {isOwner && (
              <>
                <Button size="small" variant="outlined" onClick={() => navigate(`/courses/${courseId}/lessons`)}>
                  إدارة الفيديوهات
                </Button>
                <Button size="small" variant="outlined" onClick={() => navigate(`/courses/${courseId}/enrollments`)}>
                  أكواد الطلاب
                </Button>
              </>
            )}
          </Stack>
        </Stack>

        {/* Course header */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '160px 1fr' },
            gap: 2,
            alignItems: 'center',
            mb: 3,
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(26,107,181,0.12)',
            boxShadow: '0 10px 30px rgba(15, 50, 90, 0.06)',
          }}
        >
          {course.thumbnailUrl ? (
            <Box
              component="img"
              src={course.thumbnailUrl}
              alt={course.title}
              sx={{
                width: '100%',
                height: { xs: 160, md: 110 },
                objectFit: 'cover',
                borderRadius: 2,
              }}
            />
          ) : (
            <Box
              sx={{
                height: { xs: 100, md: 110 },
                borderRadius: 2,
                bgcolor: 'rgba(26,107,181,0.1)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 900,
                color: 'primary.main',
              }}
            >
              MS
            </Box>
          )}
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              {course.title}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1.5, maxWidth: 720 }}>
              {course.description}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`${lessons.length} فيديو`} size="small" color="primary" variant="outlined" />
              <Chip label="الفيديو الأول مجاني" size="small" color="success" />
              {unlocked || isAdmin ? (
                <Chip icon={<CheckCircle />} label="الدورة مفتوحة لك" size="small" color="success" />
              ) : (
                <Chip icon={<Lock />} label="باقي الفيديوهات بكود شخصي" size="small" color="warning" />
              )}
            </Stack>
          </Box>
        </Box>

        {/* Unlock / request banner */}
        {!isAdmin && !unlocked && (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: 2.5,
              bgcolor: 'rgba(255,243,205,0.9)',
              border: '1px solid rgba(245,158,11,0.35)',
            }}
          >
            <Typography fontWeight={900} sx={{ mb: 0.5 }}>
              شاهد الفيديو الأول مجاناً — من الثاني تحتاج كوداً شخصياً
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              كل طالب يحصل على كود فريد لهذه الدورة فقط (لا يفتح دورات أخرى). اطلب الكود من المالك بعد الدفع.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="contained"
                color="success"
                startIcon={<WhatsApp />}
                onClick={() => requestPurchase('whatsapp')}
                sx={{ fontWeight: 800 }}
              >
                اطلب الكود من المالك
              </Button>
              <Button variant="outlined" onClick={() => requestPurchase('pay')} sx={{ fontWeight: 800 }}>
                طلب وصول / دفع
              </Button>
              <Button variant="text" onClick={() => setShowUnlockPanel(true)} sx={{ fontWeight: 800 }}>
                لدي كود — فتح الدورة
              </Button>
            </Stack>
          </Box>
        )}

        {(showUnlockPanel || (enrollmentStatus === 'active' && !unlocked && !isAdmin)) && !unlocked && !isAdmin && (
          <Box
            sx={{
              mb: 2.5,
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: '#fff',
              border: '2px solid',
              borderColor: 'primary.main',
              maxWidth: 480,
            }}
          >
            <Typography fontWeight={900} sx={{ mb: 1 }}>
              أدخل كودك الشخصي لهذه الدورة
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              بعد الإدخال الصحيح تُفتح كل فيديوهات هذه الدورة فقط.
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                label="الكود الشخصي"
                value={personalCode}
                onChange={(e) => setPersonalCode(e.target.value)}
                fullWidth
                inputProps={{ style: { letterSpacing: 3, fontWeight: 800 } }}
              />
              {course.courseGateCode ? (
                <TextField
                  label="كود الدورة السحابي (إن طلبه المالك)"
                  value={gateCode}
                  onChange={(e) => setGateCode(e.target.value)}
                  fullWidth
                />
              ) : null}
              {codeError && <Alert severity="error">{codeError}</Alert>}
              {enrollmentStatus !== 'active' && (
                <Alert severity="info">
                  لم يُفعَّل وصولك بعد. ادفع/تواصل مع المالك ليُنشئ لك كوداً فريداً ثم أدخله هنا.
                </Alert>
              )}
              <Button variant="contained" onClick={tryUnlock} sx={{ fontWeight: 900 }}>
                فتح باقي فيديوهات الدورة
              </Button>
            </Stack>
          </Box>
        )}

        {/* Watch layout: player + playlist */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 340px' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          <Box
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: '#0b1220',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 18px 50px rgba(11,18,32,0.25)',
            }}
          >
            <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: 'rgba(255,255,255,0.04)' }}>
              <Typography sx={{ color: '#fff', fontWeight: 900, mb: 0.25 }}>
                {selectedLesson
                  ? `${selectedIndex + 1}. ${selectedLesson.title}`
                  : 'اختر فيديو من القائمة'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
                {selectedIndex >= 0 ? `فيديو ${selectedIndex + 1} من ${lessons.length}` : course.title}
              </Typography>
              {lessons.length > 0 && (
                <LinearProgress
                  variant="determinate"
                  value={progressPct}
                  sx={{
                    mt: 1.25,
                    height: 6,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#38bdf8' },
                  }}
                />
              )}
            </Box>

            <Box sx={{ p: { xs: 1, md: 1.5 } }}>
              {selectedLesson && canWatchIndex(selectedIndex) ? (
                <DriveVideoPlayer
                  driveFileId={selectedLesson.driveFileId}
                  videoUrl={selectedLesson.videoUrl}
                  provider={selectedLesson.provider}
                  courseId={courseId}
                  lessonId={selectedLesson.id}
                />
              ) : selectedLesson && !canWatchIndex(selectedIndex) ? (
                <Box
                  sx={{
                    position: 'relative',
                    minHeight: { xs: 260, sm: 320 },
                    overflow: 'hidden',
                    borderRadius: 2,
                    color: '#fff',
                  }}
                >
                  {/* Lesson preview image fills the blue middle player box */}
                  {selectedLesson.thumbnailUrl ? (
                    <Box
                      component="img"
                      src={selectedLesson.thumbnailUrl}
                      alt={selectedLesson.title || ''}
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.55) saturate(1.05)',
                      }}
                    />
                  ) : null}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: selectedLesson.thumbnailUrl
                        ? 'linear-gradient(160deg, rgba(26,107,181,0.45), rgba(11,18,32,0.82))'
                        : 'linear-gradient(160deg, rgba(26,107,181,0.45), rgba(11,18,32,0.95))',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      minHeight: { xs: 260, sm: 320 },
                      display: 'grid',
                      placeItems: 'center',
                      textAlign: 'center',
                      px: 3,
                      py: 4,
                    }}
                  >
                    {selectedLesson.thumbnailUrl ? (
                      <Box
                        component="img"
                        src={selectedLesson.thumbnailUrl}
                        alt=""
                        sx={{
                          width: { xs: 160, sm: 220 },
                          height: { xs: 96, sm: 132 },
                          objectFit: 'cover',
                          borderRadius: 2,
                          mb: 1.5,
                          border: '2px solid rgba(255,255,255,0.35)',
                          boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
                        }}
                      />
                    ) : (
                      <Lock sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
                    )}
                    <Lock sx={{ fontSize: 28, mb: 0.75, opacity: 0.95 }} />
                    <Typography fontWeight={900} sx={{ mb: 0.5 }}>
                      هذا الفيديو مقفل
                    </Typography>
                    <Typography fontWeight={800} sx={{ mb: 0.75, opacity: 0.95 }}>
                      {selectedLesson.title}
                    </Typography>
                    {selectedLesson.learnHint ? (
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1.5, maxWidth: 420 }}>
                        ستتعلم هنا: {selectedLesson.learnHint}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1.5, maxWidth: 360 }}>
                        الفيديو الأول مجاني. لفتح الباقي اطلب كوداً شخصياً من المالك لهذه الدورة.
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                      <Button variant="contained" color="success" startIcon={<WhatsApp />} onClick={() => requestPurchase('whatsapp')}>
                        واتساب المالك
                      </Button>
                      <Button variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }} onClick={() => setShowUnlockPanel(true)}>
                        إدخال الكود
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.6)' }}>
                  لا توجد فيديوهات بعد
                </Box>
              )}
            </Box>

            {/* Prev / Next without leaving the page */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Button
                onClick={goNext}
                disabled={selectedIndex < 0 || selectedIndex >= lessons.length - 1}
                endIcon={<NavigateBefore />}
                sx={{ color: '#fff', fontWeight: 800 }}
              >
                التالي
              </Button>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                تنقّل بين الفيديوهات من هنا أو من القائمة
              </Typography>
              <Button
                onClick={goPrev}
                disabled={selectedIndex <= 0}
                startIcon={<NavigateNext />}
                sx={{ color: '#fff', fontWeight: 800 }}
              >
                السابق
              </Button>
            </Stack>
          </Box>

          {/* Playlist sidebar */}
          <Box
            sx={{
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(26,107,181,0.12)',
              boxShadow: '0 12px 28px rgba(15, 50, 90, 0.07)',
              overflow: 'hidden',
              position: { lg: 'sticky' },
              top: { lg: 16 },
              maxHeight: { lg: 'calc(100vh - 32px)' },
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ px: 2, py: 1.75 }}>
              <Typography fontWeight={900}>قائمة الفيديوهات</Typography>
              <Typography variant="caption" color="text.secondary">
                اضغط للانتقال مباشرة — بدون رجوع
              </Typography>
            </Box>
            <Divider />
            <Box sx={{ overflow: 'auto', flex: 1, p: 1 }}>
              {lessons.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  لا توجد فيديوهات حالياً.
                </Typography>
              )}
              {lessons.map((lesson, index) => {
                const free = lessonIsFree(index);
                const open = canWatchIndex(index);
                const active = selectedLesson?.id === lesson.id;
                return (
                  <Box
                    key={lesson.id}
                    onClick={() => handleLessonClick(lesson, index)}
                    sx={{
                      display: 'flex',
                      gap: 1.25,
                      alignItems: 'stretch',
                      p: 1,
                      mb: 0.75,
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: active ? 'rgba(26,107,181,0.12)' : 'transparent',
                      border: active ? '1px solid rgba(26,107,181,0.35)' : '1px solid transparent',
                      transition: '0.15s ease',
                      '&:hover': { bgcolor: 'rgba(26,107,181,0.08)' },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: 88,
                        minHeight: 56,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        bgcolor: 'rgba(26,107,181,0.1)',
                      }}
                    >
                      {lesson.thumbnailUrl ? (
                        <Box
                          component="img"
                          src={lesson.thumbnailUrl}
                          alt=""
                          sx={{
                            width: '100%',
                            height: '100%',
                            minHeight: 56,
                            objectFit: 'cover',
                            display: 'block',
                            filter: open ? 'none' : 'grayscale(0.35) brightness(0.92)',
                          }}
                        />
                      ) : (
                        <Box sx={{ height: '100%', minHeight: 56, display: 'grid', placeItems: 'center' }}>
                          {open ? <PlayArrow color="primary" /> : <Lock color="disabled" />}
                        </Box>
                      )}
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: open ? 'transparent' : 'rgba(0,0,0,0.28)',
                          pointerEvents: 'none',
                        }}
                      >
                        {!open && <Lock sx={{ color: '#fff', fontSize: 18 }} />}
                        {open && active && (
                          <PlayArrow sx={{ color: '#fff', fontSize: 22, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' }} />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1, py: 0.25 }}>
                      <Typography
                        fontWeight={active ? 900 : 700}
                        sx={{ fontSize: '0.9rem', lineHeight: 1.3 }}
                      >
                        {index + 1}. {lesson.title}
                      </Typography>
                      {lesson.learnHint ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            mt: 0.25,
                            lineHeight: 1.35,
                          }}
                        >
                          {lesson.learnHint}
                        </Typography>
                      ) : null}
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        {free && (
                          <Chip label="مجاني" size="small" color="success" sx={{ height: 20, fontSize: 11 }} />
                        )}
                        {!open && (
                          <Chip label="يحتاج كود" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                        )}
                        {lesson.durationMin ? (
                          <Typography variant="caption" color="text.secondary">
                            {lesson.durationMin} د
                          </Typography>
                        ) : null}
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
        <CourseContentLicense />
      </Container>

      <CourseLicenseAgreementDialog
        open={licenseOpen}
        courseTitle={course?.title}
        onClose={() => setLicenseOpen(false)}
        onAgree={continuePurchase}
      />
      <PaymentMethodDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        item={{
          title: course?.title,
          price: course?.price,
          category: course?.category,
          hours: course?.hours,
        }}
      />
    </Box>
  );
}
