import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, StatusBar, useColorScheme, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { useAuth } from '../src/context/AuthContext';
import Colors from '../src/constants/Colors';

export default function EventsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [savingEventId, setSavingEventId] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [enrolledEventIds, setEnrolledEventIds] = useState([]);
  const [enrollingEventId, setEnrollingEventId] = useState(null);

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchSavedEventIds();
    }
  }, [user]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const eventsRef = collection(db, 'MeditationEvents');
      const querySnapshot = await getDocs(eventsRef);
      const typesSet = new Set();
      // Gather all instructorIds
      let allInstructorIds = new Set();
      const rawEvents = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Support both instructorIds and instructors fields
        const instructorIds = data.instructorIds || data.instructors || [];
        if (Array.isArray(instructorIds)) {
          instructorIds.forEach(id => allInstructorIds.add(id));
        }
        if (data.type) typesSet.add(data.type);
        return {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          type: data.type,
          date: data.date,
          startTime: data.startTime,
          endTime: data.endTime,
          locationType: data.locationType,
          physicalLocation: data.physicalLocation,
          coverImage: data.coverImage || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167',
          instructorIds,
          attendees: data.attendees || [],
          participants: data.attendees ? data.attendees.length : 0,
          maxParticipants: data.maxParticipants || null,
          price: data.price || null,
        };
      });
      // Fetch all instructor names in one go
      const instructorNameMap = {};
      await Promise.all(Array.from(allInstructorIds).map(async (instructorId) => {
        try {
          const instructorDoc = await getDoc(doc(db, 'MeditationUsers', instructorId));
          if (instructorDoc.exists()) {
            const d = instructorDoc.data();
            instructorNameMap[instructorId] = d.fullName || d.name || 'Unknown Instructor';
          } else {
            instructorNameMap[instructorId] = 'Unknown Instructor';
          }
        } catch {
          instructorNameMap[instructorId] = 'Unknown Instructor';
        }
      }));
      // Map instructor names to each event
      const eventsList = rawEvents.map(e => ({
        ...e,
        instructorNames: (e.instructorIds && e.instructorIds.length > 0)
          ? e.instructorIds.map(id => instructorNameMap[id] || 'Unknown Instructor')
          : ['Unknown Instructor'],
      }));
      setEvents(eventsList);
      setEventTypes(['All', ...Array.from(typesSet)]);
      if (user) {
        setEnrolledEventIds(eventsList.filter(e => e.attendees.includes(user.uid)).map(e => e.id));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch events.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedEventIds = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'MeditationUsers', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSavedEventIds(data.savedEvents || []);
      }
    } catch (error) {
      setSavedEventIds([]);
    }
  };

  const handleSaveEvent = async (eventId) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save events');
      return;
    }
    setSavingEventId(eventId);
    try {
      const userDocRef = doc(db, 'MeditationUsers', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      let saved = [];
      if (userDocSnap.exists()) {
        saved = userDocSnap.data().savedEvents || [];
      }
      let updated;
      if (saved.includes(eventId)) {
        updated = saved.filter(id => id !== eventId);
      } else {
        updated = [...saved, eventId];
      }
      await setDoc(userDocRef, { savedEvents: updated }, { merge: true });
      setSavedEventIds(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to update saved events.');
    } finally {
      setSavingEventId(null);
    }
  };

  const handleEnrollEvent = async (eventId) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to enroll in events');
      return;
    }
    setEnrollingEventId(eventId);
    try {
      const eventDocRef = doc(db, 'MeditationEvents', eventId);
      await updateDoc(eventDocRef, { attendees: arrayUnion(user.uid) });
      setEnrolledEventIds(prev => [...prev, eventId]);
      // Update local event state
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendees: [...e.attendees, user.uid], participants: (e.participants || 0) + 1 } : e));
    } catch (error) {
      Alert.alert('Error', 'Failed to enroll in event.');
    } finally {
      setEnrollingEventId(null);
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to leave events');
      return;
    }
    setEnrollingEventId(eventId);
    try {
      const eventDocRef = doc(db, 'MeditationEvents', eventId);
      await updateDoc(eventDocRef, { attendees: arrayRemove(user.uid) });
      setEnrolledEventIds(prev => prev.filter(id => id !== eventId));
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attendees: e.attendees.filter(uid => uid !== user.uid), participants: Math.max((e.participants || 1) - 1, 0) } : e));
    } catch (error) {
      Alert.alert('Error', 'Failed to leave event.');
    } finally {
      setEnrollingEventId(null);
    }
  };

  const filteredEvents = selectedType && selectedType !== 'All'
    ? events.filter(e => e.type === selectedType)
    : events;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={{ flex: 1 }}>
        {/* Back Button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 24,
            left: 16,
            zIndex: 10,
            backgroundColor: theme.card,
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 3,
          }}
          onPress={() => router.push('/')} // Go to home
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text, marginTop: 40 }]}>Events</Text>
        {/* Event Type Filter */}
        <View style={{ paddingVertical: 8 }}>
          <FlatList
            data={eventTypes}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.typeFilterContainer}
            renderItem={({ item: type }) => (
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  {
                    borderColor: selectedType === type ? theme.tint : theme.border,
                    backgroundColor: selectedType === type ? theme.tint : theme.card,
                  },
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[
                  styles.typeChipText,
                  { color: selectedType === type ? '#fff' : theme.text },
                ]}>{type}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        {/* Events List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
            <Text style={{ color: theme.text, marginTop: 16 }}>Loading events...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40 }}>No events available.</Text>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item: event }) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventCard, { backgroundColor: theme.card }]}
                onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                activeOpacity={0.85}
              >
                <Image source={{ uri: event.coverImage }} style={styles.eventImage} />
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                  <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>{event.type.charAt(0).toUpperCase() + event.type.slice(1)}</Text>
                  <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>Price: {event.price ? `₹${event.price}` : 'Free'}</Text>
                  <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>Time: {event.startTime} - {event.endTime}</Text>
                  <Text style={[styles.eventMeta, { color: theme.textSecondary }]}>By {event.instructorNames.join(', ')}</Text>
                  <View style={styles.eventActionsRow}>
                    <TouchableOpacity onPress={() => handleSaveEvent(event.id)} style={styles.saveIcon}>
                      <Ionicons name={savedEventIds.includes(event.id) ? 'bookmark' : 'bookmark-outline'} size={24} color={savedEventIds.includes(event.id) ? theme.tint : theme.text} />
                      {savingEventId === event.id && <ActivityIndicator size="small" color={theme.tint} style={{ position: 'absolute', right: -30, top: 0 }} />}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  typeFilterContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingBottom: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventCard: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  eventImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventMeta: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  saveIcon: {
    padding: 8,
    marginRight: 8,
  },
  eventActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  enrollButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  enrollButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 