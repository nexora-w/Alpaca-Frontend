import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: 'bg-green-500', icon: 'checkmark-circle', iconColor: '#fff' };
      case 'error':
        return { bg: 'bg-red-500', icon: 'close-circle', iconColor: '#fff' };
      case 'warning':
        return { bg: 'bg-yellow-500', icon: 'warning', iconColor: '#fff' };
      default:
        return { bg: 'bg-blue-500', icon: 'information-circle', iconColor: '#fff' };
    }
  };

  const colors = getColors();

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
      className="absolute top-12 left-4 right-4 z-50"
    >
      <View className={`${colors.bg} rounded-2xl p-4 shadow-lg flex-row items-center`}>
        <Ionicons name={colors.icon as any} size={24} color={colors.iconColor} />
        <Text className="text-white font-semibold ml-3 flex-1">{message}</Text>
        <TouchableOpacity onPress={handleClose} className="ml-2">
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Toast manager hook
let toastQueue: Array<{ id: string; message: string; type: ToastType; duration?: number }> = [];
let toastListeners: Array<(toast: typeof toastQueue[0] | null) => void> = [];

export function useToast() {
  const [currentToast, setCurrentToast] = useState<typeof toastQueue[0] | null>(null);

  useEffect(() => {
    const listener = (toast: typeof toastQueue[0] | null) => {
      setCurrentToast(toast);
    };
    toastListeners.push(listener);

    // Process queue
    if (toastQueue.length > 0 && !currentToast) {
      const next = toastQueue.shift();
      if (next) {
        setCurrentToast(next);
      }
    }

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, [currentToast]);

  const showToast = (message: string, type: ToastType = 'info', duration?: number) => {
    const id = Math.random().toString(36).substring(7);
    const toast = { id, message, type, duration };

    if (currentToast) {
      toastQueue.push(toast);
    } else {
      setCurrentToast(toast);
    }

    // Notify all listeners
    toastListeners.forEach((listener) => listener(toast));
  };

  const handleClose = () => {
    setCurrentToast(null);
    // Process next in queue
    if (toastQueue.length > 0) {
      const next = toastQueue.shift();
      if (next) {
        setTimeout(() => setCurrentToast(next), 100);
      }
    }
  };

  return {
    showToast,
    currentToast: currentToast ? (
      <Toast
        key={currentToast.id}
        message={currentToast.message}
        type={currentToast.type}
        duration={currentToast.duration}
        onClose={handleClose}
      />
    ) : null,
  };
}

