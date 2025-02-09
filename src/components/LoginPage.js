import React, { useState } from 'react';
import { Button, TextField, Typography, Container, Grid, Paper, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const auth = getAuth();

function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState('student');  // Role: student or teacher
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsLoggedIn(true);
      alert('Login successful!');
      window.location.href = '/';  // Redirect to the homepage
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store additional user information in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        phoneNumber,
        email,
        role
      });

      setIsLoggedIn(true);
      alert('Registration successful!');
      window.location.href = '/';  // Redirect to the homepage
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      alert('Logout successful!');
      window.location.href = '/login';  // Redirect to the login page
    } catch (err) {
      setError('Failed to log out. Please try again.');
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '2rem' }}>
      <Paper style={{ padding: '2rem' }}>
        {isLoggedIn ? (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              Welcome, {firstName}!
            </Typography>
            <Button variant="contained" color="primary" fullWidth onClick={handleLogout}>
              Logout
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h4" align="center" gutterBottom>
              {isRegistering ? 'Register' : 'Login'}
            </Typography>

            {error && <Typography color="error" align="center">{error}</Typography>}

            {isRegistering && (
              <>
                <TextField
                  label="First Name"
                  fullWidth
                  margin="normal"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <TextField
                  label="Last Name"
                  fullWidth
                  margin="normal"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                <TextField
                  label="Phone Number"
                  type="tel"
                  fullWidth
                  margin="normal"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Role</InputLabel>
                  <Select value={role} onChange={(e) => setRole(e.target.value)}>
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="teacher">Teacher</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}

            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Grid container spacing={2} style={{ marginTop: '1rem' }}>
              <Grid item xs={12} sm={6}>
                <Button variant="contained" color="primary" fullWidth onClick={isRegistering ? handleRegister : handleLogin}>
                  {isRegistering ? 'Register' : 'Login'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button color="secondary" fullWidth onClick={() => setIsRegistering(!isRegistering)}>
                  {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                </Button>
              </Grid>
            </Grid>
          </>
        )}
      </Paper>
    </Container>
  );
}

export default LoginPage;
