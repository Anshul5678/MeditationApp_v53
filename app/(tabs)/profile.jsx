import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme,
  StatusBar,
  Switch,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../../src/constants/Colors';
import { useAuth } from '../../src/context/AuthContext';
import SignInModal from '../../src/components/auth/SignInModal';
import SignUpModal from '../../src/components/auth/SignUpModal';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../src/services/firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'expo-router';
import { CourseCard } from '../../src/components/courses/CourseCard';
import { EventsService } from '../../src/services/eventsService';
import { CoursesService } from '../../src/services/coursesService';
import { AuthService } from '../../src/services/authService';
import { StreakService } from '../../src/services/streakService';

const StatsCard = ({ title, value, subtitle, theme }) => (
  <View style={[styles.statsCard, { backgroundColor: theme.card }]}>
    <Text style={[styles.statsValue, { color: theme.tint }]}>
      {value}
    </Text>
    <Text style={[styles.statsTitle, { color: theme.text }]}>
      {title}
    </Text>
    <Text style={[styles.statsSubtitle, { color: theme.textSecondary }]}>
      {subtitle}
    </Text>
  </View>
);

const SettingsItem = ({ icon, title, subtitle, onPress, rightElement, theme }) => (
  <TouchableOpacity
    style={[styles.settingsItem, { backgroundColor: theme.card }]}
    onPress={onPress}
  >
    <View style={styles.settingsItemContent}>
      <View style={[styles.settingsIcon, { backgroundColor: theme.tint + '20' }]}>
        <Feather name={icon} size={20} color={theme.tint} />
      </View>
      <View style={styles.settingsText}>
        <Text style={[styles.settingsTitle, { color: theme.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingsSubtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    {rightElement || <Feather name="chevron-right" size={20} color={theme.textSecondary} />}
  </TouchableOpacity>
);

// Add DayStreakSection component
const DayStreakSection = ({ streakData, theme, styles }) => (
  <View style={[styles.streakSection, { backgroundColor: theme.card, borderColor: theme.border }]}> 
    <Text style={[styles.streakTitle, { color: theme.text }]}>Day Streak</Text>
    <View style={styles.streakRow}>
      <View style={styles.streakItem}>
        <Text style={[styles.streakNumber, { color: theme.tint }]}>{streakData.currentStreak}</Text>
        <Text style={[styles.streakLabel, { color: theme.icon }]}>Current</Text>
      </View>
      <View style={styles.streakItem}>
        <Text style={[styles.streakNumber, { color: theme.tint }]}>{streakData.longestStreak}</Text>
        <Text style={[styles.streakLabel, { color: theme.icon }]}>Longest</Text>
      </View>
      <View style={styles.streakItem}>
        <Text style={[styles.streakNumber, { color: theme.tint }]}>{streakData.totalCompleteDays}</Text>
        <Text style={[styles.streakLabel, { color: theme.icon }]}>Total Days</Text>
      </View>
    </View>
    <Text style={[styles.streakDescription, { color: theme.icon }]}>Complete daily check-in & check-out to build your streak</Text>
    {/* Monthly History */}
    {streakData.monthlyHistory && Object.keys(streakData.monthlyHistory).length > 0 && (
      <View style={styles.historySection}>
        <Text style={[styles.historyTitle, { color: theme.text }]}>Monthly History</Text>
        {Object.values(streakData.monthlyHistory)
          .slice(-3)
          .reverse()
          .map((month, idx) => (
            <View key={idx} style={[styles.historyItem, { borderBottomColor: theme.border }]}> 
              <Text style={[styles.historyMonth, { color: theme.text }]}>{month.month}</Text>
              <Text style={[styles.historyStreak, { color: theme.tint }]}>{month.streak} days</Text>
            </View>
          ))}
      </View>
    )}
  </View>
);

function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user, userProfile, isLoading, signOut } = useAuth();
  const router = useRouter();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(colorScheme === 'dark');
  const [signInModalVisible, setSignInModalVisible] = useState(false);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [enrolledEvents, setEnrolledEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalCompleteDays: 0,
    monthlyHistory: {}
  });

  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const profile = await AuthService.getUserProfile(user.uid);
          setLocalProfile(profile);
        } catch (e) {
          setLocalProfile(null);
        }
      };
      fetchProfile();
      fetchEnrolledContent();
      const fetchStreak = async () => {
        try {
          const data = await StreakService.getStreakData(user.uid);
          setStreakData(data);
        } catch (e) {
          setStreakData({ currentStreak: 0, longestStreak: 0, totalCompleteDays: 0, monthlyHistory: {} });
        }
      };
      fetchStreak();
    } else {
      setLocalProfile(null);
    }
  }, [user]);

  const fetchEnrolledContent = async () => {
    try {
      // Fetch enrolled courses
      const userRef = doc(db, 'MeditationUsers', user.uid);
      const userDoc = await getDoc(userRef);
      let courses = [];
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const enrolledCourseIds = userData.enrolledCourses || [];
        courses = await Promise.all(
          enrolledCourseIds.map(async (courseId) => {
            const course = await CoursesService.getCourseById(courseId);
            return course;
          })
        );
      }
      setEnrolledCourses(courses.filter(Boolean));
      // Fetch enrolled events
      const events = await EventsService.getUserEnrolledEvents(user.uid);
      setEnrolledEvents(events);
    } catch (e) {
      console.error('Error fetching enrolled content', e);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        }}
      ]
    );
  };

  const goToEditProfile = () => router.push('/edit-profile');

  const userStats = userProfile?.stats || {
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    coursesCompleted: 0,
    favoriteTime: 'Not set'
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEnrolledContent();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        
        <View style={styles.authContainer}>
          <View style={styles.authContent}>
            <View style={[styles.authIcon, { backgroundColor: theme.tint + '20' }]}>
              <Feather name="user" size={60} color={theme.tint} />
            </View>
            
            <Text style={[styles.authTitle, { color: theme.text }]}>
              Welcome to Your Profile
            </Text>
            <Text style={[styles.authSubtitle, { color: theme.textSecondary }]}>
              Sign in to track your meditation progress and unlock personalized features
            </Text>
            
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={[styles.authButton, { backgroundColor: theme.tint }]}
                onPress={() => setSignInModalVisible(true)}
              >
                <Text style={styles.authButtonText}>Sign In</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.authButtonOutline, { borderColor: theme.tint }]}
                onPress={() => setSignUpModalVisible(true)}
              >
                <Text style={[styles.authButtonOutlineText, { color: theme.tint }]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        <SignInModal
          visible={signInModalVisible}
          onClose={() => setSignInModalVisible(false)}
          onSwitchToSignUp={() => {
            setSignInModalVisible(false);
            setSignUpModalVisible(true);
          }}
        />
        
        <SignUpModal
          visible={signUpModalVisible}
          onClose={() => setSignUpModalVisible(false)}
          onSwitchToSignIn={() => {
            setSignUpModalVisible(false);
            setSignInModalVisible(true);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.card }]} onPress={goToEditProfile}>
              <Feather name="edit" size={20} color={theme.icon} />
            </TouchableOpacity>
          </View>
          {/* User Info */}
          <View style={styles.userInfo}>
            {localProfile?.profileImageUrl ? (
              <Image
                source={{ uri: localProfile.profileImageUrl }}
                style={styles.userAvatar}
                onError={() => setLocalProfile((prev) => ({ ...prev, profileImageUrl: '' }))}
              />
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: theme.tint }]}> 
                <Text style={styles.userAvatarText}>
                  {(localProfile?.fullName || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.userName, { color: theme.text }]}> 
              {localProfile?.fullName || user?.displayName || user?.email || 'User'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}> 
              {user?.email || 'No email'}
            </Text>
          </View>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <StatsCard
              title="Day Streak"
              value={userStats.currentStreak}
              subtitle="Current streak"
              theme={theme}
            />
            <StatsCard
              title="Courses Enrolled"
              value={enrolledCourses.length}
              subtitle="Courses joined"
              theme={theme}
            />
            <StatsCard
              title="Minutes"
              value={userStats.totalMinutes}
              subtitle="Total meditated"
              theme={theme}
            />
          </View>
        </View>
          {/* My Courses Section */}
          <View style={{ marginTop: 32 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 16 }]}>My Courses</Text>
          {enrolledCourses.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary, marginLeft: 16 }]}>You have not enrolled in any courses yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginTop: 8 }}>
              {enrolledCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  theme={theme}
                  style={{ marginRight: 12, width: 260 }}
                  onPress={() => router.push('/courses/' + course.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
        {/* My Events Section */}
        <View style={{ marginTop: 32 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 16 }]}>My Events</Text>
          {enrolledEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary, marginLeft: 16 }]}>You have not enrolled in any events yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16, marginTop: 8 }}>
              {enrolledEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    padding: 16,
                    marginRight: 12,
                    width: 220,
                    justifyContent: 'center',
                  }}
                  onPress={() => router.push('/event/' + event.id)}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }} numberOfLines={2}>{event.title}</Text>
                  <Text style={{ color: theme.textSecondary, marginTop: 4 }}>{event.date} {event.startTime ? `• ${event.startTime}` : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Settings
          </Text>

          {/* <SettingsItem
            icon="bell"
            title="Notifications"
            subtitle="Manage reminder settings"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.border, true: theme.tint + '40' }}
                thumbColor={notificationsEnabled ? theme.tint : theme.textSecondary}
              />
            }
            theme={theme}
          />

          <SettingsItem
            icon="moon"
            title="Dark Mode"
            subtitle="Toggle app appearance"
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: theme.border, true: theme.tint + '40' }}
                thumbColor={darkModeEnabled ? theme.tint : theme.textSecondary}
              />
            }
            theme={theme}
          />

          <SettingsItem
            icon="volume-2"
            title="Sound Settings"
            subtitle="Adjust meditation sounds"
            theme={theme}
          />

          <SettingsItem
            icon="download"
            title="Downloads"
            subtitle="Manage offline content"
            theme={theme}
          /> */}

          <SettingsItem
            icon="bookmark"
            title="Saved Content"
            subtitle="Your saved meditations"
            onPress={() => router.push('/saved')}
            theme={theme}
          />

          {/* Add Day Streaks settings item */}
          <SettingsItem
            icon="trending-up"
            title="Day Streaks"
            subtitle="View your streak history"
            onPress={() => router.push('/day-streaks')}
            theme={theme}
          />

          {/* <SettingsItem
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help and contact us"
            theme={theme}
          /> */}

          <SettingsItem
            icon="log-out"
            title="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
            theme={theme}
          />
        </View>
        
        {/* Day Streak Section moved here */}
      
      </ScrollView>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  userAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  settingsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingsItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  authContent: {
    alignItems: 'center',
    width: '100%',
  },
  authIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  authSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  authButtons: {
    width: '100%',
    gap: 16,
  },
  authButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authButtonOutline: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  editAvatarButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  editAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  modalButton: {
    width: '45%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    marginLeft: 16,
  },
  streakSection: {
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  streakTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  streakLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  streakDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  historySection: {
    marginTop: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyMonth: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyStreak: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProfileScreen; 