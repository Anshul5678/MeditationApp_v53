import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from 'react-native';

const { width } = Dimensions.get('window');

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
  'Guided'
];

const MeditationTypeBottomSheet = ({ 
  visible, 
  onClose, 
  onSelect, 
  selectedType 
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Meditation Type
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.icon} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {meditationTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeItem,
                  selectedType === type && { backgroundColor: theme.cardSecondary }
                ]}
                onPress={() => {
                  onSelect(type);
                  onClose();
                }}
              >
                <Text style={[styles.typeText, { color: theme.text }]}>
                  {type}
                </Text>
                {selectedType === type && (
                  <Feather name="check" size={20} color={theme.tint} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  typeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default MeditationTypeBottomSheet; 