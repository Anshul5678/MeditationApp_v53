import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import Colors from '../../../src/constants/Colors';
import { TeachersService } from '../../../src/services/teachersService';
import { CoursesService } from '../../../src/services/coursesService';
import { TracksService } from '../../../src/services/tracksService';
import { EventsService } from '../../../src/services/eventsService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../src/services/firebase';

export default function TeacherProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Content state
  const [tracks, setTracks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [events, setEvents] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);

  const tabs = ['Home', 'Tracks', 'Events', 'About'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (id) {
      fetchTeacherData();
    }
  }, [id]);

  useEffect(() => {
    if (user && teacher) {
      checkFollowStatus();
    }
  }, [user, teacher]);

  const fetchTeacherData = async () => {
    if (!id) {
      setError('Teacher ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching teacher data for ID:', id);
      const instructorData = await TeachersService.getInstructorById(id);
      
      if (instructorData) {
        console.log('Teacher data found:', instructorData);
        setTeacher(instructorData);
        
        // Fetch teacher's content
        await Promise.all([
          fetchTeacherTracks(instructorData.uid),
          fetchTeacherCourses(instructorData.uid),
          fetchTeacherEvents(instructorData.uid)
        ]);
      } else {
        console.log('Teacher not found for ID:', id);
        setError('Teacher not found');
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
      setError('Failed to load teacher profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherTracks = async (teacherId) => {
    try {
      setTracksLoading(true);
      console.log('Fetching tracks for teacher:', teacherId);
      const tracksData = await TracksService.getTracksByInstructor(teacherId);
      console.log('Found tracks:', tracksData.length);
      setTracks(tracksData);
    } catch (error) {
      console.error('Error fetching teacher tracks:', error);
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  };

  const fetchTeacherCourses = async (teacherId) => {
    try {
      setCoursesLoading(true);
      console.log('Fetching courses for teacher:', teacherId);
      const coursesData = await CoursesService.getCoursesByInstructor(teacherId);
      console.log('Found courses:', coursesData.length);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchTeacherEvents = async (teacherId) => {
    try {
      setEventsLoading(true);
      console.log('Fetching events for teacher:', teacherId);
      const eventsData = await EventsService.getEventsByInstructor(teacherId);
      console.log('Found events:', eventsData.length);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching teacher events:', error);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      console.log('Checking follow status for user:', user.uid, 'teacher:', teacher.uid);
      const following = await TeachersService.isUserFollowingTeacher(user.uid, teacher.uid);
      console.log('Follow status:', following);
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to log in to follow teachers',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => router.push('/profile')
          }
        ]
      );
      return;
    }

    if (!teacher) return;

    try {
      setFollowLoading(true);
      
      if (isFollowing) {
        console.log('Unfollowing teacher:', teacher.uid);
        await TeachersService.unfollowTeacher(user.uid, teacher.uid);
        setIsFollowing(false);
        Alert.alert('Unfollowed', `You have unfollowed ${teacher.fullName}`);
      } else {
        console.log('Following teacher:', teacher.uid);
        await TeachersService.followTeacher(user.uid, teacher.uid);
        setIsFollowing(true);
        Alert.alert('Following', `You are now following ${teacher.fullName}`);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Home':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Specialties</Text>
            {teacher?.tags && teacher.tags.length > 0 ? (
              teacher.tags.map((tag, index) => (
                <View key={index} style={[styles.specialtyCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.specialtyText, { color: theme.text }]}>{tag}</Text>
                </View>
              ))
            ) : (
              <View style={[styles.specialtyCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.specialtyText, { color: theme.textSecondary }]}>
                  No specialties listed
                </Text>
              </View>
            )}
          </View>
        );

      case 'Tracks':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Tracks</Text>
            {tracksLoading ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : tracks.length > 0 ? (
              tracks.map((track) => (
                <TouchableOpacity
                  key={track.id}
                  style={[styles.contentItem, { backgroundColor: theme.card }]}
                  onPress={() => router.push(`/meditation/play/${track.id}`)}
                >
                  <View style={styles.contentInfo}>
                    <Text style={[styles.contentTitle, { color: theme.text }]}>
                      {track.title}
                    </Text>
                    <Text style={[styles.contentDuration, { color: theme.textSecondary }]}>
                      {track.duration} min
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={24} color={theme.tint} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noContent, { color: theme.textSecondary }]}>
                No tracks available
              </Text>
            )}
          </View>
        );

      case 'Events':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Events</Text>
            {eventsLoading ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : events.length > 0 ? (
              events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.contentItem, { backgroundColor: theme.card }]}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <View style={styles.contentInfo}>
                    <Text style={[styles.contentTitle, { color: theme.text }]}>
                      {event.title}
                    </Text>
                    <Text style={[styles.contentDuration, { color: theme.textSecondary }]}>
                      {event.type} • {event.date}
                    </Text>
                  </View>
                  <Ionicons name="calendar" size={24} color={theme.tint} />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noContent, { color: theme.textSecondary }]}>
                No events available
              </Text>
            )}
          </View>
        );

      case 'About':
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
            <Text style={[styles.bioText, { color: theme.text }]}>
              {teacher?.bio || 'No bio available'}
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Experience</Text>
            <Text style={[styles.experienceText, { color: theme.text }]}>
              {teacher?.experienceLevel || 'Not specified'}
            </Text>

            {teacher?.location && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
                <Text style={[styles.locationText, { color: theme.text }]}>
                  {teacher.location}
                </Text>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Stats</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {teacher?.followers?.length || 0}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Followers
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {tracks.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Tracks
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {courses.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Courses
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {events.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Events
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading teacher profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.tint }]}
            onPress={fetchTeacherData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacher) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="person" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>Teacher not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Teacher Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {teacher.profileImageUrl ? (
              <Image source={{ uri: teacher.profileImageUrl }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.tint }]}>
                <Text style={styles.profileImageText}>
                  {teacher.fullName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.teacherName, { color: theme.text }]}>
              {teacher.fullName}
            </Text>
            <Text style={[styles.teacherLocation, { color: theme.textSecondary }]}>
              {teacher.location || 'Location not specified'}
            </Text>
            <Text style={[styles.followersText, { color: theme.textSecondary }]}>
              {teacher.followers?.length || 0} followers
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isFollowing ? theme.cardSecondary : theme.tint,
                borderColor: theme.tint,
              }
            ]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? theme.tint : '#fff'} />
            ) : (
              <Text style={[
                styles.followButtonText,
                { color: isFollowing ? theme.tint : '#fff' }
              ]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: theme.tint }
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? theme.tint : theme.textSecondary }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  teacherLocation: {
    fontSize: 16,
    marginBottom: 4,
  },
  followersText: {
    fontSize: 14,
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  specialtyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  specialtyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentDuration: {
    fontSize: 14,
  },
  noContent: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  experienceText: {
    fontSize: 16,
    marginBottom: 24,
  },
  locationText: {
    fontSize: 16,
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 