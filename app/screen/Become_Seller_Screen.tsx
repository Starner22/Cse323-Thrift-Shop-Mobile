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

const BecomeSellerScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);

    // Form fields
    const [businessName, setBusinessName] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [businessEmail, setBusinessEmail] = useState('');
    const [taxId, setTaxId] = useState('');
    const [bankAccount, setBankAccount] = useState('');

    useEffect(() => {
        checkApplicationStatus();
    }, []);

    const checkApplicationStatus = async () => {
        try {
            setChecking(true);
            const response = await apiService.checkSellerStatus();
            setHasApplied(response.hasApplied);
            setApplicationStatus(response.status);
            setCanEdit(response.canEdit || false);
            
            if (response.profile) {
                setProfileData(response.profile);
                // Pre-fill form with existing data
                setBusinessName(response.profile.business_name || '');
                setBusinessAddress(response.profile.business_address || '');
                setBusinessPhone(response.profile.business_phone || '');
                setBusinessEmail(response.profile.business_email || '');
                setTaxId(response.profile.tax_id || '');
                setBankAccount(response.profile.bank_account || '');
            }
        } catch (error) {
            console.error('Error checking status:', error);
        } finally {
            setChecking(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!businessName.trim()) {
            Alert.alert('Error', 'Business name is required');
            return;
        }
        if (!businessPhone.trim()) {
            Alert.alert('Error', 'Phone number is required');
            return;
        }
        if (businessPhone.trim().length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number');
            return;
        }

        setLoading(true);
        try {
            const response = await apiService.applySeller({
                business_name: businessName.trim(),
                business_address: businessAddress.trim(),
                business_phone: businessPhone.trim(),
                business_email: businessEmail.trim(),
                tax_id: taxId.trim(),
                bank_account: bankAccount.trim()
            });

            if (response.success) {
                Alert.alert(
                    'Application Submitted!',
                    response.message || 'Your application is under review. We\'ll notify you once approved.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert('Error', response.message || 'Failed to submit application');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const renderStatus = () => {
        if (!hasApplied) return null;

        switch (applicationStatus) {
            case 'pending':
                return (
                    <View style={[styles.statusCard, styles.statusPending]}>
                        <Ionicons name="time-outline" size={24} color="#FF9F43" />
                        <Text style={styles.statusTitle}>Application Under Review</Text>
                        <Text style={styles.statusText}>
                            Your application is being reviewed by our team. 
                            This usually takes 1-2 business days.
                        </Text>
                    </View>
                );
            case 'approved':
                return (
                    <View style={[styles.statusCard, styles.statusApproved]}>
                        <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        <Text style={styles.statusTitle}>You're a Seller! 🎉</Text>
                        <Text style={styles.statusText}>
                            Your account has been approved. You can now list products for sale!
                        </Text>
                        <TouchableOpacity 
                            style={styles.goToListButton}
                            onPress={() => navigation.navigate('Sell')}
                        >
                            <Text style={styles.goToListButtonText}>Start Selling Now</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'rejected':
                return (
                    <View style={[styles.statusCard, styles.statusRejected]}>
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                        <Text style={styles.statusTitle}>Application Rejected</Text>
                        <Text style={styles.statusText}>
                            {profileData?.rejected_reason || 'Your application was not approved. Please review and resubmit.'}
                        </Text>
                        <View style={styles.statusActions}>
                            <TouchableOpacity 
                                style={styles.editButton}
                                onPress={() => {
                                    // Enable edit mode - scroll to form
                                    setCanEdit(true);
                                    // Scroll to form (you can implement scrollTo)
                                }}
                            >
                                <Ionicons name="create-outline" size={18} color="#fff" />
                                <Text style={styles.editButtonText}>Edit & Resubmit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.contactSupportButton}
                                onPress={() => Alert.alert('Contact Support', 'Support will reach out to you shortly.')}
                            >
                                <Text style={styles.contactSupportText}>Contact Support</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    if (checking) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Checking application status...</Text>
            </SafeAreaView>
        );
    }

    // If already approved, show seller info
    if (hasApplied && applicationStatus === 'approved') {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>Seller Status</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {renderStatus()}
                    <View style={styles.infoCard}>
                        <Ionicons name="storefront" size={40} color="#4CAF50" />
                        <Text style={styles.infoTitle}>Your Store</Text>
                        <Text style={styles.infoText}>{profileData?.business_name}</Text>
                        <Text style={styles.infoSubtext}>{profileData?.business_address}</Text>
                        <Text style={styles.infoSubtext}>{profileData?.business_phone}</Text>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // Show form for: new application OR rejected (with edit mode)
    const showForm = !hasApplied || (hasApplied && applicationStatus === 'rejected');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>
                    {applicationStatus === 'rejected' ? 'Resubmit Application' : 'Become a Seller'}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Status Card */}
                    {hasApplied && renderStatus()}

                    {/* Info Banner */}
                    {showForm && (
                        <>
                            <View style={styles.infoBanner}>
                                <Ionicons name="information-circle" size={24} color="#3498DB" />
                                <Text style={styles.infoBannerText}>
                                    {applicationStatus === 'rejected' 
                                        ? 'Please review and correct your application details below.'
                                        : 'Fill in your business details to start selling on Thrift Store.'}
                                </Text>
                            </View>

                            {/* Form */}
                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Business Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Your store name"
                                        value={businessName}
                                        onChangeText={setBusinessName}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Business Address</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Full business address"
                                        value={businessAddress}
                                        onChangeText={setBusinessAddress}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Phone Number *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="+8801234567890"
                                        value={businessPhone}
                                        onChangeText={setBusinessPhone}
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Business Email</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="store@email.com"
                                        value={businessEmail}
                                        onChangeText={setBusinessEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Tax ID / VAT Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="123456789"
                                        value={taxId}
                                        onChangeText={setTaxId}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Bank Account Number</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="1234-5678-9012"
                                        value={bankAccount}
                                        onChangeText={setBankAccount}
                                    />
                                </View>

                                <TouchableOpacity 
                                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>
                                            {applicationStatus === 'rejected' ? 'Resubmit Application' : 'Submit Application'}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.noteContainer}>
                                    <Ionicons name="shield-checkmark" size={20} color="#999" />
                                    <Text style={styles.noteText}>
                                        {applicationStatus === 'rejected' 
                                            ? 'Your application will be reviewed again. Please ensure all information is correct.'
                                            : 'Your information is secure. We\'ll review your application within 1-2 business days.'}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
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
    form: {
        marginTop: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
        backgroundColor: '#fff',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 16,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    noteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    noteText: {
        flex: 1,
        fontSize: 12,
        color: '#999',
        marginLeft: 6,
        lineHeight: 18,
    },
    statusCard: {
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
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
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    statusActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flex: 1,
        justifyContent: 'center',
    },
    editButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
    },
    contactSupportButton: {
        backgroundColor: '#FF6B6B',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contactSupportText: {
        color: '#fff',
        fontWeight: '600',
    },
    goToListButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
        marginTop: 12,
    },
    goToListButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    infoCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 8,
    },
    infoText: {
        fontSize: 16,
        color: '#555',
        marginTop: 4,
    },
    infoSubtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 2,
    },
});

export default BecomeSellerScreen;