
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
    Platform,
    Image,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { apiService, Category } from '../service/api_calls';

const Seller_Sell_Product = ({ navigation }: any) => {
    const { user, isAuthenticated } = useAuth();
    
    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [categoryID, setCategoryID] = useState<number | null>(null);
    const [condition, setCondition] = useState('Good');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [image, setImage] = useState<string | null>(null);
    
    // UI states
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showConditionDropdown, setShowConditionDropdown] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);

    const [isSuspended, setIsSuspended] = useState(false);


    const conditionOptions = ['Excellent', 'Good', 'Normal', 'Subpar'];

    useEffect(() => {
        fetchCategories();
        requestPermissions();
        checkSellerStatus();
    }, []);

    const checkSellerStatus = async () => {
        try {
            const response = await apiService.checkSellerStatus();
            if (response.hasApplied && response.status === 'suspended') {
                setIsSuspended(true);
                Alert.alert(
                    'Account Suspended',
                    'Your seller account has been suspended. You cannot list new products.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (error) {
            console.error('Error checking seller status:', error);
        }
    };


    const requestPermissions = async () => {
        // Request camera and gallery permissions
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
            Alert.alert(
                'Permissions Required',
                'Camera and gallery permissions are needed to upload product images.'
            );
        }
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const data = await apiService.getCategories();
            setCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            Alert.alert('Error', 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async (source: 'camera' | 'gallery') => {
        setShowImageOptions(false);
        
        try {
            let result;
            
            if (source === 'camera') {
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                    base64: true,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.7,
                    base64: true,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                // Use base64 for upload or uri for display
                if (asset.base64) {
                    setImage(`data:image/jpeg;base64,${asset.base64}`);
                } else {
                    setImage(asset.uri);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const validateForm = () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Product name is required');
            return false;
        }
        
        if (name.trim().length < 3) {
            Alert.alert('Validation Error', 'Product name must be at least 3 characters');
            return false;
        }
        
        if (!description.trim()) {
            Alert.alert('Validation Error', 'Description is required');
            return false;
        }
        
        if (description.trim().length < 10) {
            Alert.alert('Validation Error', 'Description must be at least 10 characters');
            return false;
        }
        
        if (!categoryID) {
            Alert.alert('Validation Error', 'Please select a category');
            return false;
        }
        
        if (!price) {
            Alert.alert('Validation Error', 'Price is required');
            return false;
        }
        
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            Alert.alert('Validation Error', 'Please enter a valid price');
            return false;
        }
        
        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 1) {
            Alert.alert('Validation Error', 'Quantity must be at least 1');
            return false;
        }
        
        if (!image) {
            Alert.alert('Validation Error', 'Please add a product image');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const formData = {
                name: name.trim(),
                description: description.trim(),
                categoryID: categoryID,
                condition: condition,
                price: parseFloat(price),
                quantity: parseInt(quantity),
                image: image // Base64 image
            };

            const response = await apiService.createProduct(formData);
            
            if (response.success) {
                Alert.alert(
                    'Success!',
                    'Your product has been submitted for review.\n\n' +
                    'Status: Pending Approval\n' +
                    'You will be notified once approved.',
                    [
                        { 
                            text: 'View My Products', 
                            onPress: () => navigation.navigate('SellerMyProducts')
                        },
                        { text: 'Done', onPress: () => navigation.goBack() }
                    ]
                );
                // Reset form
                resetForm();
            } else {
                Alert.alert('Error', response.message || 'Failed to submit product');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setCategoryID(null);
        setCondition('Good');
        setPrice('');
        setQuantity('1');
        setImage(null);
    };

    const getCategoryName = (id: number) => {
        const category = categories.find(c => c.id === id);
        return category ? category.name : 'Select Category';
    };

    if (isSuspended) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.storeTitle}>Sell Product</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.suspendedContainer}>
                    <Ionicons name="ban-outline" size={60} color="#6C5CE7" />
                    <Text style={styles.suspendedTitle}>Account Suspended</Text>
                    <Text style={styles.suspendedText}>
                        Your seller account has been suspended. You cannot list new products.
                    </Text>
                    <TouchableOpacity 
                        style={styles.contactSupportButton}
                        onPress={() => Alert.alert('Contact Support', 'Support will reach out to you shortly.')}
                    >
                        <Text style={styles.contactSupportButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    if (!isAuthenticated) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#fff" />
                <View style={styles.authRequiredContainer}>
                    <Ionicons name="storefront-outline" size={80} color="#ccc" />
                    <Text style={styles.authRequiredText}>Login Required</Text>
                    <Text style={styles.authRequiredSubtext}>
                        Please login to sell products
                    </Text>
                    <TouchableOpacity 
                        style={styles.loginButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginButtonText}>Go to Login</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Top Bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.storeTitle}>Sell Product</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Image Upload */}
                    <View style={styles.imageSection}>
                        <Text style={styles.sectionLabel}>Product Image *</Text>
                        <TouchableOpacity 
                            style={styles.imageUploadContainer}
                            onPress={() => setShowImageOptions(true)}
                        >
                            {image ? (
                                <Image source={{ uri: image }} style={styles.productImage} />
                            ) : (
                                <View style={styles.imagePlaceholder}>
                                    <Ionicons name="camera-outline" size={50} color="#ccc" />
                                    <Text style={styles.imagePlaceholderText}>
                                        Tap to add image
                                    </Text>
                                    <Text style={styles.imagePlaceholderSubtext}>
                                        Camera or Gallery
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Product Name */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter product name"
                            value={name}
                            onChangeText={setName}
                            maxLength={100}
                        />
                        <Text style={styles.charCount}>{name.length}/100</Text>
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Describe your product in detail"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            maxLength={500}
                        />
                        <Text style={styles.charCount}>{description.length}/500</Text>
                    </View>

                    {/* Category Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <TouchableOpacity 
                            style={styles.dropdown}
                            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        >
                            <Text style={[styles.dropdownText, !categoryID && styles.dropdownPlaceholder]}>
                                {categoryID ? getCategoryName(categoryID) : 'Select Category'}
                            </Text>
                            <Ionicons name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                        </TouchableOpacity>
                        
                        {showCategoryDropdown && (
                            <View style={styles.dropdownListContainer}>
                                <ScrollView 
                                    style={styles.dropdownScrollView}
                                    nestedScrollEnabled={true}
                                    showsVerticalScrollIndicator={true}
                                >
                                    {categories.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.dropdownItem,
                                                categoryID === cat.id && styles.dropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setCategoryID(cat.id);
                                                setShowCategoryDropdown(false);
                                            }}
                                        >
                                            <Text style={[
                                                styles.dropdownItemText,
                                                categoryID === cat.id && styles.dropdownItemTextSelected
                                            ]}>
                                                {cat.name}
                                            </Text>
                                            {categoryID === cat.id && (
                                                <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* Condition Dropdown */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Condition *</Text>
                        <TouchableOpacity 
                            style={styles.dropdown}
                            onPress={() => setShowConditionDropdown(!showConditionDropdown)}
                        >
                            <Text style={styles.dropdownText}>{condition}</Text>
                            <Ionicons name={showConditionDropdown ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                        </TouchableOpacity>
                        
                        {showConditionDropdown && (
                            <View style={styles.dropdownList}>
                                {conditionOptions.map((cond) => (
                                    <TouchableOpacity
                                        key={cond}
                                        style={[
                                            styles.dropdownItem,
                                            condition === cond && styles.dropdownItemSelected
                                        ]}
                                        onPress={() => {
                                            setCondition(cond);
                                            setShowConditionDropdown(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            condition === cond && styles.dropdownItemTextSelected
                                        ]}>
                                            {cond}
                                        </Text>
                                        {condition === cond && (
                                            <Ionicons name="checkmark" size={20} color="#4CAF50" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Price */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Price *</Text>
                        <View style={styles.priceContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <TextInput
                                style={[styles.input, styles.priceInput]}
                                placeholder="0.00"
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {/* Quantity */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantity *</Text>
                        <View style={styles.quantityContainer}>
                            <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => {
                                    const val = parseInt(quantity) || 1;
                                    if (val > 1) setQuantity(String(val - 1));
                                }}
                            >
                                <Ionicons name="remove" size={20} color="#333" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.quantityInput}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="number-pad"
                            />
                            <TouchableOpacity 
                                style={styles.quantityButton}
                                onPress={() => {
                                    const val = parseInt(quantity) || 1;
                                    setQuantity(String(val + 1));
                                }}
                            >
                                <Ionicons name="add" size={20} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity 
                        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
                                <Text style={styles.submitButtonText}>Submit Request</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Info Note */}
                    <View style={styles.noteContainer}>
                        <Ionicons name="information-circle" size={20} color="#3498DB" />
                        <Text style={styles.noteText}>
                            Your product will be reviewed by our moderators.
                            You will be notified once approved or rejected.
                            Approval usually takes 1-2 business days.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Image Options Modal */}
            <Modal
                visible={showImageOptions}
                transparent
                animationType="slide"
                onRequestClose={() => setShowImageOptions(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity 
                        style={styles.modalBackground}
                        onPress={() => setShowImageOptions(false)}
                    />
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Product Image</Text>
                        <Text style={styles.modalSubtitle}>Choose an option</Text>
                        
                        <View style={styles.modalOptions}>
                            <TouchableOpacity 
                                style={styles.modalOption}
                                onPress={() => pickImage('camera')}
                            >
                                <View style={[styles.modalOptionIcon, { backgroundColor: '#e8f5e9' }]}>
                                    <Ionicons name="camera" size={30} color="#4CAF50" />
                                </View>
                                <Text style={styles.modalOptionText}>Take Photo</Text>
                                <Text style={styles.modalOptionSubtext}>Capture with camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.modalOption}
                                onPress={() => pickImage('gallery')}
                            >
                                <View style={[styles.modalOptionIcon, { backgroundColor: '#e3f2fd' }]}>
                                    <Ionicons name="images" size={30} color="#2196F3" />
                                </View>
                                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
                                <Text style={styles.modalOptionSubtext}>Select existing photo</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={styles.modalCancelButton}
                            onPress={() => setShowImageOptions(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    // Image Upload
    imageSection: {
        marginVertical: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    imageUploadContainer: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        backgroundColor: '#f8f9fa',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePlaceholderText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    imagePlaceholderSubtext: {
        fontSize: 12,
        color: '#bbb',
        marginTop: 4,
    },
    // Inputs
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
        minHeight: 100,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    // Dropdown
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#fff',
    },
    dropdownText: {
        fontSize: 15,
        color: '#333',
    },
    dropdownPlaceholder: {
        color: '#999',
    },
    dropdownList: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
        maxHeight: 200,
        overflow: 'scroll',
    },
    // Price
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
    },
    priceInput: {
        flex: 1,
    },
    // Quantity
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    quantityButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#f8f9fa',
        borderRightWidth: 1,
        borderColor: '#eee',
    },
    quantityInput: {
        flex: 1,
        textAlign: 'center',
        fontSize: 16,
        color: '#333',
        paddingVertical: 12,
    },
    // Submit
    submitButton: {
        flexDirection: 'row',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 16,
        gap: 8,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    // Note
    noteContainer: {
        flexDirection: 'row',
        backgroundColor: '#e8f4fd',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    noteText: {
        flex: 1,
        fontSize: 13,
        color: '#3498DB',
        marginLeft: 8,
        lineHeight: 18,
    },
    // Auth Required
    authRequiredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    authRequiredText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    authRequiredSubtext: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
        textAlign: 'center',
    },
    loginButton: {
        marginTop: 24,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackground: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 34,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 4,
        marginBottom: 20,
    },
    modalOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 12,
    },
    modalOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e8e8e8',
    },
    modalOptionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    modalOptionSubtext: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    modalCancelButton: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },

    dropdownListContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    maxHeight: 200,  // Limit height
    overflow: 'hidden',
    },
    dropdownScrollView: {
        maxHeight: 200,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemSelected: {
        backgroundColor: '#e8f5e9',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#333',
    },
    dropdownItemTextSelected: {
        color: '#4CAF50',
        fontWeight: '600',
    },

    suspendedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        backgroundColor: '#f8f9fa',
    },
    suspendedTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
    },
    suspendedText: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    contactSupportButton: {
        marginTop: 24,
        backgroundColor: '#6C5CE7',
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 10,
    },
    contactSupportButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

});

export default Seller_Sell_Product;