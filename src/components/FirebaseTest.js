import React, { useState, useEffect } from 'react';
import { Button, Box, Typography, Alert } from '@mui/material';
import { auth, db } from '../services/FirebaseService';
import { collection, addDoc, getDocs, onSnapshot } from 'firebase/firestore';

export default function FirebaseTest() {
  const [testResult, setTestResult] = useState('');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setLoading(true);
    setTestResult('Testing Firebase connection...');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        setTestResult('❌ No user logged in');
        return;
      }

      setTestResult(`✅ User logged in: ${user.email}`);
      
      // Test 1: Try to read teacher_approvals collection
      try {
        const approvalsSnapshot = await getDocs(collection(db, 'teacher_approvals'));
        const approvalsData = approvalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setTestResult(`✅ Successfully read teacher_approvals: ${approvalsData.length} documents`);
        setApprovals(approvalsData);
        
        // Debug: Show raw data
        if (approvalsData.length > 0) {
          setTestResult(prev => prev + `\n\n📋 Raw Data:\n${JSON.stringify(approvalsData, null, 2)}`);
        }
      } catch (error) {
        setTestResult(`❌ Error reading teacher_approvals: ${error.message}`);
      }

      // Test 2: Try to create a test approval
      try {
        const testApproval = {
          userId: user.uid,
          firstName: 'Test',
          lastName: 'User',
          email: user.email,
          phoneNumber: '+972-50-123-4567',
          requestedAt: new Date(),
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          notes: 'Test approval'
        };
        
        await addDoc(collection(db, 'teacher_approvals'), testApproval);
        setTestResult(prev => prev + '\n✅ Successfully created test approval');
      } catch (error) {
        setTestResult(prev => prev + `\n❌ Error creating approval: ${error.message}`);
      }

    } catch (error) {
      setTestResult(`❌ General error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    setTestResult('Clearing test data...');
    // Note: In a real app, you'd delete the test documents
    setTestResult('Test data cleared (manual cleanup needed in Firebase console)');
  };

  const createTestTeacherApproval = async () => {
    setLoading(true);
    setTestResult('Creating test teacher approval...');
    
    try {
      const testApproval = {
        userId: 'test_user_123',
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'test.teacher@example.com',
        phoneNumber: '+972-50-123-4567',
        requestedAt: new Date(),
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        notes: 'Test approval for debugging'
      };
      
      const docRef = await addDoc(collection(db, 'teacher_approvals'), testApproval);
      setTestResult(`✅ Successfully created test approval with ID: ${docRef.id}`);
      
      // Refresh the approvals list
      setTimeout(() => {
        testFirebaseConnection();
      }, 1000);
      
    } catch (error) {
      setTestResult(`❌ Error creating test approval: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, border: '2px solid #ccc', borderRadius: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Firebase Connection Test
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        Current user: {auth.currentUser?.email || 'Not logged in'}
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testFirebaseConnection}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'جاري الاختبار...' : 'اختبار اتصال Firebase'}
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={clearTestData}
        sx={{ mb: 2, ml: 2 }}
      >
        Clear Test Data
      </Button>
      
      <Button 
        variant="contained" 
        color="secondary"
        onClick={createTestTeacherApproval}
        disabled={loading}
        sx={{ mb: 2, ml: 2 }}
      >
        Create Test Teacher Approval
      </Button>
      
      {testResult && (
        <Alert 
          severity={testResult.includes('❌') ? 'error' : 'success'}
          sx={{ mt: 2, whiteSpace: 'pre-line' }}
        >
          {testResult}
        </Alert>
      )}
      
      {approvals.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">Found Approvals:</Typography>
          {approvals.map((approval, index) => (
            <Typography key={index} variant="body2">
              {index + 1}. {approval.firstName} {approval.lastName} - {approval.status}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
}
