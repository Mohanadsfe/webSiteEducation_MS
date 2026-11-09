import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../../services/FirebaseService';
import useStudyTrack from '../../hooks/useStudyTrack';
import { matchesTrackCategory } from '../../constants/tracks';

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizePurchase(purchase) {
  return {
    id: purchase.id,
    title: purchase.bundleTitle ?? purchase.title ?? 'رزمة',
    purchased: toNum(purchase.hoursPurchased ?? purchase.hours ?? 0),
    used: toNum(purchase.hoursUsed ?? purchase.usedHours ?? 0),
    category: purchase.category ?? 'tutoring',
    active: purchase.active !== false,
  };
}

/** The signed-in student's package hours. Shown on مواعيدي only. */
export default function StudentBundleStatus() {
  const { track } = useStudyTrack();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let unsubs = [];
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubs.forEach((fn) => fn());
      unsubs = [];
      if (!user) {
        setRows([]);
        return;
      }
      const apply = (snap) => {
        setRows((prev) => {
          const map = new Map(prev.map((row) => [row.id, row]));
          snap.docs.forEach((docSnap) => map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
          return Array.from(map.values());
        });
      };
      unsubs.push(onSnapshot(
        query(collection(db, 'purchases'), where('studentId', '==', user.uid)),
        apply
      ));
      if (user.email) {
        unsubs.push(onSnapshot(
          query(collection(db, 'purchases'), where('studentEmail', '==', user.email)),
          apply
        ));
      }
    });
    return () => {
      unsubAuth();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const activeList = rows
    .map(normalizePurchase)
    .filter((row) => row.active && (!track || matchesTrackCategory(row.category, track)));
  const totalPurchased = activeList.reduce((sum, row) => sum + row.purchased, 0);
  const totalUsed = activeList.reduce((sum, row) => sum + row.used, 0);
  const totalRemaining = Math.max(0, totalPurchased - totalUsed);

  return (
    <Card elevation={0} sx={{ mb: 2.5, borderRadius: 3, direction: 'rtl', border: '1px solid rgba(25,118,210,0.16)' }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
          حالتي الحالية
        </Typography>
        {activeList.length === 0 ? (
          <Typography color="text.secondary">لا توجد باقات مفعّلة حالياً.</Typography>
        ) : (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Typography fontWeight={800}>ساعات مشتراة: {totalPurchased}</Typography>
              <Typography fontWeight={800}>مستخدمة: {totalUsed}</Typography>
              <Typography fontWeight={800}>متبقية: {totalRemaining}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={totalPurchased > 0 ? (totalUsed / totalPurchased) * 100 : 0}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
            <Stack spacing={1}>
              {activeList.map((row) => {
                const remaining = Math.max(0, row.purchased - row.used);
                return (
                  <Box key={row.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: 'rgba(25,118,210,0.05)' }}>
                    <Typography fontWeight={800}>{row.title}</Typography>
                    <Typography variant="body2">
                      {row.purchased} ساعة · {row.used} مستخدمة · {remaining} متبقية
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
