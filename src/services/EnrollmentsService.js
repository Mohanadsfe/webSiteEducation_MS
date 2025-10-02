import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './FirebaseService';

export class EnrollmentsService {
  static async isActiveEnrollment(uid, courseId) {
    const id = `${uid}_${courseId}`;
    const snap = await getDoc(doc(db, 'enrollments', id));
    return snap.exists() && snap.data().status === 'active';
  }

  static async listStudentActiveCourses(uid) {
    const q1 = query(collection(db, 'enrollments'), where('studentId', '==', uid), where('status', '==', 'active'));
    const qs = await getDocs(q1);
    return qs.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async listByCourse(courseId) {
    const q1 = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
    const qs = await getDocs(q1);
    return qs.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getEnrollmentStatus(studentId, courseId) {
    const enrollmentId = `${studentId}_${courseId}`;
    const enrollmentRef = doc(db, 'enrollments', enrollmentId);
    const snap = await getDoc(enrollmentRef);
    return snap.exists() ? snap.data().status : 'none';
  }

  static async getActiveEnrollmentsForStudent(studentId) {
    const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId), where('status', '==', 'active'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getEnrollmentsForCourse(courseId) {
    const q = query(collection(db, 'enrollments'), where('courseId', '==', courseId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async grantEnrollment(studentId, studentEmail, courseId, grantedByUid) {
    const enrollmentId = `${studentId}_${courseId}`;
    await setDoc(doc(db, 'enrollments', enrollmentId), {
      studentId,
      studentEmail,
      courseId,
      status: 'active',
      grantedBy: grantedByUid,
      grantedAt: new Date(), // Use client-side timestamp for now, can be serverTimestamp()
    }, { merge: true });
  }

  static async revokeEnrollment(enrollmentId) {
    await updateDoc(doc(db, 'enrollments', enrollmentId), { status: 'revoked' });
  }
}

export default EnrollmentsService;


