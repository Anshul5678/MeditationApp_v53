import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export class AuthService {
  // Sign up with Email/Password
  static async signUpWithEmail(email, password, fullName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Create user profile in MeditationUsers collection
      await setDoc(doc(db, 'MeditationUsers', user.uid), {
        uid: user.uid,
        email: email,
        fullName: fullName,
        name: fullName, // Also add name field for compatibility
        bio: "",
        role: 'user',
        status: 'active',
        language: 'english',
        location: "",
        profileImageUrl: "",
        avatar: "", // Also add avatar field for compatibility
        joinedAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp(),
        followers: 0,
        isInstructor: false,
        meditationPreferences: {
          duration: 15,
          music: true,
          style: 'mindfulness'
        },
        subscription: {
          type: 'free',
          startDate: serverTimestamp(),
          endDate: null
        },
        stats: {
          totalSessions: 0,
          totalMinutes: 0,
          currentStreak: 0,
          longestStreak: 0,
          coursesCompleted: 0
        }
      });

      return user;
    } catch (error) {
      console.error('Sign-up error:', error.message);
      throw error;
    }
  }

  // Sign in with Email/Password
  static async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update lastActive when user signs in
      const userRef = doc(db, 'MeditationUsers', user.uid);
      await setDoc(userRef, {
        lastActive: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return user;
    } catch (error) {
      console.error('Sign-in error:', error.message);
      throw error;
    }
  }

  // Sign out
  static async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign-out error:', error.message);
      throw error;
    }
  }

  // Get current user
  static getCurrentUser() {
    return auth.currentUser;
  }

  // Listen to auth state changes
  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }

  // Get user profile from Firestore
  static async getUserProfile(userId) {
    try {
      const userDoc = doc(db, 'MeditationUsers', userId);
      const userSnapshot = await getDoc(userDoc);
      
      if (userSnapshot.exists()) {
        return {
          id: userSnapshot.id,
          ...userSnapshot.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'MeditationUsers', userId);
      await setDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Reset password
  static async resetPassword(email) {
    try {
      // For now, just throw an error since we need to implement this
      throw new Error('Password reset functionality will be implemented soon');
    } catch (error) {
      console.error('Reset password error:', error.message);
      throw error;
    }
  }
} 