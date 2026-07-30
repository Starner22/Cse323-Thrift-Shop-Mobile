import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // Use this
// OR if you prefer regular stack:
// import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './app/screen/HomeScreen';
import Customer_Browse_All from './app/screen/Customer_Browse_All';
import Customer_Browse_Categorized from './app/screen/Customer_Browse_Categorized';
import Customer_Show_Category from './app/screen/Customer_Show_Category';
import Customer_Product_Detail from './app/screen/Customer_Product_Details';

// Placeholder screens
const FavoritesScreen = () => null;
const SellScreen = () => null;
const AlertsScreen = () => null;
const AccountScreen = () => null;

const Stack = createNativeStackNavigator(); // Or createStackNavigator()

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="BrowseAll" component={Customer_Browse_All} />
          <Stack.Screen name="BrowseCategorized" component={Customer_Browse_Categorized} />
          <Stack.Screen name="ShowCategories" component={Customer_Show_Category} />
          <Stack.Screen name="ProductDetail" component={Customer_Product_Detail} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Sell" component={SellScreen} />
          <Stack.Screen name="Alerts" component={AlertsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}