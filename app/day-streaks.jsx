import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, useColorScheme, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../src/constants/Colors';
import { useAuth } from '../src/context/AuthContext';
import { StreakService } from '../src/services/streakService';
import { useRouter } from 'expo-router';

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

export default function DayStreaksScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalCompleteDays: 0,
    monthlyHistory: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      StreakService.getStreakData(user.uid)
        .then(data => setStreakData(data))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Day Streaks</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <DayStreakSection streakData={streakData} theme={theme} styles={styles} />
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