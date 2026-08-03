// src/components/StudentDashboard.jsx
import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, LinearProgress,
  Chip, Box
} from '@mui/material';
import { auth, db } from '../../services/FirebaseService';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, query, where, onSnapshot, orderBy
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [me, setMe] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setMe(user);

      // live query by studentId (consistent with data model)
      const q1 = query(
        collection(db, 'enrollments'),
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const stop1 = onSnapshot(q1, (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEnrollments(rows);
      });

      // (Optional fallback) if older docs only stored email
      let stop2 = () => {};
      if (user.email) {
        const q2 = query(
          collection(db, 'enrollments'),
          where('studentEmail', '==', user.email),
          orderBy('createdAt', 'desc')
        );
        stop2 = onSnapshot(q2, (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          // merge unique
          setEnrollments((current) => {
            const map = new Map(current.map((x) => [x.id, x]));
            rows.forEach((r) => map.set(r.id, r));
            return Array.from(map.values());
          });
        });
      }

      return () => {
        stop1();
        stop2();
      };
    });

    return () => unsubAuth();
  }, [navigate]);

  if (!me) return null;

  return (
    <Container sx={{ py: 4, direction: 'rtl' }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>
        حسابي
      </Typography>

      {enrollments.length === 0 ? (
        <Typography color="text.secondary">
          لا توجد رزمات مفعّلة حتى الآن.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {enrollments.map((e) => {
            const hoursPurchased = Number(e.hoursPurchased ?? e.bundle?.hours ?? e.hours ?? 0);
            const hoursUsed = Number(e.hoursUsed ?? 0);
            const remaining = Math.max(0, hoursPurchased - hoursUsed);
            const ratio = hoursPurchased > 0 ? Math.min(100, Math.max(0, (hoursUsed / hoursPurchased) * 100)) : 0;

            return (
              <Grid item xs={12} md={6} key={e.id}>
                <Card elevation={6} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {e.bundleTitle || e.title || 'الرزمة'}
                      </Typography>
                      <Chip
                        size="small"
                        label={(e.category === 'exam' ? 'محاضرات امتحانات' : 'دروس خصوصية')}
                        color="default"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      السعر: ₪{e.price ?? e.bundle?.price ?? '—'}
                    </Typography>

                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      الساعات المشتراة: <b>{hoursPurchased}</b>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                      الساعات المستهلكة: <b>{hoursUsed}</b>
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      الساعات المتبقية: <b>{remaining}</b>
                    </Typography>

                    <LinearProgress variant="determinate" value={ratio} sx={{ height: 10, borderRadius: 5, mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(ratio)}% من الرزمة مُستخدم
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}
