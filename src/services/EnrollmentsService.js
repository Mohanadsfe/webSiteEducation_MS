import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './FirebaseService';
import { generateStudentAccessCode } from '../utils/cloudVideoLink';

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

  /** Personal code unique among enrollments for this course only */
  static async _uniqueCodeForCourse(courseId, excludeEnrollmentId = '') {
    const existing = await this.getEnrollmentsForCourse(courseId);
    const used = new Set(
      existing
        .filter((e) => e.id !== excludeEnrollmentId && e.accessCode)
        .map((e) => String(e.accessCode).toUpperCase())
    );
    for (let i = 0; i < 20; i += 1) {
      const code = generateStudentAccessCode();
      if (!used.has(code.toUpperCase())) return code;
    }
    return `${generateStudentAccessCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
  }

  /**
   * Owner grants paid access and creates a unique student access code for THIS course only.
   * Returns the access code so the owner can send it (WhatsApp).
   * After a revoke, a new code is always issued (old code stays invalid).
   */
  static async grantEnrollment(studentId, studentEmail, courseId, grantedByUid) {
    const enrollmentId = `${studentId}_${courseId}`;
    const existing = await getDoc(doc(db, 'enrollments', enrollmentId));
    const prev = existing.exists() ? existing.data() : null;
    const reuseCode =
      prev?.status === 'active' && prev?.accessCode
        ? String(prev.accessCode)
        : '';
    const accessCode = reuseCode || (await this._uniqueCodeForCourse(courseId, enrollmentId));

    await setDoc(doc(db, 'enrollments', enrollmentId), {
      studentId,
      studentEmail,
      courseId,
      status: 'active',
      accessCode,
      grantedBy: grantedByUid,
      grantedAt: new Date(),
      revokedAt: null,
      accessCodeClearedAt: null,
    }, { merge: true });

    return accessCode;
  }

  /**
   * Owner cancels access even if the student already has a working code.
   * Clears the code so it can no longer unlock the course.
   */
  static async revokeEnrollment(enrollmentId) {
    const snap = await getDoc(doc(db, 'enrollments', enrollmentId));
    const prevCode = snap.exists() ? (snap.data().accessCode || '') : '';
    await updateDoc(doc(db, 'enrollments', enrollmentId), {
      status: 'revoked',
      accessCode: '',
      previousAccessCode: prevCode || null,
      revokedAt: new Date(),
      accessCodeClearedAt: new Date(),
    });
  }

  static async getEnrollment(studentId, courseId) {
    const enrollmentId = `${studentId}_${courseId}`;
    const snap = await getDoc(doc(db, 'enrollments', enrollmentId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  /** Regenerate personal access code (owner only) — unique within this course */
  static async regenerateAccessCode(enrollmentId) {
    const snap = await getDoc(doc(db, 'enrollments', enrollmentId));
    const courseId = snap.exists() ? snap.data().courseId : '';
    const accessCode = courseId
      ? await this._uniqueCodeForCourse(courseId, enrollmentId)
      : generateStudentAccessCode();
    await updateDoc(doc(db, 'enrollments', enrollmentId), {
      accessCode,
      accessCodeUpdatedAt: new Date(),
    });
    return accessCode;
  }
}

export default EnrollmentsService;


