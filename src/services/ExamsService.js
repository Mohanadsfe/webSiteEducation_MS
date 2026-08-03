import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './FirebaseService';

const COLLECTION = 'student_exams';

const ENCOURAGEMENTS = [
  (name) => `أنت قادر على النجاح في امتحان "${name}"! ثِق بنفسك واستمر — نحن نؤمن بك.`,
  (name) => `امتحان "${name}" قريب، وأنت مستعد أكثر مما تظن. خطوة بخطوة تصل.`,
  (name) => `شكراً لالتزامك! تذكّر امتحان "${name}" — المذاكرة اليوم تصنع فرقاً كبيراً غداً.`,
  (name) => `كل التوفيق في "${name}". أنت لست وحدك، ونحن فخورون بجهدك.`,
  (name) => `خذ نفساً عميقاً: امتحان "${name}" فرصة لتُظهر ما تعلّمته. يمكنك ذلك!`,
  (name) => `نثمّن مثابرتك. امتحان "${name}" قادم — راجع بهدوء، ونام جيداً، وثق بقدرتك.`,
];

function toDate(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export class ExamsService {
  static encouragingMessage(examName, seed = 0) {
    const idx = Math.abs(seed) % ENCOURAGEMENTS.length;
    return ENCOURAGEMENTS[idx](examName || 'امتحانك');
  }

  static daysUntil(examDate) {
    const d = toDate(examDate);
    if (!d) return null;
    const today = startOfDay(new Date());
    const target = startOfDay(d);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  static formatExamDate(examDate) {
    const d = toDate(examDate);
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('ar-IL', {
        dateStyle: 'full',
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  static async addExam({
    studentId,
    studentEmail,
    studentName,
    examName,
    examDate,
    notes = '',
    imageUrl = '',
  }) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('يجب تسجيل الدخول');
    // Always use auth uid so Firestore rules (studentId == auth.uid) pass
    const ownerId = uid;
    if (studentId && studentId !== ownerId) {
      console.warn('studentId prop ignored; using auth.uid for exam create');
    }

    const name = (examName || '').trim();
    if (!name) throw new Error('أدخل اسم الامتحان');
    const date = toDate(examDate);
    if (!date) throw new Error('أدخل تاريخ الامتحان');

    const ref = await addDoc(collection(db, COLLECTION), {
      studentId: ownerId,
      studentEmail: studentEmail || auth.currentUser?.email || '',
      studentName: studentName || '',
      examName: name,
      examDate: date,
      notes: (notes || '').trim(),
      imageUrl: (imageUrl || '').trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return ref.id;
  }

  static async updateExam(examId, { examName, examDate, notes, imageUrl }) {
    if (!examId) throw new Error('معرّف الامتحان غير صالح');
    const payload = { updatedAt: new Date() };
    if (examName !== undefined) {
      const name = (examName || '').trim();
      if (!name) throw new Error('أدخل اسم الامتحان');
      payload.examName = name;
    }
    if (examDate !== undefined) {
      const date = toDate(examDate);
      if (!date) throw new Error('أدخل تاريخ الامتحان');
      payload.examDate = date;
    }
    if (notes !== undefined) payload.notes = (notes || '').trim();
    if (imageUrl !== undefined) payload.imageUrl = (imageUrl || '').trim();
    await updateDoc(doc(db, COLLECTION, examId), payload);
  }

  /** Default cover if student didn't add an image */
  static defaultCover(examName = '') {
    const covers = [
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-14565130808-8221ff45d9e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    ];
    let h = 0;
    for (let i = 0; i < examName.length; i += 1) h = (h + examName.charCodeAt(i) * (i + 1)) % covers.length;
    return covers[h];
  }

  static coverOf(exam) {
    return (exam?.imageUrl && String(exam.imageUrl).trim()) || ExamsService.defaultCover(exam?.examName || '');
  }

  static async deleteExam(examId) {
    if (!examId) return;
    await deleteDoc(doc(db, COLLECTION, examId));
  }

  static sortByExamDate(list) {
    return [...list].sort((a, b) => {
      const ta = toDate(a.examDate)?.getTime() || 0;
      const tb = toDate(b.examDate)?.getTime() || 0;
      return ta - tb;
    });
  }

  static listenStudentExams(studentId, callback) {
    if (!studentId) return () => {};
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(ExamsService.sortByExamDate(list));
      },
      (err) => {
        console.error('listenStudentExams', err);
        callback([]);
      }
    );
  }

  static listenAllExams(callback) {
    // Client-side sort avoids requiring a composite index
    return onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(ExamsService.sortByExamDate(list));
      },
      (err) => {
        console.error('listenAllExams', err);
        callback([]);
      }
    );
  }

  static async listStudentExams(studentId) {
    const q = query(
      collection(db, COLLECTION),
      where('studentId', '==', studentId)
    );
    const snap = await getDocs(q);
    return ExamsService.sortByExamDate(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    );
  }

  /**
   * Pick the most relevant upcoming exam for a reminder (today → within 7 days).
   */
  static pickReminderExam(exams) {
    if (!Array.isArray(exams) || exams.length === 0) return null;
    const upcoming = exams
      .map((e) => ({ ...e, daysLeft: ExamsService.daysUntil(e.examDate) }))
      .filter((e) => e.daysLeft !== null && e.daysLeft >= 0 && e.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    return upcoming[0] || null;
  }

  static buildReminderText(exam) {
    if (!exam) return '';
    const days = exam.daysLeft ?? ExamsService.daysUntil(exam.examDate);
    const dateLabel = ExamsService.formatExamDate(exam.examDate);
    let timing = '';
    if (days === 0) timing = 'امتحانك اليوم';
    else if (days === 1) timing = 'امتحانك غداً';
    else timing = `متبقّي ${days} أيام على امتحانك`;

    const encourage = ExamsService.encouragingMessage(
      exam.examName,
      (exam.id || '').length + (days || 0)
    );

    return `${timing}: ${exam.examName} — ${dateLabel}\n\n${encourage}\n\nشكراً لثقتك بنا — أنت تستطيع، ونحن معك.`;
  }
}

export default ExamsService;
