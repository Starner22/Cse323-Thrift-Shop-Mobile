import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Seller_Clearance_Issue = ({ navigation }: any) => {
    const handleContactSupport = () => {
        Alert.alert(
            'Contact Support',
            'Support team will reach out to you shortly.',
            [{ text: 'OK' }]
        );
    };

    const handleResubmit = () => {
        navigation.navigate('BecomeSeller');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Clearance Issue</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-outline" size={80} color="#FF6B6B" />
                </View>

                <Text style={styles.title}>Cannot Sell Products</Text>
                
                <Text style={styles.subtitle}>
                    Your seller account has not been approved. You need clearance to list products for sale.
                </Text>

                <View style={styles.card}>
                    <View style={styles.cardItem}>
                        <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
                        <View style={styles.cardItemText}>
                            <Text style={styles.cardItemTitle}>Status: Rejected</Text>
                            <Text style={styles.cardItemSubtitle}>
                                Your seller application was not approved.
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.cardItem}>
                        <Ionicons name="document-text" size={24} color="#3498DB" />
                        <View style={styles.cardItemText}>
                            <Text style={styles.cardItemTitle}>What can you do?</Text>
                            <Text style={styles.cardItemSubtitle}>
                                • Submit a new seller application
                            </Text>
                            <Text style={styles.cardItemSubtitle}>
                                • Contact support for more details
                            </Text>
                        </View>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.button, styles.resubmitButton]}
                    onPress={handleResubmit}
                >
                    <Ionicons name="create-outline" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Submit New Application</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.supportButton]}
                    onPress={handleContactSupport}
                >
                    <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                    <Text style={styles.buttonText}>Contact Support</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.goBackButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </ScrollView>
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
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 40,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    cardItem: {
        flexDirection: 'row',
        paddingVertical: 8,
    },
    cardItemText: {
        flex: 1,
        marginLeft: 12,
    },
    cardItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    cardItemSubtitle: {
        fontSize: 13,
        color: '#666',
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 8,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 10,
        width: '100%',
        marginBottom: 12,
        gap: 8,
    },
    resubmitButton: {
        backgroundColor: '#4CAF50',
    },
    supportButton: {
        backgroundColor: '#FF6B6B',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    goBackButton: {
        paddingVertical: 12,
        marginTop: 8,
    },
    goBackText: {
        color: '#666',
        fontSize: 15,
    },
});

export default Seller_Clearance_Issue;