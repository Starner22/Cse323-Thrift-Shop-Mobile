import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { apiService } from '../service/api_calls';
import StorageService from '../service/StorageService';

interface AuthContextData {
    user: any | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check auth status on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async (): Promise<void> => {
        try {
            setIsLoading(true);
            const hasValidToken = await StorageService.hasValidToken();
            
            if (hasValidToken) {
                const userData = await apiService.getCurrentUser();
                if (userData) {
                    setUser(userData);
                    setIsAuthenticated(true);
                    console.log('Auto-login successful');
                } else {
                    await logout();
                }
            } else {
                await logout();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            await logout();
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            const response = await apiService.login(email, password);
            
            if (response.success) {
                setUser(response.user);
                setIsAuthenticated(true);
                return true;
            } else {
                Alert.alert('Login Failed', response.message || 'Invalid credentials');
                return false;
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Something went wrong');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string): Promise<boolean> => {
        try {
            setIsLoading(true);
            const response = await apiService.register(name, email, password);
            
            if (response.success) {
                Alert.alert('Registration Successful', 'Please login to continue');
                return true;
            } else {
                Alert.alert('Registration Failed', response.message || 'Something went wrong');
                return false;
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await apiService.logout();
            setUser(null);
            setIsAuthenticated(false);
            console.log('Logged out');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                login,
                register,
                logout,
                checkAuthStatus,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};