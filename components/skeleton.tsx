import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function Skeleton({ width, height, className = '' }: { width?: number | string; height?: number; className?: string }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={{
        width: width || '100%',
        height: height || 20,
        opacity,
        backgroundColor: '#e5e7eb',
        borderRadius: 8,
      }}
      className={className}
    />
  );
}

export function TokenSkeleton() {
  return (
    <View className="bg-white rounded-lg p-4 border border-gray-200 flex-row items-center justify-between mb-3">
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Skeleton width={40} height={40} className="rounded-full mr-3" />
          <View className="flex-1">
            <Skeleton width={100} height={16} className="mb-2" />
            <Skeleton width={150} height={12} />
          </View>
        </View>
      </View>
      <View className="items-end">
        <Skeleton width={60} height={16} className="mb-2" />
        <Skeleton width={50} height={12} />
      </View>
    </View>
  );
}

