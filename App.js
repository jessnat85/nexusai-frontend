import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useColorScheme } from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';

import UploadScreen from './components/UploadScreen';
import ResultsScreen from './components/ResultsScreen';
import SettingsScreen from './components/SettingsScreen';
import AboutScreen from './components/AboutScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const scheme = useColorScheme();

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Upload') return <AntDesign name="upload" size={size} color={color} />;
            if (route.name === 'Results') return <Feather name="bar-chart-2" size={size} color={color} />;
            if (route.name === 'Settings') return <Feather name="settings" size={size} color={color} />;
            if (route.name === 'About') return <AntDesign name="infocirlceo" size={size} color={color} />;
          },
          tabBarActiveTintColor: '#D4AF37',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Upload" component={UploadScreen} />
        <Tab.Screen name="Results" component={ResultsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
        <Tab.Screen name="About" component={AboutScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}