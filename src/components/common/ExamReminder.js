import React, { useEffect, useState } from 'react';
import { Snackbar, Alert, AlertTitle, Button, Box } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../services/FirebaseService';
import ExamsService from '../../services/ExamsService';

const STORAGE_KEY = 'ms_exam_reminder_seen';

function alreadyShownToday(examId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return data.date === today && data.examId === examId;
  } catch {
    return false;
  }
}

function markShown(examId) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), examId })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Shows a helpful, thankful reminder for the student's nearest upcoming exam.
 */
export default function ExamReminder() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('تذكير بالامتحان');

  useEffect(() => {
    let unsubExams = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubExams();
      unsubExams = () => {};
      if (!user) {
        setOpen(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const role = snap.exists() ? snap.data().role : '';
        if (role !== 'student') return;

        unsubExams = ExamsService.listenStudentExams(user.uid, (list) => {
          const exam = ExamsService.pickReminderExam(list);
          if (!exam || alreadyShownToday(exam.id)) {
            setOpen(false);
            return;
          }
          const days = exam.daysLeft ?? ExamsService.daysUntil(exam.examDate);
          if (days === 0) setTitle('امتحانك اليوم — أنت تستطيع!');
          else if (days === 1) setTitle('تذكير: امتحانك غداً');
          else setTitle(`تذكير: امتحان خلال ${days} أيام`);
          setMessage(ExamsService.buildReminderText(exam));
          setOpen(true);
          markShown(exam.id);
        });
      } catch (e) {
        console.error('ExamReminder', e);
      }
    });

    return () => {
      unsubAuth();
      unsubExams();
    };
  }, []);

  return (
    <Snackbar
      open={open}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ direction: 'rtl', maxWidth: 520, width: '100%', px: 1 }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={() => setOpen(false)}
        sx={{
          width: '100%',
          alignItems: 'flex-start',
          bgcolor: '#0d47a1',
          '& .MuiAlert-message': { width: '100%' },
        }}
        action={
          <Button color="inherit" size="small" onClick={() => setOpen(false)}>
            حسناً
          </Button>
        }
      >
        <AlertTitle sx={{ fontWeight: 800 }}>{title}</AlertTitle>
        <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.95rem', lineHeight: 1.7 }}>
          {message}
        </Box>
      </Alert>
    </Snackbar>
  );
}
