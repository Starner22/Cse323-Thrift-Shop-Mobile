import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
    userID: number;
    name: string;
    email: string;
    role: string;
    exp: number;
}

class StorageService {
    private TOKEN_KEY = 'auth_token';
    private USER_KEY = 'user_data';
    private TOKEN_TIMESTAMP_KEY = 'token_timestamp';

    async storeToken(token: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(this.TOKEN_KEY, token);
            await AsyncStorage.setItem(this.TOKEN_TIMESTAMP_KEY, Date.now().toString());
            console.log('Token stored securely');
        } catch (error) {
            console.error('Error storing token:', error);
        }
    }

    async getToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(this.TOKEN_KEY);
        } catch (error) {
            console.error('Error retrieving token:', error);
            return null;
        }
    }


    async storeUser(user: any): Promise<void> {
        try {
            await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
            console.log('User data stored');
        } catch (error) {
            console.error('Error storing user data:', error);
        }
    }


    async getUser(): Promise<any | null> {
        try {
            const userData = await AsyncStorage.getItem(this.USER_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    async isTokenExpired(): Promise<boolean> {
        try {
            const token = await this.getToken();
            if (!token) return true;

            const decoded = jwtDecode<DecodedToken>(token);
            const exp = decoded.exp * 1000;
            return Date.now() >= exp;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    }

    async hasValidToken(): Promise<boolean> {
        try {
            const token = await this.getToken();
            if (!token) {
                console.log('No token found');
                return false;
            }

            const expired = await this.isTokenExpired();
            if (expired) {
                console.log('Token expired, clearing...');
                await this.clearAll();
                return false;
            }

            console.log('Token found');
            return true;
        } catch (error) {
            console.error('Error checking token validity:', error);
            return false;
        }
    }


    async clearAll(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(this.TOKEN_KEY);
            await AsyncStorage.removeItem(this.USER_KEY);
            await AsyncStorage.removeItem(this.TOKEN_TIMESTAMP_KEY);
            console.log('All auth data cleared');
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
    }

    decodeToken(token: string): DecodedToken | null {
        try {
            return jwtDecode<DecodedToken>(token);
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    }
}

export default new StorageService();