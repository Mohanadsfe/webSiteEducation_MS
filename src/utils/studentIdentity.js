import UsersService from '../services/UsersService';
import { auth } from '../services/FirebaseService';

/**
 * Resolve the signed-in student's booking identity from Firestore profile.
 * Never invents owner/teacher data as the student.
 */
export async function resolveStudentBookingIdentity(uid = auth.currentUser?.uid) {
  const user = auth.currentUser;
  const id = uid || user?.uid;
  if (!id) {
    return { studentId: '', studentName: '', studentEmail: '', studentPhone: '' };
  }

  let profile = null;
  try {
    profile = await UsersService.getUser(id);
  } catch {
    profile = null;
  }

  const nameFromProfile = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
    || (profile?.fullName || '').trim()
    || (profile?.displayName || '').trim();

  const studentName = nameFromProfile || (user?.displayName || '').trim() || '';
  const studentEmail = (profile?.email || user?.email || '').trim();
  const studentPhone = (profile?.phoneNumber || profile?.phone || '').trim();

  return {
    studentId: id,
    studentName,
    studentEmail,
    studentPhone,
  };
}
