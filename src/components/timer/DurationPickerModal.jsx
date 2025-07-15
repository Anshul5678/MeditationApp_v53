import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import ScrollPicker from 'react-native-wheel-scrollview-picker';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');

const WARMUP_OPTIONS = [0, 5, 10, 15, 60, 120, 300, 600, 3600]; // 0s, 5s, 10s, 15s, 1m, 2m, 5m, 10m, 1h
const WARMUP_LABELS = ['0s', '5s', '10s', '15s', '1m', '2m', '5m', '10m', '1h'];

const DurationPickerModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  initialDuration = { hours: 0, minutes: 10, seconds: 0 },
  initialMeditationType = 'Meditation',
  onMeditationTypeChange
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [hours, setHours] = useState(initialDuration.hours);
  const [minutes, setMinutes] = useState(initialDuration.minutes);
  const [seconds, setSeconds] = useState(initialDuration.seconds);
  const [selectedWarmup, setSelectedWarmup] = useState(0);
  const [isInfinity, setIsInfinity] = useState(false);
  const [meditationType, setMeditationType] = useState(initialMeditationType);
  const [showMeditationTypeModal, setShowMeditationTypeModal] = useState(false);

  const meditationTypes = [
    'Meditation',
    'Mindfulness',
    'Breathing',
    'Loving-Kindness',
    'Body Scan',
    'Walking',
    'Zen',
    'Vipassana',
    'Transcendental',
    'Guided',
    'Yoga',
    'Tai Chi',
    'Chanting',
    'Prayer',
    'Healing',
    'Massage',
    'Manifesting',
    'Nap'
  ];

  // Picker data
  const hoursData = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesData = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const secondsData = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleConfirm = () => {
    if (isInfinity) {
      onConfirm({ hours: 0, minutes: 0, seconds: 0 });
    } else {
      onConfirm({ hours, minutes, seconds });
    }
    if (onMeditationTypeChange) {
      onMeditationTypeChange(meditationType);
    }
    onClose();
  };

  const formatDuration = (d) => {
    if (d.hours > 0) {
      return `${d.hours}:${d.minutes.toString().padStart(2, '0')}:${d.seconds.toString().padStart(2, '0')}`;
    }
    return `${d.minutes}:${d.seconds.toString().padStart(2, '0')}`;
  };

  const makeStyles = (theme) => {
    const SELECTED_BG = theme.card;
    const SELECTED_TEXT = theme.text;
    const UNSELECTED_TEXT = theme.textSecondary;

    return StyleSheet.create({
      overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      container: { 
        flex: 1, 
        backgroundColor: theme.background 
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 16,
      },
      cancel: { 
        color: theme.accent, 
        fontSize: 18, 
        fontWeight: '500' 
      },
      save: { 
        color: theme.accent, 
        fontSize: 18, 
        fontWeight: '500' 
      },
      title: { 
        color: theme.text, 
        fontSize: 22, 
        fontWeight: 'bold' 
      },
      infinityRow: { 
        alignItems: 'flex-end', 
        paddingHorizontal: 24, 
        marginBottom: 0 
      },
      infinityBtn: { 
        alignSelf: 'flex-end', 
        marginBottom: 0, 
        marginTop: -8 
      },
      pickerContainer: { 
        minHeight: 200, 
        justifyContent: 'center', 
        alignItems: 'center' 
      },
      infinityIconContainer: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: 180 
      },
      pickerRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        justifyContent: 'center', 
        marginTop: 12, 
        minHeight: 200 
      },
      pickerCol: { 
        alignItems: 'center', 
        marginHorizontal: 12, 
        backgroundColor: 'transparent', 
        borderRadius: 12, 
        paddingVertical: 8, 
        width: 80 
      },
      slotSelected: { 
        backgroundColor: SELECTED_BG, 
        borderRadius: 8, 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        width: '100%', 
        alignItems: 'center' 
      },
      slotUnselected: { 
        paddingVertical: 8, 
        paddingHorizontal: 12, 
        width: '100%', 
        alignItems: 'center' 
      },
      slotSelectedText: { 
        color: SELECTED_TEXT, 
        fontSize: 24, 
        fontWeight: '600' 
      },
      slotUnselectedText: { 
        color: UNSELECTED_TEXT, 
        fontSize: 24, 
        fontWeight: '400' 
      },
      unit: { 
        color: theme.text, 
        fontSize: 18, 
        marginTop: 2, 
        fontWeight: '400' 
      },
      meditationRow: {
        marginTop: 32,
        alignItems: 'center',
        width: '100%',
      },
      meditationTypeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },
      meditationText: {
        color: theme.text,
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        marginBottom: 8,
      },
      warmupRow: {
        marginTop: 32,
        alignItems: 'center',
        width: '100%',
      },
      warmupLabel: {
        color: theme.textSecondary,
        fontSize: 18,
        fontWeight: '500',
        marginBottom: 8,
        alignSelf: 'center',
      },
      warmupScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
      },
      warmupOption: {
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 18,
        marginHorizontal: 4,
        marginBottom: 4,
      },
      warmupSelected: {
        backgroundColor: theme.tint,
        borderColor: theme.tint,
      },
      warmupOptionText: {
        color: theme.textSecondary,
        fontSize: 16,
        fontWeight: '500',
      },
             warmupSelectedText: {
         color: theme.background,
         fontWeight: '700',
       },

       modalContent: {
         width: width * 0.9,
         borderRadius: 16,
         maxHeight: '70%',
         alignSelf: 'center',
         marginTop: '15%',
       },
       modalHeader: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         padding: 20,
         borderBottomWidth: 1,
         borderBottomColor: theme.border,
       },
       modalTitle: {
         fontSize: 20,
         fontWeight: 'bold',
       },
       modalScrollContent: {
         padding: 20,
       },
       modalOption: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         alignItems: 'center',
         paddingVertical: 15,
         paddingHorizontal: 20,
         borderRadius: 10,
         marginBottom: 5,
       },
       modalOptionText: {
         fontSize: 16,
         fontWeight: '500',
       },
    });
  };

  const styles = makeStyles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Duration</Text>
          <TouchableOpacity onPress={handleConfirm} accessibilityRole="button">
            <Text style={styles.save}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Infinity Icon Toggle */}
        <View style={styles.infinityRow}>
          <TouchableOpacity
            style={styles.infinityBtn}
            onPress={() => setIsInfinity((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Toggle infinite duration"
          >
            <MaterialCommunityIcons 
              name="infinity" 
              size={36} 
              color={theme.text} 
              style={{ opacity: 0.9 }} 
            />
          </TouchableOpacity>
        </View>

        {/* Time Picker or Infinity Icon */}
        <View style={styles.pickerContainer}>
          {isInfinity ? (
            <View style={styles.infinityIconContainer}>
              <MaterialCommunityIcons 
                name="infinity" 
                size={96} 
                color={theme.text} 
                style={{ opacity: 0.9 }} 
              />
            </View>
          ) : (
            <View style={styles.pickerRow}>
              {/* Hours */}
              <View style={styles.pickerCol}>
                <ScrollPicker
                  dataSource={hoursData}
                  selectedIndex={hours}
                  renderItem={(data, index, isSelected) => (
                    <View style={isSelected ? styles.slotSelected : styles.slotUnselected}>
                      <Text style={isSelected ? styles.slotSelectedText : styles.slotUnselectedText}>{data}</Text>
                    </View>
                  )}
                  onValueChange={(_, selectedIndex) => setHours(selectedIndex)}
                  wrapperHeight={180}
                  wrapperBackground="#00000000"
                  itemHeight={40}
                  highlightColor="#00000000"
                  highlightBorderWidth={0}
                />
                <Text style={styles.unit}>h</Text>
              </View>
              {/* Minutes */}
              <View style={styles.pickerCol}>
                <ScrollPicker
                  dataSource={minutesData}
                  selectedIndex={minutes}
                  renderItem={(data, index, isSelected) => (
                    <View style={isSelected ? styles.slotSelected : styles.slotUnselected}>
                      <Text style={isSelected ? styles.slotSelectedText : styles.slotUnselectedText}>{data}</Text>
                    </View>
                  )}
                  onValueChange={(_, selectedIndex) => setMinutes(selectedIndex)}
                  wrapperHeight={180}
                  wrapperBackground="#00000000"
                  itemHeight={40}
                  highlightColor="#00000000"
                  highlightBorderWidth={0}
                />
                <Text style={styles.unit}>m</Text>
              </View>
              {/* Seconds */}
              <View style={styles.pickerCol}>
                <ScrollPicker
                  dataSource={secondsData}
                  selectedIndex={seconds}
                  renderItem={(data, index, isSelected) => (
                    <View style={isSelected ? styles.slotSelected : styles.slotUnselected}>
                      <Text style={isSelected ? styles.slotSelectedText : styles.slotUnselectedText}>{data}</Text>
                    </View>
                  )}
                  onValueChange={(_, selectedIndex) => setSeconds(selectedIndex)}
                  wrapperHeight={180}
                  wrapperBackground="#00000000"
                  itemHeight={40}
                  highlightColor="#00000000"
                  highlightBorderWidth={0}
                />
                <Text style={styles.unit}>s</Text>
              </View>
            </View>
          )}
        </View>

        {/* Meditation Type */}
        <View style={styles.meditationRow}>
          <TouchableOpacity
            style={styles.meditationTypeBtn}
            onPress={() => setShowMeditationTypeModal(true)}
            accessibilityRole="button"
          >
            <Text style={styles.meditationText}>{meditationType}</Text>
            <Feather name="chevron-down" size={24} color={theme.text} style={{ marginLeft: 4, marginTop: 2 }} />
          </TouchableOpacity>
        </View>

        {/* Warm Up */}
        <View style={styles.warmupRow}>
          <Text style={styles.warmupLabel}>Warm Up</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.warmupScrollContent}>
            {WARMUP_OPTIONS.map((sec, idx) => (
              <TouchableOpacity
                key={sec}
                onPress={() => setSelectedWarmup(sec)}
                style={[styles.warmupOption, sec === selectedWarmup && styles.warmupSelected]}
              >
                <Text style={[styles.warmupOptionText, sec === selectedWarmup && styles.warmupSelectedText]}>
                  {WARMUP_LABELS[idx]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Meditation Type Modal */}
      <Modal
        visible={showMeditationTypeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMeditationTypeModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Meditation Type</Text>
              <TouchableOpacity onPress={() => setShowMeditationTypeModal(false)}>
                <Feather name="x" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {meditationTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modalOption,
                    meditationType === type && { backgroundColor: theme.cardSecondary }
                  ]}
                  onPress={() => {
                    setMeditationType(type);
                    setShowMeditationTypeModal(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, { color: theme.text }]}>
                    {type}
                  </Text>
                  {meditationType === type && (
                    <Feather name="check" size={20} color={theme.tint} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

export default DurationPickerModal; 