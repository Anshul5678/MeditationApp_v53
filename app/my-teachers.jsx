import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../src/constants/Colors';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { TeachersService } from '../src/services/teachersService';
import { useAuth } from '../src/context/AuthContext';
import TeacherCard from '../src/components/teachers/TeacherCard';

export default function MyTeachersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();

  const [myTeachers, setMyTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState({});
  const [followLoading, setFollowLoading] = useState({});

  const fetchMyTeachers = async () => {
    if (!user) {
      setMyTeachers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const teachers = await TeachersService.getUserFollowingTeachers(user.uid);
      setMyTeachers(teachers);
      
      // Set following state
      const followingMap = {};
      teachers.forEach(teacher => { followingMap[teacher.uid] = true; });
      setFollowing(followingMap);
    } catch (error) {
      console.error('Error fetching my teachers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyTeachers();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMyTeachers();
  }, [user]);

  const handleFollow = async (teacherId, isCurrentlyFollowing) => {
    if (!user) return;
    setFollowLoading(prev => ({ ...prev, [teacherId]: true }));
    try {
      if (isCurrentlyFollowing) {
        await TeachersService.unfollowTeacher(user.uid, teacherId);
        setFollowing(prev => ({ ...prev, [teacherId]: false }));
        // Remove from my teachers list
        setMyTeachers(prev => prev.filter(t => t.uid !== teacherId));
      } else {
        await TeachersService.followTeacher(user.uid, teacherId);
        setFollowing(prev => ({ ...prev, [teacherId]: true }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  const goBack = () => router.back();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Teachers</Text>
        <View style={styles.backButton} />
      </View>

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
        {myTeachers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              You haven't followed any teachers yet.
            </Text>
            <TouchableOpacity
              style={[styles.browseButton, { backgroundColor: theme.tint }]}
              onPress={() => router.push('/(tabs)/teachers')}
            >
              <Text style={styles.browseButtonText}>Browse Teachers</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {myTeachers.map(teacher => (
              <TeacherCard
                key={teacher.uid}
                teacher={teacher}
                theme={theme}
                isFollowing={!!following[teacher.uid]}
                followLoading={!!followLoading[teacher.uid]}
                onFollow={() => handleFollow(teacher.uid, !!following[teacher.uid])}
                onPress={() => router.push('/meditation/teacher/' + teacher.uid)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
}); 