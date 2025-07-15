import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedService } from '../../services/savedService';
import { useAuth } from '../../context/AuthContext';

/**
 * Generic bookmark/save button for courses and events
 */
export default function SaveButton({
  itemId,
  type = 'course', // 'course' | 'event'
  size = 20,
  colorSaved = '#FFD700',
  colorUnsaved = '#ffffff',
  style,
}) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check saved state on mount or when item changes
  useEffect(() => {
    let isMounted = true;
    const checkSaved = async () => {
      if (!user) {
        if (isMounted) setSaved(false);
        return;
      }
      try {
        let res = false;
        if (type === 'course') {
          res = await SavedService.isCourseSaved(user.uid, itemId);
        } else if (type === 'event') {
          res = await SavedService.isEventSaved(user.uid, itemId);
        }
        if (isMounted) setSaved(res);
      } catch (err) {
        console.error('Error checking saved state:', err);
      }
    };
    checkSaved();
    return () => {
      isMounted = false;
    };
  }, [user, itemId, type]);

  const toggle = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please sign in to save items.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      let newState = false;
      if (type === 'course') {
        newState = await SavedService.toggleCourseSave(user.uid, itemId);
      } else if (type === 'event') {
        newState = await SavedService.toggleEventSave(user.uid, itemId);
      }
      setSaved(newState);
    } catch (err) {
      console.error('Error toggling save:', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableOpacity onPress={toggle} disabled={busy} style={style} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={size} color={saved ? colorSaved : colorUnsaved} />
    </TouchableOpacity>
  );
} 