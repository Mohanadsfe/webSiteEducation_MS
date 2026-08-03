import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/FirebaseService';
import { TRACK_STORAGE_KEY, getTrackConfig } from '../constants/tracks';

export default function useStudyTrack() {
  const [track, setTrackState] = useState(() => {
    try {
      return localStorage.getItem(TRACK_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId('');
        setLoading(false);
        return;
      }
      setUserId(user.uid);
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const saved = snap.exists() ? snap.data().studyTrack : '';
        if (saved && getTrackConfig(saved)) {
          setTrackState(saved);
          localStorage.setItem(TRACK_STORAGE_KEY, saved);
        }
      } catch (e) {
        console.error('useStudyTrack', e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const setTrack = useCallback(
    async (next) => {
      if (!getTrackConfig(next)) return;
      setTrackState(next);
      try {
        localStorage.setItem(TRACK_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      if (userId) {
        try {
          await updateDoc(doc(db, 'users', userId), { studyTrack: next });
        } catch (e) {
          console.error('Failed to save studyTrack', e);
        }
      }
    },
    [userId]
  );

  const clearTrack = useCallback(async () => {
    setTrackState('');
    try {
      localStorage.removeItem(TRACK_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (userId) {
      try {
        await updateDoc(doc(db, 'users', userId), { studyTrack: '' });
      } catch (e) {
        console.error('Failed to clear studyTrack', e);
      }
    }
  }, [userId]);

  return {
    track,
    trackConfig: getTrackConfig(track),
    setTrack,
    clearTrack,
    loading,
  };
}
