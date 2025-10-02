import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from './FirebaseService';

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
}

export default UsersService;


