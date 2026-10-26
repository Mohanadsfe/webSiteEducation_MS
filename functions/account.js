function accountWipeTargets(uid, email) {
  const id = String(uid || '').trim();
  const mail = String(email || '').trim();
  const targets = [
    { collection: 'appointments', field: 'studentId', value: id },
    { collection: 'notifications', field: 'userId', value: id },
    { collection: 'enrollments', field: 'studentId', value: id },
    { collection: 'purchases', field: 'studentId', value: id },
    { collection: 'student_exams', field: 'studentId', value: id },
    { collection: 'teacher_approvals', field: 'userId', value: id },
    { collection: 'opinions', field: 'userId', value: id },
  ];
  if (mail) {
    targets.push(
      { collection: 'appointments', field: 'studentEmail', value: mail },
      { collection: 'enrollments', field: 'studentEmail', value: mail },
      { collection: 'purchases', field: 'studentEmail', value: mail },
      { collection: 'opinions', field: 'email', value: mail }
    );
  }
  return targets.filter((row) => row.value);
}

async function deleteByField(db, collectionName, field, value) {
  const snap = await db.collection(collectionName).where(field, '==', value).get();
  let deleted = 0;
  let batch = db.batch();
  let ops = 0;
  for (const row of snap.docs) {
    batch.delete(row.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops) await batch.commit();
  return deleted;
}

/** Remove Firestore records that belong to this account, then the profile itself. */
async function deleteAccountData(db, uid, email) {
  const tokens = await db.collection('users').doc(uid).collection('fcmTokens').get();
  if (!tokens.empty) {
    const batch = db.batch();
    tokens.docs.forEach((row) => batch.delete(row.ref));
    await batch.commit();
  }

  let deleted = tokens.size;
  for (const target of accountWipeTargets(uid, email)) {
    deleted += await deleteByField(db, target.collection, target.field, target.value);
  }
  await db.collection('users').doc(uid).delete();
  return deleted;
}

module.exports = {
  accountWipeTargets,
  deleteAccountData,
};
