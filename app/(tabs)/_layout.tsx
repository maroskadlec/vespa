import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

interface TabIconProps {
  focused: boolean;
  label: string;
  icon: string;
}

function TabIcon({ focused, label, icon }: TabIconProps) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIconText, focused && styles.tabIconFocused]}>
        {icon}
      </Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Přehled" icon="⊙" />
          ),
        }}
      />
      <Tabs.Screen
        name="servis"
        options={{
          title: 'Servis',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Servis" icon="⚙" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    backgroundColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabBarAndroid: {
    backgroundColor: 'rgba(15, 26, 18, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  tabIconText: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 2,
  },
  tabIconFocused: {
    color: '#19e65e',
  },
  tabLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
  },
  tabLabelFocused: {
    fontFamily: 'Inter_600SemiBold',
    color: '#19e65e',
  },
});
