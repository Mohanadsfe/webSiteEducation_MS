import { auth, db } from '../firebaseConfig';

export class FirebaseService {
  static getAuth() {
    return auth;
  }

  static getDb() {
    return db;
  }
}

// Export db and auth directly for services to use
export { db, auth };

export default FirebaseService;


