import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  useColorScheme,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../src/constants/Colors';
import { TracksService } from '../../src/services/tracksService';
import { CoursesService } from '../../src/services/coursesService';
import { TeachersService } from '../../src/services/teachersService';
import { useAuth } from '../../src/context/AuthContext';
import TeacherCard from '../../src/components/teachers/TeacherCard';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../src/services/firebase';

const TABS = ['Tracks', 'Courses', 'Teachers'];

function MeditationScreen() {
  const [activeTab, setActiveTab] = useState('Tracks');
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();
  
  const [teachers, setTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [errorTeachers, setErrorTeachers] = useState(null);
  const [followingTeacherIds, setFollowingTeacherIds] = useState([]);
  const [followLoadingId, setFollowLoadingId] = useState(null);

  const [tracks, setTracks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadFollowingTeacherIds(user.uid);
      } else {
        setFollowingTeacherIds([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchTracks();
    fetchCourses();
  }, []);



  const fetchTeachers = async () => {
    try {
      setLoadingTeachers(true);
      setErrorTeachers(null);
      const instructors = await TeachersService.getInstructors();
      setTeachers(instructors);
    } catch (error) {
      setErrorTeachers('Failed to load teachers');
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const loadFollowingTeacherIds = async (userId) => {
    try {
      const followingIds = await TeachersService.getUserFollowingTeacherIds(userId);
      setFollowingTeacherIds(followingIds);
    } catch (error) {
      // ignore
    }
  };



  const handleFollow = async (teacher) => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to log in to follow teachers',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/profile') }
        ]
      );
      return;
    }
    try {
      setFollowLoadingId(teacher.uid);
      if (followingTeacherIds.includes(teacher.uid)) {
        await TeachersService.unfollowTeacher(user.uid, teacher.uid);
        setFollowingTeacherIds(prev => prev.filter(id => id !== teacher.uid));
      } else {
        await TeachersService.followTeacher(user.uid, teacher.uid);
        setFollowingTeacherIds(prev => [...prev, teacher.uid]);
      }
    } catch (error) {
      // ignore
    } finally {
      setFollowLoadingId(null);
    }
  };

  const handleTeacherPress = (teacher) => {
    router.push({ pathname: '/meditation/teacher/[id]', params: { id: teacher.uid } });
  };



  const renderTeachers = () => {
    if (loadingTeachers) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading teachers...</Text>
        </View>
      );
    }
    if (errorTeachers) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>{errorTeachers}</Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {teachers.length > 0 ? (
          teachers.map((teacher) => (
            <TeacherCard
              key={teacher.uid}
              teacher={teacher}
              theme={theme}
              onFollow={() => handleFollow(teacher)}
              onPress={() => handleTeacherPress(teacher)}
              isFollowing={followingTeacherIds.includes(teacher.uid)}
              followLoading={followLoadingId === teacher.uid}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No teachers found</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const handleTabPress = (tab) => {
    setActiveTab(tab);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)');
    }
  };



  // Fetch tracks from Firebase
  const fetchTracks = async () => {
    setIsLoadingTracks(true);
    try {
      // Get all tracks from Firebase
      const allTracks = await TracksService.getAllTracks();
      
      // Process tracks to add instructor info and access status
      const processedTracks = await Promise.all(
        allTracks.map(async (track) => {
          // Check if user can access this track
          const canPlay = await TracksService.canAccessTrack(track.id, user?.uid);
          

          
          return {
            ...track,
            instructor: { 
              name: track.instructorName || 'Unknown Instructor',
              avatar: track.instructorAvatar || '',
            },
            canPlay,
            lessonImageUrl: track.lessonImageUrl || track.imageUrl || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300',
          };
        })
      );
      
      setTracks(processedTracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setTracks([]);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const fetchCourses = async () => {
    setIsLoadingCourses(true);
    try {
      // Get all courses from Firebase
      const allCourses = await CoursesService.getAllCourses();
      
      // Process courses to format data
      const processedCourses = await Promise.all(
        allCourses.map(async (course) => {
          // Get instructor info if instructorId exists
          let author = 'Unknown Author';
          if (course.instructorId) {
            try {
              const instructorInfo = await CoursesService.getInstructorInfo(course.instructorId);
              author = instructorInfo ? 
                (instructorInfo.name || instructorInfo.fullName || 'Unknown Author') : 
                'Unknown Author';
            } catch (error) {
              console.error('Error fetching instructor info:', error);
            }
          }
          
          return {
            id: course.id,
            title: course.title || 'Untitled Course',
            author,
            rating: course.rating || course.averageRating || 0,
            type: course.category || 'Course',
            duration: course.duration || (course.courseDays ? `${course.courseDays} days` : 'N/A'),
            isPlus: !course.isFree,
            image: course.imageUrl || course.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
            points: course.points || 0,
          };
        })
      );
      
      setCourses(processedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleTrackPress = (track) => {
    if (!track.canPlay) {
      if (!user) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to access this content.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => {
              // Navigate to sign in screen or show sign in modal
              console.log('Navigate to sign in');
            }}
          ]
        );
      } else if (track.courseId) {
        Alert.alert(
          'Course Enrollment Required',
          'This content is part of a course. Please enroll to access.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Course', onPress: () => {
              router.push(`/courses/${track.courseId}`);
            }}
          ]
        );
      } else {
        Alert.alert(
          'Premium Content',
          'This content requires a premium subscription.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {
              // Navigate to subscription screen
              console.log('Navigate to subscription');
            }}
          ]
        );
      }
      return;
    }

    // Navigate to track player
    router.push(`/meditation/play/${track.id}?courseId=${track.courseId || ''}&lessonId=${track.id}`);
  };

  const handleCoursePress = (course) => {
    router.push(`/courses/${course.id}`);
  };



  const formatFollowers = (followers) => {
    if (followers >= 1000) return `${Math.round(followers / 1000)}k`;
    return followers.toString();
  };

  const renderTracks = () => {
    if (isLoadingTracks) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading tracks...
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {tracks.map((track) => (
          <View key={track.id} style={[styles.trackCard, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={styles.trackContent}
              onPress={() => handleTrackPress(track)}
              activeOpacity={0.7}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: track.lessonImageUrl }}
                  style={styles.trackImage}
                  resizeMode="cover"
                />
                {!track.canPlay && (
                  <View style={[styles.lockBadge, { backgroundColor: theme.plus }]}>
                    <Feather name="lock" size={12} color="#fff" />
                    <Text style={styles.lockText}>
                      {track.courseId ? 'Course' : 'Premium'}
                    </Text>
                  </View>
                )}
                {track.isFree && (
                  <View style={[styles.freeBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.freeText}>FREE</Text>
                  </View>
                )}
              </View>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackTitle, { color: theme.text }]} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={[styles.trackInstructor, { color: theme.textSecondary }]} numberOfLines={1}>
                  {track.instructor?.name || 'Unknown Instructor'}
                </Text>
                <View style={styles.trackMetadata}>
                  <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                  <Text style={[styles.trackDuration, { color: theme.textSecondary }]}>
                    {track.duration} min
                  </Text>
                  {track.playCount > 0 && (
                    <>
                      <Ionicons name="play-outline" size={16} color={theme.textSecondary} />
                      <Text style={[styles.trackPlays, { color: theme.textSecondary }]}>
                        {track.playCount}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            

          </View>
        ))}
      </ScrollView>
    );
  };

  const renderCourses = () => {
    if (isLoadingCourses) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading courses...
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>All Courses</Text>
        {courses.map(course => (
          <TouchableOpacity
            key={course.id}
            style={[styles.courseCard, { backgroundColor: theme.card }]}
            onPress={() => handleCoursePress(course)}
            activeOpacity={0.7}
          >
            <View style={styles.courseImageWrapper}>
              <Image source={{ uri: course.image }} style={styles.courseImage} resizeMode="cover" />
              {course.isPlus && (
                <View style={[styles.plusBadge, { backgroundColor: theme.plus }]}>
                  <Text style={styles.plusText}>Plus</Text>
                </View>
              )}
            </View>
            <View style={styles.courseInfo}>
              <View style={styles.courseMetaRow}>
                <Text style={[styles.courseRating, { color: theme.text }]}>
                  {course.rating} ★
                </Text>
                <Text style={[styles.courseType, { color: theme.textSecondary }]}>
                  {course.type}
                </Text>
                <Text style={[styles.courseDuration, { color: theme.textSecondary }]}>
                  {course.duration}
                </Text>
              </View>
              <Text style={[styles.courseTitle, { color: theme.text }]} numberOfLines={2}>
                {course.title}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.card }]} onPress={handleBack}>
          <Feather name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Meditation</Text>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.card }]}>
          <Feather name="share-2" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.background }]}>
        <View style={styles.tabRow}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                {
                  borderBottomColor: activeTab === tab ? theme.text : 'transparent',
                }
              ]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? theme.text : theme.textSecondary }
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'Tracks' && renderTracks()}
      {activeTab === 'Courses' && renderCourses()}
      {activeTab === 'Teachers' && renderTeachers()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tabRow: {
    flexDirection: 'row',
    margin: 24,
    marginBottom: 0,
    paddingHorizontal: 16,
  },
  tabButton: {
    marginRight: 24,
    borderBottomWidth: 2,
    paddingBottom: 4,
    minWidth: 60,
  },
  tabText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  // Track styles
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  trackImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  lockBadge: {
    position: 'absolute',
    top: 4,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  freeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  trackInstructor: {
    fontSize: 14,
    marginBottom: 4,
  },
  trackMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackDuration: {
    fontSize: 14,
    marginLeft: 4,
  },
  trackPlays: {
    fontSize: 14,
    marginLeft: 4,
  },
  // Course styles
  courseCard: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  courseImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16/9,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  courseImage: {
    width: '100%',
    height: '100%',
  },
  plusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  courseInfo: {
    padding: 16,
  },
  courseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseRating: {
    fontSize: 15,
    marginRight: 8,
  },
  courseType: {
    fontSize: 14,
    marginRight: 8,
  },
  courseDuration: {
    fontSize: 14,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  courseAuthor: {
    fontSize: 14,
  },
  // Teacher styles
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  teacherAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  teacherLocation: {
    fontSize: 14,
    marginBottom: 2,
  },
  teacherFollowers: {
    fontSize: 13,
  },
  followButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for search and categories
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  categoriesContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default MeditationScreen; 