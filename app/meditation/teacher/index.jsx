import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../src/services/firebase';
import Colors from '../../../src/constants/Colors';
import { TeachersService } from '../../../src/services/teachersService';
import { useRouter } from 'expo-router';

// List-item style card for each followed teacher
const TeacherListItem = ({ teacher, onPress }) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: theme.cardBackground }]}
      onPress={onPress}
    >
      {teacher.profileImageUrl ? (
        <Image source={{ uri: teacher.profileImageUrl }} style={styles.itemAvatar} />
      ) : (
        <View style={[styles.itemAvatar, styles.avatarFallback, { backgroundColor: theme.tint }]}>
          <Text style={styles.avatarText}>
            {teacher.fullName
              ?.split(' ')
              .map((n) => n[0])
              .join('')}
          </Text>
        </View>
      )}
      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
          {teacher.fullName}
        </Text>
        {teacher.location ? (
          <Text style={[styles.itemSecondary, { color: theme.textSecondary }]} numberOfLines={1}>
            {teacher.location}
          </Text>
        ) : null}
        <Text style={[styles.itemSecondary, { color: theme.textSecondary }]}> 
          {teacher.followers?.length || 0} {teacher.followers?.length === 1 ? 'follower' : 'followers'}
        </Text>
      </View>
      <View style={styles.followStatusContainer}>
        <Text style={[styles.followStatus, { backgroundColor: theme.border, color: theme.text }]}>
          Following
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function MyTeachersScreen() {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [user, setUser] = useState(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        fetchFollowedTeachers(firebaseUser.uid);
      } else {
        setTeachers([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchFollowedTeachers = async (userId) => {
    try {
      setLoading(true);
      const followed = await TeachersService.getUserFollowingTeachers(userId);
      setTeachers(followed || []);
    } catch (error) {
      console.error('Error fetching followed teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherPress = (teacherId) => {
    router.push({
      pathname: '/meditation/teacher/[id]',
      params: { id: teacherId },
    });
  };

  const goBack = () => router.back();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Teachers</Text>
        <View style={styles.backButton} />
      </View>

      {teachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>You are not following any teachers yet.</Text>
        </View>
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TeacherListItem teacher={item} onPress={() => handleTeacherPress(item.uid)} />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemSecondary: {
    fontSize: 12,
  },
  followStatusContainer: {
    marginLeft: 12,
  },
  followStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
    overflow: 'hidden',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 