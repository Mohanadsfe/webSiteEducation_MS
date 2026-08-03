// Quick script to check and update user role in Firebase
// Run this in your browser console while logged in

import { auth, db } from './src/services/FirebaseService.js';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

async function checkAndUpdateUserRole() {
  const user = auth.currentUser;
  if (!user) {
    console.log('No user logged in');
    return;
  }

  console.log('Current user:', user.email);
  console.log('User ID:', user.uid);

  try {
    // Get current user data
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('Current role:', userData.role);
      console.log('Full user data:', userData);
      
      // If role is not 'teacher', update it
      if (userData.role !== 'teacher') {
        console.log('Updating role to teacher...');
        await updateDoc(doc(db, 'users', user.uid), {
          role: 'teacher',
          status: 'active'
        });
        console.log('✅ Role updated to teacher!');
      } else {
        console.log('✅ Already has teacher role');
      }
    } else {
      console.log('❌ User document not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
checkAndUpdateUserRole();
