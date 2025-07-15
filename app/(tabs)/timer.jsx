import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  useColorScheme,
  StatusBar,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Image,
  ScrollView,
  Alert,
  Easing,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import Colors from '../../src/constants/Colors';
import CustomSlider from '../../src/components/ui/CustomSlider';
import MeditationTypeBottomSheet from '../../src/components/meditation/MeditationTypeBottomSheet';
import DurationPickerModal from '../../src/components/timer/DurationPickerModal';
import { TimerService } from '../../src/services/timerService';
import { useAuth } from '../../src/context/AuthContext';

const { width } = Dimensions.get('window');

export default function TimerScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();
  
  // Timer state
  const [duration, setDuration] = useState({ hours: 0, minutes: 10, seconds: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // seconds
  const [showTimerScreen, setShowTimerScreen] = useState(false);
  const [meditationType, setMeditationType] = useState('Meditation');
  const [isInfinity, setIsInfinity] = useState(false);
  
  // UI state
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [showTypeSheet, setShowTypeSheet] = useState(false);
  
  // Volume state
  const [deviceVolume, setDeviceVolume] = useState(1);
  const [startBellVolume, setStartBellVolume] = useState(1);
  const [endBellVolume, setEndBellVolume] = useState(1);
  const [pendingDeviceVolume, setPendingDeviceVolume] = useState(deviceVolume);
  const [pendingStartBellVolume, setPendingStartBellVolume] = useState(startBellVolume);
  const [pendingEndBellVolume, setPendingEndBellVolume] = useState(endBellVolume);
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(1)).current;
  const subScreenAnim = useRef(new Animated.Value(1)).current;
  
  // Bell sound player (expo-audio)
  const bellPlayer = useAudioPlayer(require('../../assets/audio/chinese-bell.mp3'));
  
  // Session tracking
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedInterval = useRef(null);
  const timerInterval = useRef(null);
  const prevSettingsRef = useRef(null);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsScreen, setSettingsScreen] = useState('main');
  const [bellInterval, setBellInterval] = useState(3);
  const [background, setBackground] = useState('Black');
  
  // Slider state
  const [isSliding, setIsSliding] = useState(false);

  // Function to play test bell at a given volume
  const playTestBell = (volume) => {
    if (bellPlayer) {
      bellPlayer.seekTo(0);
      // expo-audio does not support per-play volume, so set globally if needed
      bellPlayer.play();
    }
  };

  // No need to manually load/unload bell sound with expo-audio hook

  // Play bell sound
  const playBellSound = () => {
    if (bellPlayer) {
      bellPlayer.seekTo(0);
      bellPlayer.play();
    }
  };

  // Update timeLeft when duration changes
  useEffect(() => {
    const totalSeconds = duration.hours * 3600 + duration.minutes * 60 + duration.seconds;
    setTimeLeft(totalSeconds);
  }, [duration]);

  // Timer effect
  useEffect(() => {
    if (isInfinity) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      return;
    }
    
    if (showTimerScreen && isRunning && !isPaused && timeLeft > 0) {
      timerInterval.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timerInterval.current);
    }
    
    if (!isRunning || isPaused || timeLeft <= 0) {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    
    if (timeLeft === 0 && isRunning) {
      playBellSound();
      handleFinish();
    }
  }, [showTimerScreen, isRunning, isPaused, timeLeft, isInfinity]);

  // Elapsed time tracking
  useEffect(() => {
    if (showTimerScreen && isRunning && !isPaused) {
      elapsedInterval.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      return () => {
        if (elapsedInterval.current) {
          clearInterval(elapsedInterval.current);
        }
      };
    }
  }, [showTimerScreen, isRunning, isPaused]);

  // Settings change effect
  useEffect(() => {
    const currentSettings = JSON.stringify({ duration, meditationType });
    if (prevSettingsRef.current && prevSettingsRef.current.duration !== JSON.stringify(duration)) {
      setShowTimerScreen(false);
      setIsRunning(false);
      setIsPaused(false);
      setTimeLeft(duration.hours * 3600 + duration.minutes * 60 + duration.seconds);
    }
    prevSettingsRef.current = { duration: JSON.stringify(duration), meditationType };
  }, [duration, meditationType]);

  // No need for manual cleanup with useAudioPlayer

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (d) => {
    if (d.hours > 0) return `${d.hours}:${d.minutes.toString().padStart(2, '0')}:${d.seconds.toString().padStart(2, '0')}`;
    return `${d.minutes}:${d.seconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const startTime = new Date();
    setSessionStartTime(startTime);
    setShowTimerScreen(true);
    setIsRunning(true);
    setIsPaused(false);
    setTimeLeft(duration.hours * 3600 + duration.minutes * 60 + duration.seconds);
    setElapsedTime(0);
    playBellSound();
    
    elapsedInterval.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(true);
    setIsRunning(false);
    if (elapsedInterval.current) {
      clearInterval(elapsedInterval.current);
    }
  };

  const handleResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(false);
    setIsRunning(true);
    elapsedInterval.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  };

  const handleFinish = async () => {
    const endTime = new Date();
    setShowTimerScreen(false);
    setIsRunning(false);
    setIsPaused(false);
    // No manual stop/unload needed for expo-audio useAudioPlayer

    if (elapsedInterval.current) {
      clearInterval(elapsedInterval.current);
    }

    if (!user) {
      return;
    }

    if (!sessionStartTime) {
      return;
    }

    try {
      const totalMinutes = isInfinity ? 'infinity' : (duration.hours * 60 + duration.minutes);
      const wasCompleted = isInfinity ? true : timeLeft === 0;
      const actualDurationMinutes = Math.floor(elapsedTime / 60);

      await TimerService.saveMeditationSession(user.uid, {
        selectedMinutes: totalMinutes,
        startTime: sessionStartTime,
        endTime: endTime,
        actualDuration: actualDurationMinutes,
        wasCompleted,
        type: meditationType,
      });

    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save meditation session. Please try again.'
      );
    } finally {
      setTimeLeft(duration.hours * 3600 + duration.minutes * 60 + duration.seconds);
      setSessionStartTime(null);
      setElapsedTime(0);
      if (elapsedInterval.current) {
        clearInterval(elapsedInterval.current);
      }
    }
  };

  const handleDiscard = () => {
    setShowTimerScreen(false);
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration.hours * 3600 + duration.minutes * 60 + duration.seconds);
    setSessionStartTime(null);
    setElapsedTime(0);
    // No manual stop/unload needed for expo-audio useAudioPlayer
    if (elapsedInterval.current) {
      clearInterval(elapsedInterval.current);
    }
  };

  const handleGestureEvent = (event) => {
    if (event.nativeEvent.translationY > 60) {
      setShowVolumeModal(false);
    }
  };

  const openSettings = () => {
    setSettingsScreen('main');
    setShowSettings(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSettings = () => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setShowSettings(false));
  };

  const openSubScreen = (screen) => {
    setSettingsScreen(screen);
    Animated.timing(subScreenAnim, {
      toValue: 0,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeSubScreen = () => {
    Animated.timing(subScreenAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setSettingsScreen('main'));
  };

  // Theme-dependent styles for the volume modal (must be before return)
  const volumeModalStyles = {
    volumeModalSheet: {
      backgroundColor: theme.card,
      padding: 24,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      width: '100%',
    },
    volumeModalHandle: {
      width: 48,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    volumeModalTitle: {
      color: theme.text,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 16,
    },
    volumeModalPercent: {
      color: theme.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    volumeModalCancel: {
      backgroundColor: theme.background,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    volumeModalSave: {
      backgroundColor: theme.background,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      flex: 1,
      marginLeft: 8,
    },
  };

  // FULLSCREEN TIMER UI
  if (showTimerScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>  
        {/* Meditation type at top center */}
        <View style={{ position: 'absolute', top: 32, left: 0, right: 0, alignItems: 'center', zIndex: 2 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 22, opacity: 0.4 }}>{meditationType}</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 8 }}>Chinese Bell</Text>
          {isPaused && <Text style={{ color: theme.text, fontSize: 18, marginBottom: 8 }}>Paused</Text>}
          {!isInfinity && (
            <>
              <Text style={{ color: theme.text, fontSize: 64, fontWeight: 'bold', marginBottom: 8 }}>{formatTime(timeLeft)}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 18, marginBottom: 32 }}>1 bell remaining</Text>
            </>
          )}
          {isInfinity && (
            <Text style={{ color: theme.text, fontSize: 64, fontWeight: 'bold', marginBottom: 32 }}>∞</Text>
          )}
          {/* Spacer to move play/pause button higher */}
          <View style={{ height: 32 }} />
          {/* Only show play/pause button, no volume or more icon */}
          {!isPaused && isRunning && (
            <TouchableOpacity style={[styles.playBtn, { backgroundColor: theme.accent }]} accessibilityRole="button" accessibilityLabel="Pause timer" onPress={handlePause}>
              <Feather name="pause" size={48} color={theme.background} />
            </TouchableOpacity>
          )}
          {isPaused && (
            <TouchableOpacity style={[styles.playBtn, { backgroundColor: theme.accent }]} accessibilityRole="button" accessibilityLabel="Resume timer" onPress={handleResume}>
              <Feather name="play" size={48} color={theme.background} />
            </TouchableOpacity>
          )}
          {/* Finish/Discard controls */}
          {isPaused && (
            <>
              <TouchableOpacity onPress={handleFinish} style={{ backgroundColor: theme.text, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 64, marginBottom: 12, alignSelf: 'center' }}>
                <Text style={{ color: theme.background, fontSize: 20, fontWeight: '600' }}>Finish</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDiscard} style={{ marginTop: 4, alignSelf: 'center' }}>
                <Text style={{ color: theme.textSecondary, fontSize: 16, textAlign: 'center' }}>Discard session</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>  
      {/* Centered Timer heading with back button and 3-dots */}
      <View style={{ height: 60, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
        <TouchableOpacity
          style={{ position: 'absolute', left: 24, top: 0, height: 60, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => router.push('/')}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Feather name="arrow-left" size={28} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[styles.tabActive, { color: theme.text, textAlign: 'center' }]}>Timer</Text>
        {/* Hide 3 dots (more-horizontal) button for now */}
        {/*
        <TouchableOpacity
          style={{ position: 'absolute', right: 24, top: 0, height: 60, justifyContent: 'center', alignItems: 'center' }}
          onPress={openSettings}
          accessibilityRole="button"
          accessibilityLabel="Timer settings"
        >
          <Feather name="more-horizontal" size={24} color={theme.icon} />
        </TouchableOpacity>
        */}
      </View>

      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Bell Section */}
        <TouchableOpacity 
          style={styles.bellSection} 
          onPress={playBellSound}
          accessibilityRole="button"
          accessibilityLabel="Play Chinese bell sound"
        >
          {/* <Text style={[styles.bellLabel, { color: theme.text }]}></Text> */}
          <Image
            source={require('../../assets/chinesebell.png')}
            style={styles.bellImage}
            accessibilityLabel="Chinese bell"
          />
          <View style={styles.bellLineRow}>
            <View style={[styles.bellLine, { backgroundColor: theme.text }]} />
            <View style={[styles.bellNumberCircle, { backgroundColor: theme.card }]}> 
              <Text style={[styles.bellNumber, { color: theme.text }]} >1</Text>
            </View>
            <View style={[styles.bellLine, { backgroundColor: theme.text }]} />
          </View>
          <Text style={[styles.bellName, { color: theme.textSecondary }]}>Chinese Bell</Text>
        </TouchableOpacity>

        {/* Settings List */}
        <View style={styles.settingsList}>
          <TouchableOpacity
            style={styles.settingsRow}
            accessibilityRole="button"
            onPress={() => setShowDurationPicker(true)}
          >
            <Text style={[styles.settingsLabel, { color: theme.text }]}>Duration</Text>
            <View style={styles.settingsValueRow}>
              <TouchableOpacity onPress={() => setShowTypeSheet(true)}>
                <Text style={[styles.settingsValue, { color: theme.textSecondary, fontWeight: 'bold', fontSize: 16 }]}> {meditationType} </Text>
              </TouchableOpacity>
              <Text style={[styles.settingsValue, { color: theme.textSecondary }]}> {formatDuration(duration)}</Text>
              <Feather name="chevron-right" size={22} color={theme.icon} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsRow} accessibilityRole="button">
            <Text style={[styles.settingsLabel, { color: theme.text }]}>Starting bell</Text>
            <View style={styles.settingsValueRow}>
              <Text style={[styles.settingsValue, { color: theme.textSecondary }]}>Chinese Bell</Text>
              <Feather name="chevron-right" size={22} color={theme.icon} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Spacer to push play button row up */}
        <View style={{ height: 48 }} />

        {/* Play Button and Volume */}
        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.volumeRow} onPress={() => setShowVolumeModal(true)}>
            <Feather name="volume-2" size={20} color={theme.icon} />
            <Text style={[styles.volumeText, { color: theme.textSecondary }]}>{Math.round(deviceVolume * 100)}%</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.playBtn, { backgroundColor: theme.accent }]} accessibilityRole="button" accessibilityLabel="Start timer" onPress={handlePlay}>
            <Feather name="play" size={48} color={theme.background} />
          </TouchableOpacity>
          <View style={{ width: 44 }} />
        </View>

        <MeditationTypeBottomSheet
          visible={showTypeSheet}
          onClose={() => setShowTypeSheet(false)}
          onSelect={setMeditationType}
          selectedType={meditationType}
        />

        <DurationPickerModal
          visible={showDurationPicker}
          onClose={() => setShowDurationPicker(false)}
          onConfirm={(newDuration) => {
            setDuration(newDuration);
            // Check if it's infinity mode (all zeros)
            if (newDuration.hours === 0 && newDuration.minutes === 0 && newDuration.seconds === 0) {
              setIsInfinity(true);
            } else {
              setIsInfinity(false);
            }
          }}
          initialDuration={duration}
          initialMeditationType={meditationType}
          onMeditationTypeChange={setMeditationType}
        />
      </View>

      {/* Volume Modal */}
      <Modal
        visible={showVolumeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowVolumeModal(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Overlay for dismiss */}
          <TouchableOpacity
            style={styles.volumeModalOverlay}
            activeOpacity={1}
            onPress={() => setShowVolumeModal(false)}
          />
          {/* Modal Sheet with controls (no PanGestureHandler) */}
          <View style={volumeModalStyles.volumeModalSheet}>
            <View style={volumeModalStyles.volumeModalHandle} />
            <Text style={volumeModalStyles.volumeModalTitle}>Your device volume</Text>
            <Text style={volumeModalStyles.volumeModalPercent}>{Math.round(pendingDeviceVolume * 100)}%</Text>
            <CustomSlider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={pendingDeviceVolume}
              onValueChange={(value) => {
                setPendingDeviceVolume(value);
                if (isSliding) setDeviceVolume(value);
              }}
              onSlidingStart={() => setIsSliding(true)}
              onSlidingComplete={(value) => {
                setIsSliding(false);
                setDeviceVolume(value);
              }}
              minimumTrackTintColor={theme.tint}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.tint}
              step={0.01}
            />
            <Text style={[styles.volumeLabel, { color: theme.text }]}>Start Bell Volume</Text>
            <CustomSlider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={pendingStartBellVolume}
              onValueChange={(value) => {
                setPendingStartBellVolume(value);
                if (isSliding) setStartBellVolume(value);
              }}
              onSlidingStart={() => setIsSliding(true)}
              onSlidingComplete={(value) => {
                setIsSliding(false);
                setStartBellVolume(value);
                playTestBell(value);
              }}
              minimumTrackTintColor={theme.tint}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.tint}
              step={0.01}
            />
            <Text style={[styles.volumeLabel, { color: theme.text }]}>End Bell Volume</Text>
            <CustomSlider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={pendingEndBellVolume}
              onValueChange={(value) => {
                setPendingEndBellVolume(value);
                if (isSliding) setEndBellVolume(value);
              }}
              onSlidingStart={() => setIsSliding(true)}
              onSlidingComplete={(value) => {
                setIsSliding(false);
                setEndBellVolume(value);
                playTestBell(value);
              }}
              minimumTrackTintColor={theme.tint}
              maximumTrackTintColor={theme.border}
              thumbTintColor={theme.tint}
              step={0.01}
            />
            <View style={styles.volumeModalActions}>
              <TouchableOpacity style={volumeModalStyles.volumeModalCancel} onPress={() => setShowVolumeModal(false)}>
                <Text style={{ color: '#F44', fontSize: 18, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={volumeModalStyles.volumeModalSave} onPress={() => {
                setDeviceVolume(pendingDeviceVolume);
                setStartBellVolume(pendingStartBellVolume);
                setEndBellVolume(pendingEndBellVolume);
                setShowVolumeModal(false);
              }}>
                <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: '600', textAlign: 'center' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Fullscreen Settings Panel */}
      {showSettings && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: theme.background,
            zIndex: 100,
            transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }],
          }}
        >
          {/* Main settings screen */}
          {settingsScreen === 'main' && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 20, marginBottom: 24 }}>
                <TouchableOpacity onPress={closeSettings} accessibilityRole="button" accessibilityLabel="Close timer settings">
                  <Feather name="arrow-left" size={28} color={theme.icon} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 28 }}>Timer settings</Text>
              </View>
              <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 16 }} />
              <TouchableOpacity onPress={() => { subScreenAnim.setValue(1); openSubScreen('bell'); }} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 24 }}>
                <Text style={{ color: theme.text, fontSize: 18 }}>Bell strike interval</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 18 }}>{bellInterval.toFixed(1)}s</Text>
              </TouchableOpacity>
              <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, marginBottom: 16, marginHorizontal: 24 }} />
              <TouchableOpacity onPress={() => { subScreenAnim.setValue(1); openSubScreen('background'); }} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }}>
                <Text style={{ color: theme.text, fontSize: 18 }}>Background{"\n"}Image</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 18 }}>{background}</Text>
              </TouchableOpacity>
            </>
          )}
          {/* Bell strike interval subscreen */}
          {settingsScreen === 'bell' && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: theme.background,
                zIndex: 101,
                transform: [{ translateX: subScreenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 20, marginBottom: 24 }}>
                <TouchableOpacity onPress={closeSubScreen} accessibilityRole="button" accessibilityLabel="Back">
                  <Feather name="arrow-left" size={28} color={theme.icon} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>Bell strike interval</Text>
                <TouchableOpacity onPress={closeSubScreen} accessibilityRole="button" accessibilityLabel="Save" style={{ minWidth: 40 }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 18, textAlign: 'center', marginBottom: 24 }}>Delay between multiple bell strikes:</Text>
              <Text style={{ color: theme.text, fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>{bellInterval.toFixed(1)} Seconds</Text>
              <CustomSlider
                style={{ width: '90%', alignSelf: 'center', marginBottom: 32 }}
                minimumValue={1}
                maximumValue={10}
                step={0.1}
                value={bellInterval}
                onValueChange={setBellInterval}
                minimumTrackTintColor={theme.accent}
                maximumTrackTintColor={theme.textSecondary}
                thumbTintColor={theme.accent}
              />
              <TouchableOpacity onPress={() => {}} style={{ alignSelf: 'center', marginTop: 16 }}>
                <Text style={{ color: theme.text, fontSize: 20 }}>Play Sample</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
          {/* Background image subscreen */}
          {settingsScreen === 'background' && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: theme.background,
                zIndex: 101,
                transform: [{ translateX: subScreenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingHorizontal: 20, marginBottom: 24 }}>
                <TouchableOpacity onPress={closeSubScreen} accessibilityRole="button" accessibilityLabel="Back">
                  <Feather name="arrow-left" size={28} color={theme.icon} />
                </TouchableOpacity>
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center' }}>Timer background</Text>
                <View style={{ minWidth: 40 }} />
              </View>
              {['Black', 'Ocean', 'Stars', 'Custom'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  onPress={() => setBackground(bg)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18 }}
                >
                  <Text style={{ color: theme.text, fontSize: 20 }}>{bg}</Text>
                  {background === bg && <Feather name="check" size={24} color={theme.accent} />}
                </TouchableOpacity>
              ))}
              <Text style={{ color: theme.textSecondary, fontSize: 16, marginTop: 16, paddingHorizontal: 24 }}>
                This is the background that you'll see when the timer is counting down.
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'flex-start',
  },
  tabActive: {
    fontSize: 22,
    fontWeight: '700',
  },
  bellSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  bellLabel: {
    fontSize: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  bellImage: {
    width: width * 0.45,
    height: width * 0.23,
    resizeMode: 'contain',
    marginBottom: 0,
  },
  bellLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  bellLine: {
    height: 2,
    width: 48,
    opacity: 0.3,
  },
  bellNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    shadowColor: '#000',
  },
  bellNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  bellName: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  settingsList: {
    marginTop: 12,
    marginBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  settingsLabel: {
    fontSize: 18,
    fontWeight: '500',
  },
  settingsValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsValue: {
    fontSize: 16,
    marginRight: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeText: {
    fontSize: 16,
    marginLeft: 8,
  },
  playBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  volumeSlider: {
    width: '100%',
    height: 40,
    marginBottom: 20,
  },
  volumeLabel: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
}); 