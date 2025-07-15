import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Animated, 
  FlatList,
  Modal,
  TextInput,
  Alert,
  useColorScheme
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, doc, serverTimestamp, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuth } from '../../src/context/AuthContext';
import { StreakService } from '../../src/services/streakService';
import Colors from '../../src/constants/Colors';

// Check-in Button Component
function CheckInButton({ isCheckedIn, onCheckIn, onCheckOut, theme }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCheckedIn) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scale.setValue(1);
    }
  }, [isCheckedIn, scale]);

  return (
    <View style={styles.center}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[styles.button, isCheckedIn ? styles.checkedIn : styles.checkedOut, { backgroundColor: theme.primary }]}
          onPress={isCheckedIn ? onCheckOut : onCheckIn}
          accessibilityRole="button"
          accessibilityLabel={isCheckedIn ? 'Check out' : 'Check in'}
        >
          <Text style={styles.buttonText}>{isCheckedIn ? 'Check Out' : 'Check In'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// Session Info Component
function SessionInfo({ checkInTime, meditationType, theme }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - checkInTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [checkInTime]);

  function formatElapsed(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  return (
    <View style={styles.sessionInfoContainer}>
      <Text style={styles.sessionLabel}>Daily session in progress</Text>
      <Text style={styles.sessionType}>{meditationType || 'Daily App Session'}</Text>
      <Text style={styles.sessionTime}>Started: {new Date(checkInTime).toLocaleTimeString()}</Text>
      <Text style={styles.sessionElapsed}>Elapsed: {formatElapsed(elapsed)}</Text>
    </View>
  );
}

// History List Component
function HistoryList({ history, currentStreak, theme }) {
  function formatDuration(start, end) {
    if (!end) return '--:--';
    const sec = Math.floor((end - start) / 1000);
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyType}>{item.meditationType || 'Daily App Session'}</Text>
      <Text style={styles.historyTime}>{new Date(item.checkInTime).toLocaleString()}</Text>
      <Text style={styles.historyDuration}>Duration: {formatDuration(item.checkInTime, item.checkOutTime)}</Text>
      {item.mood && (
        <Text style={styles.historyMood}>
          Mood: {item.mood === 'happy' ? '😊' : item.mood === 'sad' ? '😔' : '😐'}
        </Text>
      )}
      {item.note && <Text style={styles.historyNote}>{item.note}</Text>}
    </View>
  );

  return (
    <View style={styles.historyContainer}>
      <Text style={styles.historyHeader}>Session History</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        ListEmptyComponent={<Text style={styles.historyEmpty}>No sessions yet.</Text>}
        style={{ maxHeight: 320 }}
      />
      <View style={styles.streakSection}>
        <Text style={styles.streakLabel}>🔥 Day Streak</Text>
        <Text style={styles.streakValue}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</Text>
        <Text style={styles.streakSubtext}>
          {currentStreak === 0 
            ? 'Complete check-in & check-out to start your streak!' 
            : currentStreak === 1 
            ? 'Great start! Keep going tomorrow!' 
            : `Amazing! You're on fire! 🔥`
          }
        </Text>
        {currentStreak > 0 && (
          <Text style={styles.encouragement}>
            {currentStreak >= 7 ? '🏆 Week warrior!' : 
             currentStreak >= 3 ? '⭐ Getting consistent!' : 
             '💪 Building the habit!'}
          </Text>
        )}
      </View>
    </View>
  );
}

// Mood Modal Component
function MoodModal({ visible, onClose, onSubmit, theme }) {
  const [selectedMood, setSelectedMood] = useState('');
  const [reflection, setReflection] = useState('');
  const MOODS = ['😊', '😌', '😐', '😔', '😢'];

  function handleSubmit() {
    if (selectedMood) {
      const moodMap = {
        '😊': 'happy',
        '😌': 'happy',
        '😐': 'neutral',
        '😔': 'sad',
        '😢': 'sad'
      };
      onSubmit(moodMap[selectedMood], reflection);
    }
    setSelectedMood('');
    setReflection('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { backgroundColor: theme.card }]}>
          <Text style={styles.modalTitle}>How was your session?</Text>
          <View style={styles.moodRow}>
            {MOODS.map(mood => (
              <TouchableOpacity
                key={mood}
                onPress={() => setSelectedMood(mood)}
                style={[styles.moodBtn, selectedMood === mood && styles.moodBtnSelected]}
                accessibilityRole="button"
                accessibilityLabel={`Mood: ${mood}`}
              >
                <Text style={styles.moodEmoji}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.modalInput, { backgroundColor: theme.input, color: theme.text }]}
            placeholder="Reflection (optional)"
            placeholderTextColor={theme.textSecondary}
            value={reflection}
            onChangeText={setReflection}
            multiline
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.modalCancelBtn, { backgroundColor: theme.buttonSecondary }]}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Main Check-in Screen
function NewCheckInScreen() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showMood, setShowMood] = useState(false);
  
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Load history from Firebase
  const loadHistoryFromFirebase = async () => {
    if (!user) {
      setHistory([]);
      return;
    }

    try {
      console.log('📚 Loading check-in history from Firebase for user:', user.uid);
      
      const userCheckInsRef = collection(db, 'MeditationUsers', user.uid, 'checkIns');
      const q = query(
        userCheckInsRef,
        where('isComplete', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('📄 Found', querySnapshot.size, 'completed check-ins');
      
      const firebaseHistory = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const checkedInTimestamp = data.checkedInAt?.toMillis() || Date.now();
        const checkedOutTimestamp = data.checkedOutAt?.toMillis() || Date.now();
        
        let moodEmoji = 'neutral';
        if (data.mood?.checkout) {
          if (data.mood.checkout >= 4) moodEmoji = 'happy';
          else if (data.mood.checkout <= 2) moodEmoji = 'sad';
          else moodEmoji = 'neutral';
        }
        
        return {
          id: doc.id,
          checkInTime: checkedInTimestamp,
          checkOutTime: checkedOutTimestamp,
          meditationType: data.meditationType || 'Daily App Check-in',
          mood: moodEmoji,
          note: data.notes || '',
          isComplete: true
        };
      }).sort((a, b) => b.checkInTime - a.checkInTime);
      
      setHistory(firebaseHistory);
      AsyncStorage.setItem('CHECKIN_HISTORY', JSON.stringify(firebaseHistory));
      
    } catch (error) {
      console.error('❌ Error loading history from Firebase:', error);
      try {
        const data = await AsyncStorage.getItem('CHECKIN_HISTORY');
        if (data) {
          setHistory(JSON.parse(data));
        }
      } catch (storageError) {
        console.error('❌ Error loading from AsyncStorage:', storageError);
      }
    }
  };

  // Load current streak
  const loadStreak = async () => {
    if (user) {
      try {
        // Check for monthly reset first
        await StreakService.checkAndHandleMonthlyReset(user.uid);
        
        // Load current streak
        const streakStats = await StreakService.getStreakStats(user.uid);
        setCurrentStreak(streakStats.currentStreak);
      } catch (error) {
        console.error('Error loading streak:', error);
      }
    }
  };

  // Load today's session
  const loadTodaysSession = async () => {
    if (!user) return;
    
    try {
      const today = StreakService.getTodayDate();
      const userCheckInsRef = collection(db, 'MeditationUsers', user.uid, 'checkIns');
      const q = query(
        userCheckInsRef,
        where('userId', '==', user.uid),
        where('date', '==', today),
        where('isComplete', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        setIsCheckedIn(true);
        setCheckInTime(data.checkedInAt?.toMillis() || Date.now());
        setCurrentSession({
          id: doc.id,
          checkInTime: data.checkedInAt?.toMillis() || Date.now(),
          meditationType: data.meditationType || 'Daily App Session',
        });
        
        console.log('📱 Loaded today\'s incomplete session:', doc.id);
      }
    } catch (error) {
      console.error('❌ Error loading today\'s session:', error);
    }
  };

  // Save check-in to Firebase
  const saveCheckInToFirebase = async (session) => {
    if (!user) return;

    try {
      const today = StreakService.getTodayDate();
      const currentMonth = StreakService.getCurrentMonth();
      
      console.log('🔄 Saving check-in to Firebase:', { userId: user.uid, date: today, monthYear: currentMonth });
      
      const checkInData = {
        userId: user.uid,
        date: today,
        checkedInAt: serverTimestamp(),
        checkedOutAt: null,
        mood: {
          checkin: 3 // Default neutral mood (1-5 scale)
        },
        notes: '',
        isComplete: false,
        monthYear: currentMonth
      };

      // Store in MeditationUsers collection with proper structure
      const userCheckInsRef = collection(db, 'MeditationUsers', user.uid, 'checkIns');
      const docRef = await addDoc(userCheckInsRef, checkInData);
      console.log('✅ Check-in saved with ID:', docRef.id);
      
      // Initialize streak system for user if needed
      await StreakService.initializeUserStreak(user.uid);
      
    } catch (error) {
      console.error('❌ Error saving check-in:', error);
    }
  };

  // Update check-out in Firebase
  const updateCheckOutInFirebase = async (session) => {
    if (!user || !session.checkOutTime) return;

    try {
      const today = StreakService.getTodayDate();
      
      console.log('🔄 Updating check-out in Firebase:', { userId: user.uid, date: today });
      
      // Find today's check-in document
      const userCheckInsRef = collection(db, 'MeditationUsers', user.uid, 'checkIns');
      const q = query(
        userCheckInsRef,
        where('userId', '==', user.uid),
        where('date', '==', today),
        where('isComplete', '==', false)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('📄 Found check-in documents:', querySnapshot.size);
      
      if (!querySnapshot.empty) {
        const checkInDoc = querySnapshot.docs[0];
        console.log('📝 Updating document ID:', checkInDoc.id);
        console.log('📝 Document data before update:', checkInDoc.data());
        
        const checkOutData = {
          checkedOutAt: serverTimestamp(),
          mood: {
            checkin: 3, // Keep existing or default
            checkout: session.mood === 'happy' ? 5 : session.mood === 'sad' ? 1 : 3
          },
          notes: session.note || '',
          isComplete: true
        };

        console.log('📝 Updating with data:', checkOutData);
        await updateDoc(checkInDoc.ref, checkOutData);
        console.log('✅ Check-out updated successfully');
        
        // Update streak after completing check-in/check-out
        console.log('🔥 Updating streak...');
        await StreakService.updateStreakAfterComplete(user.uid);
        
        // Load updated streak for UI
        const streakStats = await StreakService.getStreakStats(user.uid);
        console.log('📊 New streak stats:', streakStats);
        setCurrentStreak(streakStats.currentStreak);
        
        // Force reload history to show the completed session
        console.log('🔄 Force reloading history after successful check-out...');
        setTimeout(() => {
          loadHistoryFromFirebase();
        }, 2000); // Longer delay to ensure all Firebase operations complete
        
      } else {
        console.log('❌ No incomplete check-in found for today');
      }
    } catch (error) {
      console.error('❌ Error updating check-out:', error);
    }
  };

  // Check if already checked in today
  const checkIfAlreadyCheckedInToday = async (date) => {
    if (!user) return false;
    
    try {
      const userCheckInsRef = collection(db, 'MeditationUsers', user.uid, 'checkIns');
      const q = query(
        userCheckInsRef,
        where('userId', '==', user.uid),
        where('date', '==', date)
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('❌ Error checking if already checked in today:', error);
      return false;
    }
  };

  // Check-in function
  const handleCheckIn = async () => {
    if (isCheckedIn || !user) return;
    
    const today = StreakService.getTodayDate();
    const hasAlreadyCheckedIn = await checkIfAlreadyCheckedInToday(today);
    
    if (hasAlreadyCheckedIn) {
      Alert.alert('Already Checked In', 'You have already checked in today.');
      return;
    }
    
    const now = Date.now();
    const session = {
      id: now.toString(),
      checkInTime: now,
      meditationType: 'Daily App Session',
    };
    setIsCheckedIn(true);
    setCheckInTime(now);
    setCurrentSession(session);
    await saveCheckInToFirebase(session);
  };

  // Check-out function
  const handleCheckOut = () => {
    if (!isCheckedIn || !currentSession) return;
    const now = Date.now();
    const finishedSession = { ...currentSession, checkOutTime: now };
    setIsCheckedIn(false);
    setCheckInTime(null);
    setCurrentSession(null);
    updateCheckOutInFirebase(finishedSession);
    
    setTimeout(() => {
      setShowMood(true);
    }, 400);
  };

  // Add mood function
  const handleMood = async (mood, reflection) => {
    if (!history.length || !user) return;
    
    console.log('😊 Adding mood:', mood, 'note:', reflection);
    
    try {
      const today = StreakService.getTodayDate();
      
      // Find today's completed check-in document
      const userCheckInsRef = collection(db, 'MeditationUsers', user.uid, 'checkIns');
      const q = query(
        userCheckInsRef,
        where('userId', '==', user.uid),
        where('date', '==', today),
        where('isComplete', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const checkInDoc = querySnapshot.docs[0];
        console.log('📝 Updating mood for document:', checkInDoc.id);
        
        const moodUpdate = {
          mood: {
            checkin: 3, // Keep existing
            checkout: mood === 'happy' ? 5 : mood === 'sad' ? 1 : 3
          },
          notes: reflection || ''
        };
        
        await updateDoc(checkInDoc.ref, moodUpdate);
        console.log('✅ Mood updated successfully');
        
        // Reload history to show updated mood
        setTimeout(() => {
          loadHistoryFromFirebase();
        }, 1000);
      } else {
        console.log('❌ No completed check-in found for today to update mood');
      }
    } catch (error) {
      console.error('❌ Error updating mood:', error);
    }
    
    setShowMood(false);
  };

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadHistoryFromFirebase();
      loadStreak();
      loadTodaysSession();
    }
  }, [user]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Feather name="arrow-left" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Daily Check In</Text>
      </View>
      
      {!isCheckedIn && <Text style={[styles.status, { color: theme.textSecondary }]}>Start your daily app session</Text>}
      
      <CheckInButton 
        isCheckedIn={isCheckedIn} 
        onCheckIn={handleCheckIn} 
        onCheckOut={handleCheckOut} 
        theme={theme}
      />
      
      {isCheckedIn && checkInTime && (
        <SessionInfo 
          checkInTime={checkInTime} 
          meditationType={currentSession?.meditationType} 
          theme={theme}
        />
      )}
      
      <HistoryList history={history} currentStreak={currentStreak} theme={theme} />
      
      <MoodModal 
        visible={showMood} 
        onClose={() => setShowMood(false)} 
        onSubmit={handleMood} 
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    // backgroundColor: '#000' 
  },
  header: { 
    height: 60, 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative', 
    marginTop: 24, 
    marginBottom: 8 
  },
  backButton: { 
    position: 'absolute', 
    left: 24, 
    top: 0, 
    height: 60, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: 'bold', 
    textAlign: 'center'
  },
  status: { 
    color: '#888', 
    fontSize: 18, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  center: { 
    alignItems: 'center', 
    marginVertical: 32 
  },
  button: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  checkedIn: {
    backgroundColor: '#2dd36f',
  },
  checkedOut: {
    backgroundColor: '#3880ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  sessionInfoContainer: { 
    alignItems: 'center', 
    marginBottom: 24 
  },
  sessionLabel: { 
    color: '#888', 
    fontSize: 18, 
    marginBottom: 4 
  },
  sessionType: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  sessionTime: { 
    color: '#bbb', 
    fontSize: 16, 
    marginBottom: 2 
  },
  sessionElapsed: { 
    color: '#2dd36f', 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  historyContainer: { 
    marginTop: 24, 
    paddingHorizontal: 16 
  },
  historyHeader: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 12 
  },
  historyItem: { 
    backgroundColor: '#222', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12 
  },
  historyType: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  historyTime: { 
    color: '#bbb', 
    fontSize: 14, 
    marginBottom: 2 
  },
  historyDuration: { 
    color: '#2dd36f', 
    fontSize: 16, 
    marginBottom: 2 
  },
  historyMood: { 
    color: '#ffd700', 
    fontSize: 16 
  },
  historyNote: { 
    color: '#aaa', 
    fontSize: 15, 
    fontStyle: 'italic' 
  },
  historyEmpty: { 
    color: '#888', 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 32 
  },
  streakSection: { 
    marginTop: 16, 
    alignItems: 'center', 
    backgroundColor: '#1a1a1a', 
    borderRadius: 12, 
    padding: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  streakLabel: { 
    color: '#aaa', 
    fontSize: 14, 
    marginBottom: 4 
  },
  streakValue: { 
    color: '#2dd36f', 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  streakSubtext: { 
    color: '#666', 
    fontSize: 12, 
    textAlign: 'center' 
  },
  encouragement: { 
    color: '#ffd700', 
    fontSize: 11, 
    textAlign: 'center', 
    marginTop: 4, 
    fontWeight: 'bold' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modal: { 
    backgroundColor: '#222', 
    borderRadius: 16, 
    padding: 24, 
    width: 320, 
    alignItems: 'center' 
  },
  modalTitle: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16 
  },
  moodRow: { 
    flexDirection: 'row', 
    marginBottom: 16 
  },
  moodBtn: { 
    marginHorizontal: 8, 
    padding: 8, 
    borderRadius: 8, 
    backgroundColor: '#333' 
  },
  moodBtnSelected: { 
    backgroundColor: '#2dd36f' 
  },
  moodEmoji: { 
    fontSize: 32 
  },
  modalInput: { 
    backgroundColor: '#333', 
    color: '#fff', 
    borderRadius: 8, 
    padding: 12, 
    width: '100%', 
    minHeight: 60, 
    marginBottom: 16 
  },
  modalActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%' 
  },
  modalCancelBtn: { 
    flex: 1, 
    marginRight: 8, 
    backgroundColor: '#444', 
    borderRadius: 8, 
    padding: 12, 
    alignItems: 'center' 
  },
  modalSaveBtn: { 
    flex: 1, 
    marginLeft: 8, 
    backgroundColor: '#2dd36f', 
    borderRadius: 8, 
    padding: 12, 
    alignItems: 'center' 
  },
  modalCancelText: { 
    color: '#fff', 
    fontSize: 16 
  },
  modalSaveText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

export default NewCheckInScreen; 