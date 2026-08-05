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

const Seller_Edit_Business = ({ navigation }: any) => {
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Seller specific fields
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [businessEmail, setBusinessEmail] = useState('');
    const [taxId, setTaxId] = useState('');
    const [bankAccount, setBankAccount] = useState('');
    const [currentStatus, setCurrentStatus] = useState('');

    useEffect(() => {
        fetchSellerProfile();
    }, []);

    const fetchSellerProfile = async () => {
        try {
            setLoading(true);
            const response = await apiService.checkSellerStatus();
            if (response.hasApplied && response.profile) {
                setBusinessName(response.profile.business_name || '');
                setBusinessAddress(response.profile.business_address || '');
                setBusinessPhone(response.profile.business_phone || '');
                setBusinessEmail(response.profile.business_email || '');
                setTaxId(response.profile.tax_id || '');
                setBankAccount(response.profile.bank_account || '');
                setCurrentStatus(response.status || '');
            }
        } catch (error) {
            console.error('Error fetching seller profile:', error);
            Alert.alert('Error', 'Failed to load business profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!businessName.trim()) {
            Alert.alert('Error', 'Business name is required');
            return;
        }

        if (!businessPhone.trim()) {
            Alert.alert('Error', 'Business phone is required');
            return;
        }

        if (businessPhone.trim().length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        setSaving(true);
        try {
            const updateData = {
                business_name: businessName.trim(),
                business_address: businessAddress.trim(),
                business_phone: businessPhone.trim(),
                business_email: businessEmail.trim(),
                tax_id: taxId.trim(),
                bank_account: bankAccount.trim()
            };

            await apiService.updateSellerProfile(updateData);
            
            Alert.alert(
                'Success',
                'Business profile updated! Changes will be reviewed by our team.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update business profile');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (businessName || businessAddress || businessPhone || businessEmail || taxId || bankAccount) {
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

    // ========== Helper Functions for Status ==========
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending':
                return styles.statusPending;
            case 'approved':
                return styles.statusApproved;
            case 'rejected':
                return styles.statusRejected;
            default:
                return styles.statusPending;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return 'time-outline';
            case 'approved':
                return 'checkmark-circle';
            case 'rejected':
                return 'close-circle';
            default:
                return 'time-outline';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return '#FF9F43';
            case 'approved':
                return '#4CAF50';
            case 'rejected':
                return '#FF6B6B';
            default:
                return '#999';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading business profile...</Text>
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
                <Text style={styles.storeTitle}>Edit Business Profile</Text>
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
                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle" size={24} color="#3498DB" />
                        <Text style={styles.infoBannerText}>
                            Changes to your business profile will be reviewed by our team.
                            Your store will remain active during the review process.
                        </Text>
                    </View>

                    {/* Current Status - FIXED */}
                    {currentStatus && (
                        <View style={[styles.statusCard, getStatusStyle(currentStatus)]}>
                            <Ionicons 
                                name={getStatusIcon(currentStatus)} 
                                size={20} 
                                color={getStatusColor(currentStatus)} 
                            />
                            <Text style={styles.statusText}>
                                Status: {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
                            </Text>
                        </View>
                    )}

                    {/* Store Information */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="storefront" size={22} color="#4CAF50" />
                            <Text style={styles.sectionTitle}>Store Information</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Business Name *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="business-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your store name"
                                    value={businessName}
                                    onChangeText={setBusinessName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Business Address</Text>
                            <View style={[styles.inputContainer, styles.textAreaContainer]}>
                                <Ionicons name="location-outline" size={20} color="#999" style={styles.textAreaIcon} />
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Your business address"
                                    value={businessAddress}
                                    onChangeText={setBusinessAddress}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Business Phone *</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="call-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="+8801234567890"
                                    value={businessPhone}
                                    onChangeText={setBusinessPhone}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Business Email</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="store@email.com"
                                    value={businessEmail}
                                    onChangeText={setBusinessEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Financial Information */}
                    <View style={[styles.section, styles.financialSection]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="card-outline" size={22} color="#FF9800" />
                            <Text style={styles.sectionTitle}>Financial Information</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Tax ID / VAT Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="document-text-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="123456789"
                                    value={taxId}
                                    onChangeText={setTaxId}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bank Account Number</Text>
                            <View style={styles.inputContainer}>
                                <Ionicons name="card-outline" size={20} color="#999" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="1234-5678-9012"
                                    value={bankAccount}
                                    onChangeText={setBankAccount}
                                />
                            </View>
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
        flex: 1,
        textAlign: 'center',
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
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    statusPending: {
        backgroundColor: '#fff8f0',
        borderColor: '#FF9F43',
    },
    statusApproved: {
        backgroundColor: '#f0fff4',
        borderColor: '#4CAF50',
    },
    statusRejected: {
        backgroundColor: '#fff5f5',
        borderColor: '#FF6B6B',
    },
    statusText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
        fontWeight: '500',
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    financialSection: {
        borderColor: '#FF9800',
        borderWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginLeft: 8,
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
});

export default Seller_Edit_Business;