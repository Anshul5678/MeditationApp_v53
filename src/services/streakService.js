import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp, 
  Timestamp,
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';

export class StreakService {
  
  /**
   * Get user's streak data, creating default if doesn't exist
   */
  static async getStreakData(userId) {
    try {
      const streakRef = doc(db, 'MeditationUsers', userId, 'streakData', 'current');
      const streakDoc = await getDoc(streakRef);
      
      if (streakDoc.exists()) {
        return streakDoc.data();
      } else {
        // Create default streak data
        const now = Timestamp.now();
        const defaultData = {
          currentStreak: 0,
          lastActivityDate: null,
          currentMonthStart: now,
          longestStreak: 0,
          totalCompleteDays: 0,
          monthlyHistory: {}
        };
        
        await setDoc(streakRef, {
          ...defaultData,
          currentMonthStart: serverTimestamp()
        });
        
        return defaultData;
      }
    } catch (error) {
      console.error('Error getting streak data:', error);
      throw error;
    }
  }

  /**
   * Update streak data in Firestore
   */
  static async updateStreakData(userId, streakData) {
    try {
      const streakRef = doc(db, 'MeditationUsers', userId, 'streakData', 'current');
      await setDoc(streakRef, {
        ...streakData,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating streak data:', error);
      throw error;
    }
  }

  /**
   * Check if we need to reset for new month and handle it
   */
  static async checkAndHandleMonthlyReset(userId) {
    try {
      const streakData = await this.getStreakData(userId);
      const now = new Date();
      const currentMonthStart = streakData.currentMonthStart?.toDate() || new Date();
      
      // Check if we're in a new month
      const isNewMonth = now.getMonth() !== currentMonthStart.getMonth() || 
                        now.getFullYear() !== currentMonthStart.getFullYear();
      
      if (isNewMonth) {
        // Save current month to history
        const monthKey = `${currentMonthStart.getFullYear()}-${String(currentMonthStart.getMonth() + 1).padStart(2, '0')}`;
        const monthName = currentMonthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const monthlyRecord = {
          streak: streakData.currentStreak,
          month: monthName,
          completeDays: streakData.totalCompleteDays,
          year: currentMonthStart.getFullYear(),
          monthNumber: currentMonthStart.getMonth() + 1
        };

        // Update streak data for new month
        const updatedStreakData = {
          currentStreak: 0,
          currentMonthStart: serverTimestamp(),
          monthlyHistory: {
            ...streakData.monthlyHistory,
            [monthKey]: monthlyRecord
          }
        };

        await this.updateStreakData(userId, updatedStreakData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking monthly reset:', error);
      throw error;
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format (server timezone)
   */
  static getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get current month in YYYY-MM format
   */
  static getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Check if user has complete check-in/check-out for a specific date
   */
  static async hasCompleteCheckInForDate(userId, date) {
    try {
      const checkInsRef = collection(db, 'MeditationUsers', userId, 'checkIns');
      const q = query(
        checkInsRef, 
        where('date', '==', date),
        where('isComplete', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking complete check-in:', error);
      return false;
    }
  }

  /**
   * Calculate current streak by looking backward from today
   */
  static async calculateCurrentStreak(userId) {
    try {
      const today = this.getTodayDate();
      const currentMonth = this.getCurrentMonth();
      
      // Get all complete check-ins for current month, ordered by date desc
      const checkInsRef = collection(db, 'MeditationUsers', userId, 'checkIns');
      const q = query(
        checkInsRef,
        where('monthYear', '==', currentMonth),
        where('isComplete', '==', true),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const completeDays = querySnapshot.docs.map(doc => doc.data().date);
      
      if (completeDays.length === 0) {
        return 0;
      }

      // Calculate streak by counting consecutive days from today backward
      let streak = 0;
      let checkDate = new Date(today);
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        
        // Stop if we've reached previous month
        if (dateStr.substring(0, 7) !== currentMonth) {
          break;
        }
        
        if (completeDays.includes(dateStr)) {
          streak++;
          // Move to previous day
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          // Break streak if day is not complete
          break;
        }
      }
      
      return streak;
    } catch (error) {
      console.error('Error calculating current streak:', error);
      return 0;
    }
  }

  /**
   * Update streak after completing a check-in/check-out
   */
  static async updateStreakAfterComplete(userId) {
    try {
      const today = this.getTodayDate();
      const streakData = await this.getStreakData(userId);
      
      // Check if user already completed today
      const hasCompletedToday = await this.hasCompleteCheckInForDate(userId, today);
      
      if (!hasCompletedToday) {
        console.log('❌ No complete check-in found for today');
        return;
      }

      // Calculate new streak
      const newStreak = await this.calculateCurrentStreak(userId);
      
      // Update streak data
      const updatedStreakData = {
        currentStreak: newStreak,
        lastActivityDate: today,
        longestStreak: Math.max(streakData.longestStreak || 0, newStreak),
        totalCompleteDays: (streakData.totalCompleteDays || 0) + 1
      };

      await this.updateStreakData(userId, updatedStreakData);
      console.log('✅ Streak updated:', updatedStreakData);
      
    } catch (error) {
      console.error('Error updating streak after complete:', error);
    }
  }

  /**
   * Get streak statistics for user
   */
  static async getStreakStats(userId) {
    try {
      const streakData = await this.getStreakData(userId);
      const currentStreak = await this.calculateCurrentStreak(userId);
      
      // Convert monthly history to array
      const monthlyHistory = Object.values(streakData.monthlyHistory || {})
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.monthNumber - a.monthNumber;
        });

      return {
        currentStreak,
        longestStreak: streakData.longestStreak || 0,
        totalCompleteDays: streakData.totalCompleteDays || 0,
        monthlyHistory
      };
    } catch (error) {
      console.error('Error getting streak stats:', error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalCompleteDays: 0,
        monthlyHistory: []
      };
    }
  }

  /**
   * Initialize user streak data if it doesn't exist
   */
  static async initializeUserStreak(userId) {
    try {
      const streakRef = doc(db, 'MeditationUsers', userId, 'streakData', 'current');
      const streakDoc = await getDoc(streakRef);
      
      if (!streakDoc.exists()) {
        const now = Timestamp.now();
        const defaultData = {
          currentStreak: 0,
          lastActivityDate: null,
          currentMonthStart: now,
          longestStreak: 0,
          totalCompleteDays: 0,
          monthlyHistory: {},
          createdAt: serverTimestamp()
        };
        
        await setDoc(streakRef, defaultData);
        console.log('✅ Initialized streak data for user:', userId);
      }
    } catch (error) {
      console.error('Error initializing user streak:', error);
    }
  }

  /**
   * Reset streak data (for testing purposes)
   */
  static async resetStreakData(userId) {
    try {
      const streakRef = doc(db, 'MeditationUsers', userId, 'streakData', 'current');
      const now = Timestamp.now();
      const resetData = {
        currentStreak: 0,
        lastActivityDate: null,
        currentMonthStart: now,
        longestStreak: 0,
        totalCompleteDays: 0,
        monthlyHistory: {},
        resetAt: serverTimestamp()
      };
      
      await setDoc(streakRef, resetData);
      console.log('✅ Reset streak data for user:', userId);
    } catch (error) {
      console.error('Error resetting streak data:', error);
    }
  }
} 