import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { apiService } from '../service/api_calls';

const User_Edit_Profile  = ({ navigation }: any) => {
    const { user, updateUser } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    
    // Password change fields
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showPasswordSection, setShowPasswordSection] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
            setPhone(user.phone || '');
            setAddress(user.address || '');
        }
    }, [user]);

    const handleSave = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert('Error', 'Name is required');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email');
            return;
        }

        setSaving(true);
        try {
            const updateData: any = {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                address: address.trim()
            };

            // If changing password
            if (showPasswordSection && newPassword) {
                if (newPassword.length < 6) {
                    Alert.alert('Error', 'New password must be at least 6 characters');
                    setSaving(false);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    Alert.alert('Error', 'Passwords do not match');
                    setSaving(false);
                    return;
                }
                updateData.currentPassword = currentPassword;
                updateData.newPassword = newPassword;
            }

            await apiService.updateUserProfile(updateData);
            
            // Update local user data
            await updateUser(updateData);
            
            Alert.alert(
                'Success',
                'Profile updated successfully!',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Discard Changes',
            'Are you sure you want to discard your changes?',
            [
                { text: 'Stay', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading profile...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={handleCancel} style={styles.iconButton}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Edit Profile</Text>
                <TouchableOpacity 
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
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
                    {/* Profile Picture Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarContainer}>
                            <View style={[styles.avatar, { backgroundColor: '#4CAF50' }]}>
                                <Text style={styles.avatarText}>
                                    {name ? name.substring(0, 2).toUpperCase() : '?'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.changePhotoButton}>
                                <Ionicons name="camera" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.avatarHint}>Tap camera to change photo</Text>
                    </View>

                    {/* Personal Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="person-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your full name"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="your@email.com"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+8801234567890"
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Address</Text>
                            <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                <Ionicons name="location-outline" size={20} color="#999" style={styles.textAreaIcon} />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Your address"
                                    value={address}
                                    onChangeText={setAddress}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Change Password Toggle */}
                    <TouchableOpacity 
                        style={styles.passwordToggle}
                        onPress={() => setShowPasswordSection(!showPasswordSection)}
                    >
                        <View style={styles.passwordToggleLeft}>
                            <Ionicons name="lock-closed-outline" size={22} color="#4CAF50" />
                            <Text style={styles.passwordToggleText}>Change Password</Text>
                        </View>
                        <Ionicons 
                            name={showPasswordSection ? "chevron-up" : "chevron-down"} 
                            size={22} 
                            color="#999" 
                        />
                    </TouchableOpacity>

                    {/* Password Section */}
                    {showPasswordSection && (
                        <View style={styles.section}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Current Password *</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#999" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter current password"
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        secureTextEntry={!showCurrentPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                        <Ionicons 
                                            name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={20} 
                                            color="#999" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>New Password *</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#999" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter new password (min 6 chars)"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry={!showNewPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                        <Ionicons 
                                            name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={20} 
                                            color="#999" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Confirm New Password *</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="lock-closed-outline" size={20} color="#999" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Confirm new password"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons 
                                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                                            size={20} 
                                            color="#999" 
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.passwordHint}>
                                <Ionicons name="information-circle-outline" size={16} color="#999" />
                                <Text style={styles.passwordHintText}>
                                    Password must be at least 6 characters long
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Delete Account Section */}
                    <TouchableOpacity style={styles.deleteAccountButton}>
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                        <Text style={styles.deleteAccountText}>Delete Account</Text>
                    </TouchableOpacity>

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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
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
    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: '#fff',
        borderRadius: 12,
        marginTop: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    changePhotoButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#4CAF50',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    // Section
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
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
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#333',
        paddingVertical: 2,
    },
    textAreaContainer: {
        alignItems: 'flex-start',
        paddingVertical: 8,
    },
    textAreaIcon: {
        marginTop: 4,
    },
    textArea: {
        textAlignVertical: 'top',
        minHeight: 70,
        paddingVertical: 4,
    },
    // Password Toggle
    passwordToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    passwordToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordToggleText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
        fontWeight: '500',
    },
    passwordHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    passwordHintText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 6,
    },
    // Delete Account
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF6B6B',
        marginBottom: 16,
    },
    deleteAccountText: {
        fontSize: 16,
        color: '#FF6B6B',
        fontWeight: '500',
        marginLeft: 8,
    },
});

export default User_Edit_Profile ;