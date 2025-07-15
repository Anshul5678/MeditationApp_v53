import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image, View, Text, TextInput, TouchableOpacity, useColorScheme, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../src/constants/Colors';
import { useAuth } from '../src/context/AuthContext';
import { storage } from '../src/services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function EditProfileScreen() {
  const { user, userProfile, updateProfile } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [language, setLanguage] = useState(userProfile?.language || '');
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState(userProfile?.profileImageUrl || '');

  const goBack = () => router.back();

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'We need permission to access photos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
    }
  };

  const uploadImageAsync = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, `profile_images/${user.uid}_${Date.now()}`);
    await uploadBytes(fileRef, blob);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      let updateData = { fullName, bio, location, language };
      if (avatarUri && avatarUri !== userProfile?.profileImageUrl) {
        const uploadedUrl = await uploadImageAsync(avatarUri);
        updateData.profileImageUrl = uploadedUrl;
      }
      await updateProfile(updateData);
      Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
      router.back();
    } catch (err) {
      console.error('Update profile error', err);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}> 
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <TouchableOpacity style={styles.avatarPicker} onPress={handlePickImage}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.tint+'30' }]}> 
              <Feather name="camera" size={28} color={theme.text} />
            </View>
          )}
          <Text style={[styles.changePhotoText, { color: theme.tint }]}>Change Photo</Text>
        </TouchableOpacity>

        {/* Full Name */}
        <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Email (read-only for now) */}
        <Text style={[styles.label, { color: theme.text }]}>Email</Text>
        <TextInput
          style={[styles.input, { color: theme.textSecondary, borderColor: theme.border }]}
          value={email}
          editable={false}
        />

        {/* Bio */}
        <Text style={[styles.label, { color: theme.text }]}>Bio</Text>
        <TextInput
          style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        {/* Location */}
        <Text style={[styles.label, { color: theme.text }]}>Location</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={location}
          onChangeText={setLocation}
        />

        {/* Language */}
        <Text style={[styles.label, { color: theme.text }]}>Language</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          value={language}
          onChangeText={setLanguage}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.tint }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
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
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
}); 