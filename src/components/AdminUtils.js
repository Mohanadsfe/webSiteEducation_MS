import React, { useState } from 'react';
import { Button, TextField, Box, Typography, Alert } from '@mui/material';
import { auth, db } from '../services/FirebaseService';
import { doc, updateDoc } from 'firebase/firestore';

export default function AdminUtils() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const updateUserRole = async () => {
    if (!email) {
      setMessage('Please enter an email');
      return;
    }

    try {
      // Find user by email (this is a simplified approach)
      // In a real app, you'd query users collection by email
      const user = auth.currentUser;
      if (!user) {
        setMessage('No user logged in');
        return;
      }

      // Update current user's role
      await updateDoc(doc(db, 'users', user.uid), {
        role: 'teacher',
        status: 'active'
      });

      setMessage('✅ Role updated to teacher! Refresh the page.');
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2, mt: 2 }}>
      <Typography variant="h6">Admin Utilities</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Current user: {auth.currentUser?.email}
      </Typography>
      
      <TextField
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={auth.currentUser?.email}
        sx={{ mb: 2 }}
      />
      
      <Button 
        variant="contained" 
        onClick={updateUserRole}
        sx={{ mb: 2 }}
      >
        Update My Role to Teacher
      </Button>
      
      {message && (
        <Alert severity={message.includes('✅') ? 'success' : 'error'}>
          {message}
        </Alert>
      )}
    </Box>
  );
}
