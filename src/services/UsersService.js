import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './FirebaseService';
import { isOwnerAdminEmail } from '../constants/admin';

const BATCH_LIMIT = 450;

async function deleteQueryMatches(collectionName, field, value) {
  if (value === undefined || value === null || value === '') return 0;
  try {
    const q = query(collection(db, collectionName), where(field, '==', value));
    const snap = await getDocs(q);
    if (snap.empty) return 0;

    let deleted = 0;
    let batch = writeBatch(db);
    let ops = 0;

    for (const d of snap.docs) {
      batch.delete(d.ref);
      ops += 1;
      deleted += 1;
      if (ops >= BATCH_LIMIT) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    return deleted;
  } catch (e) {
    console.warn(`deleteQueryMatches failed: ${collectionName}.${field}`, e);
    // Don't abort whole user delete if one related collection fails
    return 0;
  }
}

export class UsersService {
  static async getRole(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return '';
    return snap.data().role || '';
  }

  static async getUser(uid) {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  static async getUserByEmail(email) {
    const q1 = query(collection(db, 'users'), where('email', '==', email));
    const snap = await getDocs(q1);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }

  static async updateUser(uid, data) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
  }

  static async getAllStudents() {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  /**
   * Admin/teacher only: permanently delete a user profile and related Firestore data.
   * Firebase Auth account deletion needs Admin SDK / Cloud Function (not done here).
   */
  static async deleteUserAndData(targetUid) {
    const actor = auth.currentUser;
    if (!actor) throw new Error('يجب تسجيل الدخول');
    if (!targetUid) throw new Error('معرّف المستخدم غير صالح');
    if (actor.uid === targetUid) throw new Error('لا يمكنك حذف حسابك بنفسك');

    const actorSnap = await getDoc(doc(db, 'users', actor.uid));
    const actorData = actorSnap.exists() ? actorSnap.data() : {};
    const actorEmail = (actor.email || actorData.email || '').toLowerCase();
    const isAdminOverride = isOwnerAdminEmail(actorEmail);
    const isAdmin = actorData.role === 'teacher' || isAdminOverride;

    if (!isAdmin) throw new Error('غير مخوّل — الحذف للمسؤول فقط');

    // Ensure Firestore role matches rules (owner email soft-admin)
    if (isAdminOverride && actorData.role !== 'teacher' && actorSnap.exists()) {
      try {
        await updateDoc(doc(db, 'users', actor.uid), { role: 'teacher' });
      } catch (e) {
        console.warn('Could not auto-promote owner role to teacher', e);
      }
    }

    const target = await UsersService.getUser(targetUid);
    if (!target) throw new Error('المستخدم غير موجود');

    const email = target.email || '';

    await Promise.all([
      deleteQueryMatches('enrollments', 'studentId', targetUid),
      deleteQueryMatches('purchases', 'studentId', targetUid),
      deleteQueryMatches('appointments', 'studentId', targetUid),
      deleteQueryMatches('teacher_approvals', 'userId', targetUid),
      deleteQueryMatches('student_exams', 'studentId', targetUid),
    ]);

    if (email) {
      await Promise.all([
        deleteQueryMatches('purchases', 'studentEmail', email),
        deleteQueryMatches('appointments', 'studentEmail', email),
        deleteQueryMatches('enrollments', 'studentEmail', email),
        deleteQueryMatches('opinions', 'email', email),
      ]);
    }
    await deleteQueryMatches('opinions', 'userId', targetUid);

    try {
      await deleteDoc(doc(db, 'users', targetUid));
    } catch (e) {
      console.error(e);
      const msg = e?.code === 'permission-denied' || /insufficient permissions/i.test(e?.message || '')
        ? 'صلاحيات Firestore ناقصة. انشر قواعد firestore.rules المحدّثة (role=teacher أو بريد المالك)، ثم أعد المحاولة.'
        : (e?.message || 'فشل حذف المستخدم');
      throw new Error(msg);
    }

    return { deletedUid: targetUid, email };
  }
}

export default UsersService;
