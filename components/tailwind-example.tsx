import { View, Text, TouchableOpacity } from 'react-native';

/**
 * Example component demonstrating NativeWind (Tailwind CSS) usage
 * You can use this as a reference for styling with Tailwind classes
 */
export function TailwindExample() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-50 p-4">
      <Text className="text-3xl font-bold text-blue-900 mb-4">
        NativeWind is Working!
      </Text>
      
      <View className="bg-white rounded-lg p-6 shadow-lg w-full max-w-sm">
        <Text className="text-lg font-semibold text-gray-800 mb-2">
          Example Card
        </Text>
        <Text className="text-gray-600 mb-4">
          This card is styled entirely with Tailwind CSS classes.
        </Text>
        
        <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold text-center">
            Click Me
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

