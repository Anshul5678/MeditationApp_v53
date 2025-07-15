import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../src/constants/Colors';
import { useAuth } from '../src/context/AuthContext';
import { SavedService } from '../src/services/savedService';
import { CourseCard } from '../src/components/courses/CourseCard';
import SaveButton from '../src/components/ui/SaveButton';

// Simple Event item
const EventItem = ({ event, onPress, theme }) => (
  <TouchableOpacity style={[styles.eventItem, { backgroundColor: theme.card }]} onPress={onPress}>
    <View style={styles.eventLeft}>
      <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={2}>{event.title}</Text>
      <Text style={[styles.eventDate, { color: theme.textSecondary }]}>{event.date} {event.startTime ? `• ${event.startTime}` : ''}</Text>
    </View>
    <SaveButton itemId={event.id} type="event" size={20} />
    <Feather name="chevron-right" size={20} color={theme.textSecondary} style={{ marginLeft: 4 }} />
  </TouchableOpacity>
);

export default function SavedContentScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [savedCourses, setSavedCourses] = useState([]);
  const [savedEvents, setSavedEvents] = useState([]);

  useEffect(() => {
    if (user) {
      fetchSaved();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSaved = async () => {
    try {
      setLoading(true);
      const [courses, events] = await Promise.all([
        SavedService.getSavedCourses(user.uid),
        SavedService.getSavedEvents(user.uid),
      ]);
      setSavedCourses(courses);
      setSavedEvents(events);
    } catch (e) {
      console.error('Error fetch saved', e);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => router.back();
  const handleCoursePress = (id) => {
    console.log('Pressed saved course', id);
    router.push('/courses/' + id);
  };
  const handleEventPress = (id) => {
    console.log('Pressed saved event', id);
    router.push('/event/' + id);
  };
  const handleRemoveBrokenCourse = async (id) => {
    await SavedService.unsaveCourse(user.uid, id);
    setSavedCourses((prev) => prev.filter((c) => c && c.id !== id));
  };
  const handleRemoveBrokenEvent = async (id) => {
    await SavedService.unsaveEvent(user.uid, id);
    setSavedEvents((prev) => prev.filter((e) => e && e.id !== id));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
        <ActivityIndicator size="large" color={theme.tint} />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Please sign in to view saved content.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Saved Content</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Saved Courses */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved Courses</Text>
          {savedCourses.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No saved courses yet.</Text>
          ) : (
            savedCourses.map((course) => (
              course && course.id ? (
                <CourseCard
                  key={course.id}
                  course={course}
                  theme={theme}
                  fullWidth
                  onPress={() => handleCoursePress(course.id)}
                />
              ) : (
                <View key={course?.id || Math.random()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary, flex: 1 }]}>This course is no longer available.</Text>
                  <TouchableOpacity onPress={() => handleRemoveBrokenCourse(course?.id)} style={{ marginLeft: 8 }}>
                    <Feather name="x-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              )
            ))
          )}
        </View>

        {/* Saved Events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Saved Events</Text>
          {savedEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No saved events yet.</Text>
          ) : (
            savedEvents.map((event) => (
              event && event.id ? (
                <TouchableOpacity key={event.id} onPress={() => handleEventPress(event.id)} activeOpacity={0.85}>
                  <EventItem event={event} theme={theme} onPress={() => handleEventPress(event.id)} />
                </TouchableOpacity>
              ) : (
                <View key={event?.id || Math.random()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary, flex: 1 }]}>This event is no longer available.</Text>
                  <TouchableOpacity onPress={() => handleRemoveBrokenEvent(event?.id)} style={{ marginLeft: 8 }}>
                    <Feather name="x-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              )
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventLeft: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
  },
}); 