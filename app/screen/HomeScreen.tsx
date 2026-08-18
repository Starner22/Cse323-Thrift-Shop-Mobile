import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, Category, Product } from '../service/api_calls';
import { useAuth } from '../context/AuthContext';


const HomeScreen = ({ navigation }: any) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [checkingSeller, setCheckingSeller] = useState(false);

  const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCartCount();
  }, []);

  const fetchCartCount = async () => {
    try {
        const count = await apiService.getCartCount();
        setCartCount(count);
    } catch (error) {
        console.error('Error fetching cart count:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
        fetchCartCount();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (isAuthenticated) {
        checkSellerStatus();
    }
  }, [isAuthenticated]);

  const checkSellerStatus = async () => {
    try {
        setCheckingSeller(true);
        const response = await apiService.checkSellerStatus();
        if (response.hasApplied) {
            setSellerStatus(response.status);
        } else {
            setSellerStatus(null);
        }
    } catch (error) {
        console.error('Error checking seller status:', error);
    } finally {
        setCheckingSeller(false);
    }
  };

 const handleSellPress = () => {
      // Case 1: User is not a Seller
      if (user?.role !== 'Seller') {
          navigation.navigate('BecomeSeller');
          return;
      }

      // Case 2: User is a Seller but status == pending
      if (sellerStatus === 'pending') {
          Alert.alert(
              'Application Pending',
              'Your seller application is still under review.\n\n' +
              'You will be able to sell products once approved.\n' +
              'This usually takes 1-2 business days.',
              [{ text: 'OK' }]
          );
          return;
      }

      // Case 3: User is a Seller but status == rejected
      if (sellerStatus === 'rejected') {
          navigation.navigate('SellerClearanceIssue');
          return;
      }

      // Case 4 : User is a Seller bt status == suspended
      if (sellerStatus === 'suspended') {
          Alert.alert(
              'Account Suspended',
              'Your seller account has been suspended.\n\n' +
              'You cannot sell products at this time.\n' +
              'Please contact support for more information.',
              [
                  { text: 'OK' },
                  { 
                      text: 'Contact Support', 
                      onPress: () => {
                          Alert.alert('Contact Support', 'Support will reach out to you shortly.');
                      }
                  }
              ]
          );
          return;
      }

      // Case 5: User is an approved Seller
      if (user?.role === 'Seller' && sellerStatus === 'approved') {
          navigation.navigate('SellerSellProduct');
          return;
      }

      // Fallback
      Alert.alert(
          'Unable to Sell',
          'There was an issue accessing the sell page. Please contact support.',
          [{ text: 'OK' }]
      );
  };



  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get only 6 categories for the home page
      const categoriesData = await apiService.getCategoriesWithCounts(6);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      
      const productsData = await apiService.getProducts();
      const recent = Array.isArray(productsData) ? productsData.slice(0, 6) : [];
      setRecentProducts(recent);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('BrowseAll', { searchQuery: searchQuery.trim() });
      setSearchQuery('');
    } else {
      navigation.navigate('BrowseAll');
    }
  };

  const handleCategoryPress = (categoryId: number, categoryName: string) => {
    navigation.navigate('BrowseCategorized', {
      categoryId: categoryId,
      categoryName: categoryName
    });
  };

  const handleBrowseAll = () => {
    navigation.navigate('BrowseAll');
  };

  const handleSeeAllCategories = () => {
    navigation.navigate('ShowCategories');
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const imageUrl = item.image ? `${imageBaseUrl}${item.image}` : null;
    
    return (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleCategoryPress(item.id, item.name)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.categoryImage} />
        ) : (
          <View style={[styles.categoryImage, styles.categoryImagePlaceholder]}>
            <Text style={styles.categoryImageText}>{item.name?.charAt(0) || '?'}</Text>
          </View>
        )}
        <Text style={styles.categoryName}>{item.name || 'Category'}</Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const imageUrl = item.image ? `${imageBaseUrl}${item.image}` : null;
    
    return (
      <TouchableOpacity 
        style={styles.recentProductCard} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.productID })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.recentProductImage} />
        ) : (
          <View style={[styles.recentProductImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={30} color="#ccc" />
          </View>
        )}
        <View style={styles.recentProductInfo}>
          <Text style={styles.recentProductName} numberOfLines={1}>
            {item.name || 'Product'}
          </Text>
          <Text style={styles.recentProductPrice}>
            ${item.price?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Bar */}
      <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="menu" size={28} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.storeTitle}>Thrift Store</Text>
          
          <View style={styles.rightIcons}>
              <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => {navigation.navigate('Cart');}}
                >
                  <Ionicons name="cart-outline" size={28} color="#333" />
                  {cartCount > 0 && (
                      <View style={styles.cartBadge}>
                          <Text style={styles.cartBadgeText}>
                              {cartCount > 99 ? '99+' : cartCount}
                          </Text>
                      </View>
                  )}
              </TouchableOpacity>
          </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSearch} style={styles.searchIconButton}>
              <Ionicons name="arrow-forward" size={20} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories - Only shows 6 */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={handleSeeAllCategories}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            numColumns={3}
            scrollEnabled={false}
            contentContainerStyle={styles.categoriesGrid}
          />
        </View>

        {/* Recent Products */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Products</Text>
            <TouchableOpacity onPress={handleBrowseAll}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products available</Text>
            </View>
          ) : (
            <View style={styles.recentProductsGrid}>
              {recentProducts.map((product) => (
                <View key={product.productID || Math.random().toString()} style={styles.recentProductWrapper}>
                  {renderProduct({ item: product })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomBarItem} activeOpacity={0.7}>
          <Ionicons name="home" size={26} color="#4CAF50" />
          <Text style={[styles.bottomBarLabel, styles.activeLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.bottomBarItem} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Wishlist')}
        >
            <Ionicons name="heart-outline" size={26} color="#666" />
            <Text style={styles.bottomBarLabel}>Wishlist</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.sellButton} 
            activeOpacity={0.7}
            onPress={handleSellPress}
        >
            <View style={styles.sellButtonInner}>
                <Ionicons name="add" size={32} color="#fff" />
            </View>

            <Text style={[styles.bottomBarLabel, styles.sellLabel]}>Sell</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomBarItem} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={26} color="#666" />
          <Text style={styles.bottomBarLabel}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.bottomBarItem} 
            activeOpacity={0.7}
            onPress={() => {
                if (user?.role === 'Admin') {
                    navigation.navigate('AdminAccount');
                } else if (user?.role === 'Seller') {
                    navigation.navigate('SellerAccount');
                } else if (user?.role === 'Moderator') {
                    navigation.navigate('ModeratorAccount');
                } else {
                    navigation.navigate('Account');
                }
            }}
        >
            <Ionicons name="person-outline" size={26} color="#666" />
            <Text style={styles.bottomBarLabel}>Account</Text>
        </TouchableOpacity>

      </View>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    paddingVertical: 4,
  },
  searchIconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    backgroundColor: '#fff',
    marginTop: 8,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  seeAll: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryImagePlaceholder: {
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  categoryName: {
    fontSize: 11,
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
  },
  recentProductsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recentProductWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  recentProductCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  recentProductImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f5f5f5',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentProductInfo: {
    padding: 8,
  },
  recentProductName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  recentProductPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomBarItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bottomBarLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  activeLabel: {
    color: '#4CAF50',
  },
  sellButton: {
    alignItems: 'center',
    marginTop: -20,
  },
  sellButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sellLabel: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#FF6B6B',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
  },
  cartBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
  },
});

export default HomeScreen;