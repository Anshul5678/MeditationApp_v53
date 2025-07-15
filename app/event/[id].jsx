import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '../../src/constants/Colors';
import { EventsService } from '../../src/services/eventsService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../src/services/firebase';

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isParticipating, setIsParticipating] = useState(false);
  // Add state for loading enroll/cancel
  const [actionLoading, setActionLoading] = useState(false);
  const [instructorNames, setInstructorNames] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);

  // Add state for max participants
  const isEventFull = event && event.maxParticipants && event.participants && event.participants.length >= event.maxParticipants;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && event) {
        checkParticipationStatus(user.uid);
      }
    });

    return () => unsubscribe();
  }, [event]);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const eventData = await EventsService.getEventById(id);
      setEvent(eventData);
      // Fetch instructor names
      const instructorIds = eventData.instructorIds || eventData.instructors || [];
      const names = [];
      for (const instructorId of instructorIds) {
        try {
          const instructorDoc = await getDoc(doc(db, 'MeditationUsers', instructorId));
          if (instructorDoc.exists()) {
            const d = instructorDoc.data();
            names.push(d.fullName || d.name || 'Unknown Instructor');
          } else {
            names.push('Unknown Instructor');
          }
        } catch {
          names.push('Unknown Instructor');
        }
      }
      setInstructorNames(names.length > 0 ? names : ['Unknown Instructor']);
      // Fetch participant count from attendees subcollection
      const attendeesRef = collection(db, 'MeditationEvents', id, 'attendees');
      const attendeesSnap = await getDocs(attendeesRef);
      setParticipantCount(attendeesSnap.size);
      
      if (user) {
        checkParticipationStatus(user.uid);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const checkParticipationStatus = async (userId) => {
    try {
      const status = await EventsService.isUserParticipating(id, userId);
      setIsParticipating(status);
    } catch (error) {
      console.error('Error checking participation status:', error);
    }
  };

  const handleJoinEvent = async () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to log in to join events',
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

    try {
      await EventsService.joinEvent(id, user.uid);
      setIsParticipating(true);
      Alert.alert('Success', 'You have joined the event successfully');
    } catch (error) {
      console.error('Error joining event:', error);
      Alert.alert('Error', 'Failed to join event. Please try again.');
    }
  };

  const handleCancelEvent = async () => {
    if (!user) return;

    try {
      await EventsService.cancelEvent(id, user.uid);
      setIsParticipating(false);
      Alert.alert('Success', 'You have cancelled your participation');
    } catch (error) {
      console.error('Error cancelling event:', error);
      Alert.alert('Error', 'Failed to cancel participation. Please try again.');
    }
  };

  const handleJoinOnlineEvent = () => {
    if (event?.link) {
      Linking.openURL(event.link);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error || 'Event not found'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
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
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Feather name="arrow-left" size={22} color={theme.text} />
      </TouchableOpacity>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingTop: 16 }}>
        {/* Cover Image */}
        <Image 
          source={{ uri: event.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />

        {/* Event Info */}
        <View style={[styles.infoContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
          
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {new Date(event.date).toLocaleDateString()}
              </Text>
            </View>
            
            {event.startTime && (
              <View style={styles.metaItem}>
                <Feather name="clock" size={16} color={theme.textSecondary} />
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  {event.startTime} - {event.endTime}
                </Text>
              </View>
            )}
            
            <View style={styles.metaItem}>
              <Feather name={event.locationType === 'online' ? 'video' : 'map-pin'} size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {event.locationType === 'online' ? 'Online Event' : event.physicalLocation}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: theme.text }]}>
            {event.description}
          </Text>

          {isParticipating && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.tint + '22', padding: 8, borderRadius: 8, marginBottom: 16 }}>
              <Feather name="check-circle" size={20} color={theme.tint} />
              <Text style={{ color: theme.tint, marginLeft: 8, fontWeight: '600' }}>You're enrolled in this event</Text>
            </View>
          )}
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Feather name="users" size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>Participants: {participantCount}/{event.maxParticipants || '∞'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="user" size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>Instructors: {instructorNames.join(', ')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="tag" size={16} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>Type: {event.type}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            {isParticipating ? (
              <>
                {event.locationType === 'online' && event.link && (
                  <TouchableOpacity
                    style={[styles.joinButton, { backgroundColor: theme.tint }]}
                    onPress={handleJoinOnlineEvent}
                    disabled={actionLoading}
                  >
                    <Feather name="video" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Join Online</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: theme.error }]}
                  onPress={async () => {
                    setActionLoading(true);
                    await handleCancelEvent();
                    setActionLoading(false);
                  }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <ActivityIndicator color={theme.error} /> : (
                    <Text style={[styles.cancelButtonText, { color: theme.error }]}>Cancel Enrollment</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.enrollButton, { backgroundColor: isEventFull ? theme.textSecondary : theme.tint, opacity: isEventFull || actionLoading ? 0.7 : 1 }]}
                onPress={async () => {
                  if (!user) {
                    Alert.alert('Login Required', 'You need to log in to enroll in events', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Login', onPress: () => router.push('/profile') }
                    ]);
                    return;
                  }
                  setActionLoading(true);
                  await handleJoinEvent();
                  setActionLoading(false);
                }}
                disabled={isEventFull || actionLoading}
              >
                {actionLoading ? <ActivityIndicator color={theme.background} /> : (
                  <Text style={styles.buttonText}>{isEventFull ? 'Event Full' : 'Enroll Now'}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  coverImage: {
    width: '100%',
    height: 250,
  },
  infoContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metaInfo: {
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metaText: {
    fontSize: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  actionButtons: {
    gap: 12,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  enrollButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
}); 