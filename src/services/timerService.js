import { collection, doc, addDoc, serverTimestamp, Timestamp, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from './firebase';

export class TimerService {
  /**
   * Save a meditation session to Firestore
   * Collection: MeditationUsers/{userId}/MeditationTimer
   */
  static async saveMeditationSession(
    userId,
    data
  ) {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      // Create reference to the user's meditation timer collection
      const userRef = doc(db, 'MeditationUsers', userId);
      const timerCollectionRef = collection(userRef, 'MeditationTimer');

      const sessionData = {
        selectedMinutes: data.selectedMinutes.toString(),
        startedAt: Timestamp.fromDate(data.startTime),
        stoppedAt: Timestamp.fromDate(data.endTime),
        actualDuration: data.actualDuration,
        status: data.wasCompleted ? 'completed' : 'incomplete',
        type: data.type,
        createdAt: serverTimestamp(), // Add this for sorting/querying
      };

      const docRef = await addDoc(timerCollectionRef, sessionData);
      console.log('Meditation session saved successfully:', docRef.id);
      return docRef;
    } catch (error) {
      console.error('TimerService Error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Get meditation session history for a user
   * Collection: MeditationUsers/{userId}/MeditationTimer
   */
  static async getMeditationHistory(userId, limitCount = 50) {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      const userRef = doc(db, 'MeditationUsers', userId);
      const timerCollectionRef = collection(userRef, 'MeditationTimer');
      
      const q = query(
        timerCollectionRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const sessions = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          selectedMinutes: data.selectedMinutes,
          startedAt: data.startedAt?.toDate(),
          stoppedAt: data.stoppedAt?.toDate(),
          actualDuration: data.actualDuration,
          status: data.status,
          type: data.type,
          createdAt: data.createdAt?.toDate(),
        });
      });

      return sessions;
    } catch (error) {
      console.error('Error fetching meditation history:', error);
      throw error;
    }
  }

  /**
   * Get meditation sessions by type
   * Collection: MeditationUsers/{userId}/MeditationTimer
   */
  static async getSessionsByType(userId, meditationType, limitCount = 20) {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      const userRef = doc(db, 'MeditationUsers', userId);
      const timerCollectionRef = collection(userRef, 'MeditationTimer');
      
      const q = query(
        timerCollectionRef,
        where('type', '==', meditationType),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const sessions = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sessions.push({
          id: doc.id,
          selectedMinutes: data.selectedMinutes,
          startedAt: data.startedAt?.toDate(),
          stoppedAt: data.stoppedAt?.toDate(),
          actualDuration: data.actualDuration,
          status: data.status,
          type: data.type,
          createdAt: data.createdAt?.toDate(),
        });
      });

      return sessions;
    } catch (error) {
      console.error('Error fetching sessions by type:', error);
      throw error;
    }
  }

  /**
   * Get user meditation statistics
   * Collection: MeditationUsers/{userId}/MeditationTimer
   */
  static async getUserStats(userId) {
    try {
      if (!userId) {
        throw new Error('No user ID provided');
      }

      const sessions = await this.getMeditationHistory(userId, 1000); // Get all sessions for stats

      const stats = {
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.status === 'completed').length,
        totalMinutes: sessions.reduce((sum, s) => sum + s.actualDuration, 0),
        averageSessionLength: 0,
        favoriteType: null,
        typeBreakdown: {},
        currentStreak: 0,
        longestStreak: 0,
      };

      // Calculate average session length
      if (stats.totalSessions > 0) {
        stats.averageSessionLength = Math.round(stats.totalMinutes / stats.totalSessions);
      }

      // Calculate type breakdown
      sessions.forEach(session => {
        if (!stats.typeBreakdown[session.type]) {
          stats.typeBreakdown[session.type] = 0;
        }
        stats.typeBreakdown[session.type]++;
      });

      // Find favorite type
      if (Object.keys(stats.typeBreakdown).length > 0) {
        stats.favoriteType = Object.keys(stats.typeBreakdown).reduce((a, b) => 
          stats.typeBreakdown[a] > stats.typeBreakdown[b] ? a : b
        );
      }

      // Calculate streaks (simplified - you might want to implement more sophisticated streak logic)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      // Sort sessions by date
      const sortedSessions = sessions
        .filter(s => s.status === 'completed')
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

      for (let i = 0; i < sortedSessions.length; i++) {
        const sessionDate = new Date(sortedSessions[i].startedAt);
        const sessionDateStr = sessionDate.toDateString();

        if (i === 0) {
          // Check if first session is today or yesterday
          const todayStr = today.toDateString();
          const yesterdayStr = yesterday.toDateString();
          
          if (sessionDateStr === todayStr || sessionDateStr === yesterdayStr) {
            tempStreak = 1;
            if (sessionDateStr === todayStr) {
              currentStreak = 1;
            }
          }
        } else {
          const prevSessionDate = new Date(sortedSessions[i - 1].startedAt);
          const prevSessionDateStr = prevSessionDate.toDateString();
          
          // Check if consecutive days
          const dayDiff = Math.abs(sessionDate - prevSessionDate) / (1000 * 60 * 60 * 24);
          
          if (dayDiff <= 1) {
            tempStreak++;
            if (i === 0 || sessionDateStr === today.toDateString()) {
              currentStreak = tempStreak;
            }
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }

      stats.currentStreak = currentStreak;
      stats.longestStreak = Math.max(longestStreak, tempStreak);

      return stats;
    } catch (error) {
      console.error('Error calculating user stats:', error);
      throw error;
    }
  }

  /**
   * Delete a meditation session
   * Collection: MeditationUsers/{userId}/MeditationTimer
   */
  static async deleteSession(userId, sessionId) {
    try {
      if (!userId || !sessionId) {
        throw new Error('User ID and Session ID are required');
      }

      const userRef = doc(db, 'MeditationUsers', userId);
      const sessionRef = doc(userRef, 'MeditationTimer', sessionId);
      
      await sessionRef.delete();
      console.log('Session deleted successfully:', sessionId);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
} 