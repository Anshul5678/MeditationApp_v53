import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  useColorScheme,
  StatusBar,
  TextInput,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Colors from '../../src/constants/Colors';

const MoodButton = ({ emoji, label, isSelected, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.moodButton,
      {
        backgroundColor: isSelected ? theme.tint + '20' : theme.card,
        borderWidth: isSelected ? 2 : 0,
        borderColor: isSelected ? theme.tint : 'transparent',
      }
    ]}
    onPress={onPress}
  >
    <Text style={styles.moodEmoji}>{emoji}</Text>
    <Text 
      style={[
        styles.moodLabel,
        { color: isSelected ? theme.tint : theme.text }
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

function CheckInScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [selectedMood, setSelectedMood] = useState(null);
  const [gratitudeText, setGratitudeText] = useState('');
  const [notesText, setNotesText] = useState('');
  const [currentStreak, setCurrentStreak] = useState(7);

  const moods = [
    { id: 'amazing', emoji: '🤩', label: 'Amazing' },
    { id: 'happy', emoji: '😊', label: 'Happy' },
    { id: 'calm', emoji: '😌', label: 'Calm' },
    { id: 'neutral', emoji: '😐', label: 'Neutral' },
    { id: 'anxious', emoji: '😰', label: 'Anxious' },
    { id: 'sad', emoji: '😢', label: 'Sad' },
  ];

  const handleSubmit = () => {
    // Here you would save the check-in data to Firebase
    console.log('Check-in submitted:', {
      mood: selectedMood,
      gratitude: gratitudeText,
      notes: notesText,
      timestamp: new Date().toISOString()
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Daily Check-in
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          How are you feeling today?
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Streak Display */}
        <View style={styles.streakSection}>
          <View style={[styles.streakCard, { backgroundColor: theme.card }]}>
            <View style={styles.streakContent}>
              <View style={styles.streakLeft}>
                <View style={[styles.streakIcon, { backgroundColor: theme.tint + '33' }]}>
                  <Feather name="flame" size={24} color={theme.tint} />
                </View>
                <View>
                  <Text style={[styles.streakNumber, { color: theme.text }]}>
                    {currentStreak} days
                  </Text>
                  <Text style={[styles.streakLabel, { color: theme.textSecondary }]}>
                    Current streak
                  </Text>
                </View>
              </View>
              <View style={styles.streakRight}>
                <Text style={[styles.weekLabel, { color: theme.textSecondary }]}>This week</Text>
                <Text style={[styles.weekNumber, { color: theme.text }]}>{'5/7'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Mood Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            How are you feeling?
          </Text>
          <View style={styles.moodsGrid}>
            {moods.map((mood) => (
              <View key={mood.id} style={styles.moodContainer}>
                <MoodButton
                  emoji={mood.emoji}
                  label={mood.label}
                  isSelected={selectedMood === mood.id}
                  onPress={() => setSelectedMood(mood.id)}
                  theme={theme}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Gratitude Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            What are you grateful for?
          </Text>
          <TextInput
            placeholder="Share something you're grateful for today..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
              }
            ]}
            multiline
            value={gratitudeText}
            onChangeText={setGratitudeText}
          />
        </View>

        {/* Notes Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Additional Notes
          </Text>
          <TextInput
            placeholder="Any thoughts, feelings, or insights you'd like to record..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
              }
            ]}
            multiline
            value={notesText}
            onChangeText={setNotesText}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.tint }]}
            onPress={handleSubmit}
          >
            <Feather name="check" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>
              Complete Check-in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  streakSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  streakCard: {
    borderRadius: 16,
    padding: 24,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  streakRight: {
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  weekNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodContainer: {
    width: '30%',
    marginBottom: 12,
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  textInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});

export default CheckInScreen; 