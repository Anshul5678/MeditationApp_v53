import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../src/constants/Colors';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { EventsService } from '../src/services/eventsService';

export default function RetreatsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [retreats, setRetreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRetreats = async () => {
    setLoading(true);
    try {
      const allEvents = await EventsService.getAllEvents();
      const retreatsData = allEvents.filter(e => (e.type || '').toLowerCase() === 'retreat');
      setRetreats(retreatsData);
    } catch (error) {
      console.error('Error fetching retreats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRetreats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRetreats();
  }, []);

  const goBack = () => router.back();

  const renderRetreatCard = (retreat) => (
    <TouchableOpacity
      key={retreat.id}
      style={[styles.retreatCard, { backgroundColor: theme.card }]}
      onPress={() => router.push('/event/' + retreat.id)}
      activeOpacity={0.85}
    >
      {retreat.coverImage && (
        <Image source={{ uri: retreat.coverImage }} style={styles.retreatCardImage} />
      )}
      <View style={styles.retreatCardContent}>
        <View style={styles.retreatBadge}>
          <Feather name="home" size={12} color="#fff" />
          <Text style={styles.retreatText}>RETREAT</Text>
        </View>
        <Text style={[styles.retreatTitle, { color: theme.text }]} numberOfLines={2}>{retreat.title}</Text>
        <Text style={[styles.retreatDate, { color: theme.textSecondary }]}>{retreat.date} {retreat.startTime ? `• ${retreat.startTime}` : ''}</Text>
        {retreat.instructorNames && retreat.instructorNames.length > 0 && (
          <Text style={[styles.retreatInstructor, { color: theme.textSecondary }]}>
            with {retreat.instructorNames.join(', ')}
          </Text>
        )}
        {retreat.description && (
          <Text style={[styles.retreatDescription, { color: theme.textSecondary }]} numberOfLines={2}>
            {retreat.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Retreats</Text>
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
        {retreats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="home" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No retreats available at the moment.
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Check back later for upcoming retreat events.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {retreats.map(renderRetreatCard)}
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  retreatCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  retreatCardImage: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  retreatCardContent: {
    padding: 16,
  },
  retreatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  retreatText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  retreatTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  retreatDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  retreatInstructor: {
    fontSize: 14,
    marginBottom: 8,
  },
  retreatDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 