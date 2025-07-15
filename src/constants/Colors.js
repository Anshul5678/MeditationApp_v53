/**
 * Color constants for the meditation app
 * Provides light and dark theme colors with meditation-specific palette
 */

const tintColorLight = '#7B68EE';
const tintColorDark = '#9B8FFF';

const Colors = {
  light: {
    text: '#11181C',
    background: '#FEFEFE',
    card: '#FFFFFF',
    cardSecondary: '#F8F9FA',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    plus: '#FF6B6B',
    rating: '#FFA500',
    
    // Meditation-specific colors
    primary: '#7B68EE',
    secondary: '#9B8FFF',
    accent: '#FFB4B4',
    calm: '#87CEEB',
    peace: '#DDA0DD',
    wisdom: '#F0E68C',
    focus: '#98FB98',
    
    // Gradients
    gradientStart: '#7B68EE',
    gradientEnd: '#9B8FFF',
    
    // Mood colors
    moods: {
      amazing: '#FF6B6B',
      happy: '#4ECDC4',
      calm: '#45B7D1',
      neutral: '#96CEB4',
      anxious: '#FFEAA7',
      sad: '#DDA0DD'
    }
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    card: '#1F2937',
    cardSecondary: '#374151',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    textSecondary: '#9CA3AF',
    border: '#374151',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    plus: '#FF8787',
    rating: '#FFB347',
    
    // Meditation-specific colors
    primary: '#9B8FFF',
    secondary: '#7B68EE',
    accent: '#FF9999',
    calm: '#5F9EA0',
    peace: '#BA55D3',
    wisdom: '#DAA520',
    focus: '#90EE90',
    
    // Gradients
    gradientStart: '#9B8FFF',
    gradientEnd: '#7B68EE',
    
    // Mood colors
    moods: {
      amazing: '#FF8787',
      happy: '#66D9D4',
      calm: '#5DADE2',
      neutral: '#A9DFBF',
      anxious: '#F7DC6F',
      sad: '#D7A9D7'
    }
  },
};

export default Colors; 