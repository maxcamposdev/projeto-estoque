import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import RotinasScreen from '../screens/RotinasScreen';
import RecebimentoScreen from '../screens/RecebimentoScreen';
import RepositorScreen from '../screens/RepositorScreen';
import PrecosScreen from '../screens/PrecosScreen';
import EmConstrucaoScreen from '../screens/EmConstrucaoScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0B83B6',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >

      <Tab.Screen
        name="Rotina"
        component={RotinasScreen}
        options={{
          tabBarIcon: () => <TabIcon emoji="📋" />
        }}
      />

      <Tab.Screen
        name="Recebimento"
        component={RecebimentoScreen}
        options={{
          tabBarIcon: () => <TabIcon emoji="📦" />
        }}
      />

      <Tab.Screen
        name="Reposição"
        component={RepositorScreen}
        options={{
          tabBarIcon: () => <TabIcon emoji="🛒" />
        }}
      />

      <Tab.Screen
        name="Preços"
        component={PrecosScreen}
        options={{
          tabBarIcon: () => <TabIcon emoji="🏷️" />
        }}
      />

      <Tab.Screen
        name="Comunicação"
        component={EmConstrucaoScreen}
        options={{
          tabBarIcon: () => <TabIcon emoji="💬" />
        }}
      />

    </Tab.Navigator>
  );
}
