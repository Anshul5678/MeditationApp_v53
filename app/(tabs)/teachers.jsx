import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { TeachersService } from '../../src/services/teachersService';
import { CoursesService } from '../../src/services/coursesService';
import { EventsService } from '../../src/services/eventsService';
import { useAuth } from '../../src/context/AuthContext';
import TeacherCard from '../../src/components/teachers/TeacherCard';
import { CourseCard } from '../../src/components/courses/CourseCard';

export default function TeachersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();

  // State
  const [teachers, setTeachers] = useState([]);
  const [following, setFollowing] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [myTeachers, setMyTeachers] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [retreats, setRetreats] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Fetch all data
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Teachers
      const teachersData = await TeachersService.getInstructors();
      setTeachers(teachersData);
      // Following
      if (user) {
        const followingIds = await TeachersService.getUserFollowingTeacherIds(user.uid);
        const followingMap = {};
        followingIds.forEach(id => { followingMap[id] = true; });
        setFollowing(followingMap);
        // My Teachers
        const myTeachersData = teachersData.filter(t => followingMap[t.uid]);
        setMyTeachers(myTeachersData);
      } else {
        setFollowing({});
        setMyTeachers([]);
      }
      // Events
      const allEvents = await EventsService.getAllEvents();
      // Live Events
      const now = new Date();
      const live = allEvents.filter(e => e.type === 'live' && isEventLive(e, now));
      setLiveEvents(live);
      // Retreats
      const retreatsData = allEvents.filter(e => (e.type || '').toLowerCase() === 'retreat');
      setRetreats(retreatsData);
      // Featured Events (could be a flag or just show all events for now)
      setFeaturedEvents(allEvents.slice(0, 10));
      // Featured Courses - use getAllCourses instead of getFeaturedCourses to avoid index issue
      const allCourses = await CoursesService.getAllCourses();
      setFeaturedCourses(allCourses.slice(0, 10)); // Show first 10 courses
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll();
  }, [user]);

  // Follow/unfollow logic
  const handleFollow = async (teacherId, isCurrentlyFollowing) => {
    if (!user) return;
    setFollowLoading(prev => ({ ...prev, [teacherId]: true }));
    try {
      if (isCurrentlyFollowing) {
        await TeachersService.unfollowTeacher(user.uid, teacherId);
        setFollowing(prev => ({ ...prev, [teacherId]: false }));
      } else {
        await TeachersService.followTeacher(user.uid, teacherId);
        setFollowing(prev => ({ ...prev, [teacherId]: true }));
      }
      // Refresh my teachers
      setMyTeachers(teachers.filter(t => following[t.uid] || t.uid === teacherId && !isCurrentlyFollowing));
    } catch (e) {
      // Optionally show error
    } finally {
      setFollowLoading(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  // Helpers
  function isEventLive(event, now = new Date()) {
    if (!event.date || !event.startTime || !event.endTime) return false;
    const start = new Date(`${event.date}T${event.startTime}`);
    const end = new Date(`${event.date}T${event.endTime}`);
    return now >= start && now <= end;
  }

  // Filter teachers by search
  const filteredTeachers = teachers.filter(t =>
    t.fullName.toLowerCase().includes(search.toLowerCase())
  );

  // Render teacher avatar (story)
  const renderTeacherAvatar = (teacher) => (
    <TouchableOpacity
      key={teacher.uid}
      style={styles.avatarContainer}
      onPress={() => router.push('/meditation/teacher/' + teacher.uid)}
      activeOpacity={0.85}
    >
      {teacher.profileImageUrl ? (
        <Image source={{ uri: teacher.profileImageUrl }} style={[styles.avatar, { borderColor: theme.tint }]} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}> 
          <Text style={styles.avatarInitial}>
            {(teacher.fullName || teacher.name || 'U')[0].toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={[styles.avatarName, { color: theme.text }]} numberOfLines={1}>
        {teacher.fullName.length > 12 ? teacher.fullName.substring(0, 12) + '...' : teacher.fullName}
      </Text>
    </TouchableOpacity>
  );

  // Render event card (with cover image like course card)
  const renderEventCard = (event) => (
    <TouchableOpacity
      key={event.id}
      style={[styles.eventCard, { backgroundColor: theme.card }]}
      onPress={() => router.push('/event/' + event.id)}
      activeOpacity={0.85}
    >
      {event.coverImage && (
        <Image source={{ uri: event.coverImage }} style={styles.eventCardImage} />
      )}
      <View style={styles.eventCardContent}>
        <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>{event.title}</Text>
        <Text style={[styles.eventDate, { color: theme.textSecondary }]}>{event.date} {event.startTime ? `• ${event.startTime}` : ''}</Text>
        {event.instructorNames && event.instructorNames.length > 0 && (
          <Text style={[styles.eventInstructor, { color: theme.textSecondary }]} numberOfLines={1}>
            with {event.instructorNames.join(', ')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Teachers</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Find your guide to inner peace</Text>
        </View>
        {/* Teacher Avatars (Stories) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll}>
          {filteredTeachers.map(renderTeacherAvatar)}
        </ScrollView>
        {/* Menu Options */}
        <View style={[styles.menuSection, { backgroundColor: theme.card }]}> {/* updated */}
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={() => router.push('/my-teachers')}>
            <Feather name="book" size={20} color={theme.text} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: theme.text }]}>My Teachers</Text>
            <View style={[styles.menuCount, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>{myTeachers.length}</Text></View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={() => router.push('/live-events')}>
            <Feather name="video" size={20} color={theme.text} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: theme.text }]}>Live events</Text>
            <View style={[styles.menuCount, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>{liveEvents.length}</Text></View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: theme.border }]} onPress={() => router.push('/retreats')}>
            <Feather name="home" size={20} color={theme.text} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: theme.text }]}>Retreats</Text>
            <View style={[styles.menuCount, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>{retreats.length}</Text></View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <View style={[styles.menuItem, { borderBottomColor: theme.border }]}>
            <Feather name="award" size={20} color={theme.text} style={{ marginRight: 12 }} />
            <Text style={[styles.menuText, { color: theme.text }]}>Challenges</Text>
            <Text style={[styles.menuComingSoon, { color: theme.textSecondary }]}>Coming soon</Text>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 'auto' }} />
          </View>
        </View>
        {/* Featured Courses */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 16 }]}>Featured Courses</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {featuredCourses.length === 0 ? (
            <Text style={{ color: theme.textSecondary, marginLeft: 16 }}>No featured courses.</Text>
          ) : (
            featuredCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                theme={theme}
                style={{ marginRight: 12, width: 260 }}
                onPress={() => router.push('/courses/' + course.id)}
              />
            ))
          )}
        </ScrollView>
        {/* Featured Events */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 16, marginTop: 32 }]}>Featured Events</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {featuredEvents.length === 0 ? (
            <Text style={{ color: theme.textSecondary, marginLeft: 16 }}>No featured events.</Text>
          ) : (
            featuredEvents.map(renderEventCard)
          )}
        </ScrollView>
        {/* All Teachers List */}
        {/* <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 16, marginTop: 32 }]}>All Teachers</Text>
        <View style={styles.listContainer}>
          {filteredTeachers.length === 0 ? (
            <Text style={{ color: theme.textSecondary, marginLeft: 16 }}>No teachers found.</Text>
          ) : (
            filteredTeachers.map(teacher => (
              <TeacherCard
                key={teacher.uid}
                teacher={teacher}
                theme={theme}
                isFollowing={!!following[teacher.uid]}
                followLoading={!!followLoading[teacher.uid]}
                onFollow={() => handleFollow(teacher.uid, !!following[teacher.uid])}
                onPress={() => router.push('/meditation/teacher/' + teacher.uid)}
              />
            ))
          )}
        </View> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    marginBottom: 12,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  storiesScroll: {
    flexDirection: 'row',
    paddingLeft: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 64,
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: '#181818',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  menuText: {
    fontSize: 17,
    fontWeight: '500',
  },
  menuCount: {
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  menuComingSoon: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingLeft: 16,
    marginBottom: 8,
  },
  eventCard: {
    borderRadius: 14,
    padding: 0,
    marginRight: 12,
    width: 260,
    justifyContent: 'center',
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  eventCardImage: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  eventCardContent: {
    padding: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 13,
    marginBottom: 4,
  },
  eventInstructor: {
    fontSize: 12,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
}); 