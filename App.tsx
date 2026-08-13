import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './app/context/AuthContext';

import HomeScreen from './app/screen/HomeScreen';
import Customer_Browse_All from './app/screen/Customer_Browse_All';
import Customer_Browse_Categorized from './app/screen/Customer_Browse_Categorized';
import Customer_Show_Category from './app/screen/Customer_Show_Category';
import Customer_Product_Detail from './app/screen/Customer_Product_Details';
import LoginScreen from './app/screen/Login_Screen';
import RegisterScreen from './app/screen/Register_Screen';

import BuyerAccountScreen from './app/screen/Buyer_Account_Screen';
import Seller_Account_Screen from './app/screen/Seller_Account_Screen';
import User_Edit_Profile from './app/screen/User_Account_Edit_Profile';
import Seller_Edit_Business from './app/screen/Seller_Edit_Business';
import WishlistScreen from './app/screen/Wishlist_Screen';
import BecomeSellerScreen from './app/screen/Become_Seller_Screen';
import User_Password_Edit from './app/screen/User_Password_Edit';

import Cart_Screen from './app/screen/Cart_Screen';
import Seller_Sell_Product from './app/screen/Seller_Sell_Product';
import Seller_Clearance_Issue from './app/screen/Seller_Clearance_Issue';
import Seller_My_Products from './app/screen/Seller_My_Products';
import Seller_Edit_Product from './app/screen/Seller_Edit_Product';
import Moderator_Account_Screen from './app/screen/Moderator_Account_Screen';
import Moderate_Pending_Products from './app/screen/Moderate_Pending_Products';
import Moderate_Pending_Sellers from './app/screen/Moderate_Pending_Sellers';
import Moderate_Current_Products from './app/screen/Moderate_Current_Products';
import Moderate_Current_Sellers from './app/screen/Moderate_Current_Sellers';
import Customer_Address from './app/screen/Customer_Address';
import Customer_Add_Address from './app/screen/Customer_Add_Address';
import Customer_Set_Default_Address from './app/screen/Customer_Set_Default_Address';
import Customer_Edit_Address from './app/screen/Customer_Edit_Address';
import Moderation_History_Screen from './app/screen/Moderation_History_Screen';
import Admin_Account_Screen from './app/screen/Admin_Account_Screen';
import Admin_User_Management from './app/screen/Admin_User_Management';
import Admin_Seller_Management from './app/screen/Admin_Seller_Management';

const SellScreen = () => null;
const AlertsScreen = () => null;

const Stack = createNativeStackNavigator();

// Main App Navigator with Auth
function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Splash Screen placeholder
    return null;
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? "Home" : "Login"}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {/* Auth Screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />

      {/* Main App Screens */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BrowseAll" component={Customer_Browse_All} />
      <Stack.Screen name="BrowseCategorized" component={Customer_Browse_Categorized} />
      <Stack.Screen name="ShowCategories" component={Customer_Show_Category} />
      <Stack.Screen name="ProductDetail" component={Customer_Product_Detail} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Sell" component={SellScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Account" component={BuyerAccountScreen} />
      <Stack.Screen name="SellerAccount" component={Seller_Account_Screen} />
      <Stack.Screen name="User_Edit_Profile" component={User_Edit_Profile} />
      <Stack.Screen name="Seller_Edit_Business" component={Seller_Edit_Business} />
      <Stack.Screen name="BecomeSeller" component={BecomeSellerScreen} />
      <Stack.Screen name="UserPasswordEdit" component={User_Password_Edit} />
      <Stack.Screen name="SellerSellProduct" component={Seller_Sell_Product} />
      <Stack.Screen name="Cart" component={Cart_Screen} />
      <Stack.Screen name="SellerMyProducts" component={Seller_My_Products} />
      <Stack.Screen name="SellerEditProduct" component={Seller_Edit_Product} />
      <Stack.Screen name="SellerClearanceIssue" component={Seller_Clearance_Issue} />
      <Stack.Screen name="ModeratorAccount" component={Moderator_Account_Screen} />
      <Stack.Screen name="ModeratePendingProducts" component={Moderate_Pending_Products} />
      <Stack.Screen name="ModeratePendingSellers" component={Moderate_Pending_Sellers} />
      <Stack.Screen name="ModerateCurrentProducts" component={Moderate_Current_Products} />
      <Stack.Screen name="CustomerAddress" component={Customer_Address} />
      <Stack.Screen name="CustomerAddAddress" component={Customer_Add_Address} />
      <Stack.Screen name="ModerateCurrentSellers" component={Moderate_Current_Sellers} />
      <Stack.Screen name="CustomerSetDefaultAddress" component={Customer_Set_Default_Address} />
      <Stack.Screen name="ModerationHistory" component={Moderation_History_Screen} />
      <Stack.Screen name="CustomerEditAddress" component={Customer_Edit_Address} />
      <Stack.Screen name="AdminAccount" component={Admin_Account_Screen} />
      <Stack.Screen name="AdminUserManagement" component={Admin_User_Management} />
      <Stack.Screen name="AdminSellerManagement" component={Admin_Seller_Management} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}