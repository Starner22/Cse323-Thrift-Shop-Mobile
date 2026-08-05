import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../service/api_calls';
import { useAuth } from '../context/AuthContext';

const User_Password_Edit = ({ navigation }: any) => {
    const { logout } = useAuth();
    const [loading, setLoading] = useState(false);
    
    // Form fields
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Show/hide password
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Validation states
    const [errors, setErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const validateForm = () => {
        let isValid = true;
        const newErrors = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        };

        // Validate current password
        if (!currentPassword.trim()) {
            newErrors.currentPassword = 'Current password is required';
            isValid = false;
        }

        // Validate new password
        if (!newPassword.trim()) {
            newErrors.newPassword = 'New password is required';
            isValid = false;
        } else if (newPassword.length < 6) {
            newErrors.newPassword = 'Password must be at least 6 characters';
            isValid = false;
        }

        // Validate confirm password
        if (!confirmPassword.trim()) {
            newErrors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleChangePassword = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const response = await apiService.changePassword(
                currentPassword.trim(),
                newPassword.trim()
            );

            if (response.success) {
                Alert.alert(
                    'Password Changed',
                    'Your password has been updated successfully!',
                    [
                        { 
                            text: 'OK', 
                            onPress: () => {
                                // Clear form
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                navigation.goBack();
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', response.message || 'Failed to change password');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (currentPassword || newPassword || confirmPassword) {
            Alert.alert(
                'Discard Changes',
                'Are you sure you want to discard your changes?',
                [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Change Password</Text>
                <TouchableOpacity 
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="shield-checkmark" size={24} color="#3498DB" />
                        <Text style={styles.infoBannerText}>
                            For security, please enter your current password and choose a new one.
                            Password must be at least 6 characters long.
                        </Text>
                    </View>

                    {/* Password Form */}
                    <View style={styles.formContainer}>
                        {/* Current Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Current Password *</Text>
                            <View style={[
                                styles.inputContainer,
                                errors.currentPassword && styles.inputError
                            ]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your current password"
                                    placeholderTextColor="#999"
                                    value={currentPassword}
                                    onChangeText={(text) => {
                                        setCurrentPassword(text);
                                        if (errors.currentPassword) {
                                            setErrors({ ...errors, currentPassword: '' });
                                        }
                                    }}
                                    secureTextEntry={!showCurrentPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    <Ionicons 
                                        name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#999" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.currentPassword ? (
                                <Text style={styles.errorText}>{errors.currentPassword}</Text>
                            ) : null}
                        </View>

                        <View style={styles.divider} />

                        {/* New Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>New Password *</Text>
                            <View style={[
                                styles.inputContainer,
                                errors.newPassword && styles.inputError
                            ]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter new password (min 6 chars)"
                                    placeholderTextColor="#999"
                                    value={newPassword}
                                    onChangeText={(text) => {
                                        setNewPassword(text);
                                        if (errors.newPassword) {
                                            setErrors({ ...errors, newPassword: '' });
                                        }
                                    }}
                                    secureTextEntry={!showNewPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                    <Ionicons 
                                        name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#999" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.newPassword ? (
                                <Text style={styles.errorText}>{errors.newPassword}</Text>
                            ) : (
                                <Text style={styles.hintText}>
                                    <Ionicons name="information-circle-outline" size={14} color="#999" />
                                    {' '}Password must be at least 6 characters
                                </Text>
                            )}
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm New Password *</Text>
                            <View style={[
                                styles.inputContainer,
                                errors.confirmPassword && styles.inputError
                            ]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm your new password"
                                    placeholderTextColor="#999"
                                    value={confirmPassword}
                                    onChangeText={(text) => {
                                        setConfirmPassword(text);
                                        if (errors.confirmPassword) {
                                            setErrors({ ...errors, confirmPassword: '' });
                                        }
                                    }}
                                    secureTextEntry={!showConfirmPassword}
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons 
                                        name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                        size={20} 
                                        color="#999" 
                                    />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword ? (
                                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                            ) : null}
                        </View>
                    </View>

                    {/* Password Requirements */}
                    <View style={styles.requirementsContainer}>
                        <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                        <View style={styles.requirementItem}>
                            <Ionicons 
                                name={newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                                size={18} 
                                color={newPassword.length >= 6 ? "#4CAF50" : "#999"} 
                            />
                            <Text style={[
                                styles.requirementText,
                                newPassword.length >= 6 && styles.requirementMet
                            ]}>
                                At least 6 characters
                            </Text>
                        </View>
                        <View style={styles.requirementItem}>
                            <Ionicons 
                                name={newPassword && newPassword === confirmPassword ? "checkmark-circle" : "ellipse-outline"} 
                                size={18} 
                                color={newPassword && newPassword === confirmPassword ? "#4CAF50" : "#999"} 
                            />
                            <Text style={[
                                styles.requirementText,
                                newPassword && newPassword === confirmPassword && styles.requirementMet
                            ]}>
                                Passwords match
                            </Text>
                        </View>
                        <View style={styles.requirementItem}>
                            <Ionicons 
                                name={newPassword && currentPassword && newPassword !== currentPassword ? "checkmark-circle" : "ellipse-outline"} 
                                size={18} 
                                color={newPassword && currentPassword && newPassword !== currentPassword ? "#4CAF50" : "#999"} 
                            />
                            <Text style={[
                                styles.requirementText,
                                newPassword && currentPassword && newPassword !== currentPassword && styles.requirementMet
                            ]}>
                                New password is different from current
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    iconButton: {
        padding: 4,
    },
    storeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: '#e8f4fd',
        borderRadius: 10,
        padding: 12,
        marginVertical: 16,
        alignItems: 'center',
    },
    infoBannerText: {
        flex: 1,
        fontSize: 13,
        color: '#3498DB',
        marginLeft: 8,
        lineHeight: 18,
    },
    formContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#555',
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#f8f9fa',
    },
    inputError: {
        borderColor: '#FF6B6B',
        borderWidth: 2,
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
        paddingVertical: 2,
    },
    errorText: {
        fontSize: 12,
        color: '#FF6B6B',
        marginTop: 4,
    },
    hintText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#e8e8e8',
        marginVertical: 8,
    },
    requirementsContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    requirementsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    requirementText: {
        fontSize: 13,
        color: '#999',
        marginLeft: 8,
    },
    requirementMet: {
        color: '#4CAF50',
    },
});

export default User_Password_Edit;