import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './FirebaseService';

export class CoursesService {
  static async listCourses() {
    const qs = await getDocs(collection(db, 'courses'));
    return qs.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async getCourse(courseId) {
    const snap = await getDoc(doc(db, 'courses', courseId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  static async listLessons(courseId) {
    const qs = await getDocs(query(collection(db, 'courses', courseId, 'lessons'), orderBy('order', 'asc')));
    return qs.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async addCourse(data) {
    const ref = await addDoc(collection(db, 'courses'), data);
    return { id: ref.id, ...data };
  }

  static async updateCourse(courseId, data) {
    await updateDoc(doc(db, 'courses', courseId), data);
  }

  static async deleteCourse(courseId) {
    await deleteDoc(doc(db, 'courses', courseId));
  }

  static async addLesson(courseId, data) {
    const ref = await addDoc(collection(db, 'courses', courseId, 'lessons'), data);
    return { id: ref.id, ...data };
  }

  static async deleteLesson(courseId, lessonId) {
    await deleteDoc(doc(db, 'courses', courseId, 'lessons', lessonId));
  }
}

export default CoursesService;


