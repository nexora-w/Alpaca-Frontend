# Using Tailwind CSS (NativeWind) in Your React Native App

NativeWind v4 is now set up in your project! You can use Tailwind CSS classes directly in your React Native components.

## Basic Usage

Instead of using `StyleSheet`, you can now use the `className` prop with Tailwind classes:

### Example 1: Basic Styling

```tsx
import { View, Text } from 'react-native';

export default function Example() {
  return (
    <View className="flex-1 items-center justify-center bg-blue-500">
      <Text className="text-white text-2xl font-bold">
        Hello Tailwind!
      </Text>
    </View>
  );
}
```

### Example 2: Buttons

```tsx
import { TouchableOpacity, Text } from 'react-native';

export default function ButtonExample() {
  return (
    <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg shadow-lg">
      <Text className="text-white font-semibold text-center">
        Click Me
      </Text>
    </TouchableOpacity>
  );
}
```

### Example 3: Layout with Flexbox

```tsx
import { View, Text } from 'react-native';

export default function LayoutExample() {
  return (
    <View className="flex-1 p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-xl font-bold">Header</Text>
        <Text className="text-gray-500">Menu</Text>
      </View>
      <View className="flex-1 bg-gray-100 rounded-lg p-4">
        <Text className="text-base">Content goes here</Text>
      </View>
    </View>
  );
}
```

## Common Tailwind Classes for React Native

### Layout
- `flex-1` - flex: 1
- `flex-row` - flexDirection: 'row'
- `flex-col` - flexDirection: 'column'
- `items-center` - alignItems: 'center'
- `justify-center` - justifyContent: 'center'
- `justify-between` - justifyContent: 'space-between'

### Spacing
- `p-4` - padding: 16
- `px-4` - paddingHorizontal: 16
- `py-4` - paddingVertical: 16
- `m-4` - margin: 16
- `mx-4` - marginHorizontal: 16
- `my-4` - marginVertical: 16
- `gap-4` - gap: 16

### Colors
- `bg-blue-500` - backgroundColor
- `text-white` - color
- `border-gray-300` - borderColor

### Sizing
- `w-full` - width: '100%'
- `h-12` - height: 48
- `rounded-lg` - borderRadius: 8
- `rounded-full` - borderRadius: 9999

### Typography
- `text-xl` - fontSize: 20
- `font-bold` - fontWeight: 'bold'
- `text-center` - textAlign: 'center'

## Mixing with StyleSheet

You can still use StyleSheet alongside Tailwind classes:

```tsx
import { View, Text, StyleSheet } from 'react-native';

export default function MixedExample() {
  return (
    <View className="flex-1 p-4" style={styles.customStyle}>
      <Text className="text-xl font-bold">Mixed Styling</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  customStyle: {
    // Custom styles that aren't easily achievable with Tailwind
  },
});
```

## Converting Your Current Code

You can gradually convert your existing StyleSheet code to use Tailwind classes. For example:

**Before:**
```tsx
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
});
```

**After:**
```tsx
<View className="flex-1 p-4 bg-white">
  <Text className="text-2xl font-bold text-black">Hello</Text>
</View>
```

## Important Notes

1. **Restart your dev server** after installing NativeWind for the first time
2. NativeWind uses the `className` prop, not `class`
3. Some web-only Tailwind features may not work in React Native
4. You can customize colors and spacing in `tailwind.config.js`

## Resources

- [NativeWind Documentation](https://www.nativewind.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

