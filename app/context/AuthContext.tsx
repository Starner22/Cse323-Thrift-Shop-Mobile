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
    updateUser: (userData: any) => Promise<void>;
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
                // First try to get user from storage
                const storedUser = await StorageService.getUser();
                if (storedUser) {
                    setUser(storedUser);
                    setIsAuthenticated(true);
                    console.log('Auto-login successful');
                    setIsLoading(false);
                    return;
                }
                
                // If no stored user, fetch from server
                const userData = await apiService.getCurrentUser();
                if (userData) {
                    // Make sure permissions are included
                    const userWithPermissions = {
                        ...userData,
                        permissions: userData.permissions || {
                            can_moderate_sellers: false,
                            can_moderate_products: false,
                            can_approve_sellers: false,
                            can_manage_reports: false,
                            can_view_analytics: false,
                            can_manage_moderators: false
                        }
                    };
                    setUser(userWithPermissions);
                    await StorageService.storeUser(userWithPermissions);
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
                // Make sure permissions are included with defaults
                const userWithPermissions = {
                    ...response.user,
                    permissions: response.user.permissions || {
                        can_moderate_sellers: false,
                        can_moderate_products: false,
                        can_approve_sellers: false,
                        can_manage_reports: false,
                        can_view_analytics: false,
                        can_manage_moderators: false
                    }
                };
                
                // Store both in state and persistent storage
                setUser(userWithPermissions);
                await StorageService.storeUser(userWithPermissions);
                setIsAuthenticated(true);
                
                console.log('✅ Login successful with permissions:', userWithPermissions.permissions);
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

    const updateUser = async (userData: any): Promise<void> => {
        try {
            // Update local user state - merge with existing
            setUser((prevUser: any) => {
                const updated = {
                    ...prevUser,
                    ...userData,
                    // Preserve permissions if they exist
                    permissions: userData.permissions || prevUser?.permissions || {
                        can_moderate_sellers: false,
                        can_moderate_products: false,
                        can_approve_sellers: false,
                        can_manage_reports: false,
                        can_view_analytics: false,
                        can_manage_moderators: false
                    }
                };
                return updated;
            });
            
            // Update stored user data
            const currentUser = await StorageService.getUser();
            if (currentUser) {
                const updatedUser = {
                    ...currentUser,
                    ...userData,
                    permissions: userData.permissions || currentUser.permissions || {
                        can_moderate_sellers: false,
                        can_moderate_products: false,
                        can_approve_sellers: false,
                        can_manage_reports: false,
                        can_view_analytics: false,
                        can_manage_moderators: false
                    }
                };
                await StorageService.storeUser(updatedUser);
            }
            
            console.log('User data updated locally');
        } catch (error) {
            console.error('Error updating user locally:', error);
            throw error;
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
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};