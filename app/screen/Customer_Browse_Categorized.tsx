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
  ActivityIndicator,
  RefreshControl,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService, Product } from '../service/api_calls';
import FilterModal, { FilterState } from '../component/FilterModal';

type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc';

const Customer_Browse_Categorized = ({ route, navigation }: any) => {
  const { categoryId, categoryName, searchQuery: initialSearchQuery } = route.params || {
    categoryId: null,
    categoryName: 'Category',
    searchQuery: ''
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const imageBaseUrl = 'http://192.168.0.100/Thrift_Shop_api/';

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    conditions: [],
    minPrice: '',
    maxPrice: ''
  });
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  

  useEffect(() => {
    if (categoryId) {
      fetchProductsByCategory();
    }
  }, [categoryId]);

  useEffect(() => {
    filterAndSortProducts();
  }, [searchQuery, sortOption, products, filters]);

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

  const fetchProductsByCategory = async () => {
    try {
      setLoading(true);
      let data;
      if (categoryId) {
        data = await apiService.getProductsByCategory(categoryId);
      } else {
        data = await apiService.getProducts();
      }
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProductsByCategory();
    setRefreshing(false);
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    // Apply condition filters
    if (filters.conditions.length > 0) {
      filtered = filtered.filter(p =>
        filters.conditions.includes(p.condition || '')
      );
    }

    // Apply price range filters
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      filtered = filtered.filter(p => (p.price || 0) >= min);
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      filtered = filtered.filter(p => (p.price || 0) <= max);
    }

    // Apply sorting
    switch (sortOption) {
      case 'name_asc':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'name_desc':
        filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        break;
      case 'price_asc':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
    }

    setFilteredProducts(filtered);
  };

  const getSortLabel = (option: SortOption): string => {
    switch (option) {
      case 'name_asc': return 'Name A-Z';
      case 'name_desc': return 'Name Z-A';
      case 'price_asc': return 'Price Low-High';
      case 'price_desc': return 'Price High-Low';
    }
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    const hasFilters = newFilters.conditions.length > 0 ||
      newFilters.minPrice !== '' ||
      newFilters.maxPrice !== '';
    setHasActiveFilters(hasFilters);
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setHasActiveFilters(false);
    setFilters({ conditions: [], minPrice: '', maxPrice: '' });
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const imageUrl = item.image ? `${imageBaseUrl}${item.image}` : null;

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.productID })}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={40} color="#ccc" />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{item.name || 'Product'}</Text>
          <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
          <View style={styles.productMeta}>
            <Text style={styles.productCondition}>{item.condition || 'Normal'}</Text>
            <Text style={styles.productQuantity}>Qty: {item.quantity || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading products...</Text>
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

        <Text style={styles.storeTitle} numberOfLines={1}>{categoryName || 'Category'}</Text>
        
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
              placeholder={`Search in ${categoryName || 'Category'}...`}
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={!!initialSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sort & Filter Row */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, styles.sortButton]}
            onPress={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Ionicons name="swap-vertical" size={18} color="#555" />
            <Text style={styles.controlButtonText}>Sort</Text>
            <Ionicons name={showSortDropdown ? "chevron-up" : "chevron-down"} size={18} color="#555" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="options-outline" size={18} color={hasActiveFilters ? '#4CAF50' : '#555'} />
            <Text style={[styles.controlButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
              Filter
            </Text>
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {filters.conditions.length + (filters.minPrice ? 1 : 0) + (filters.maxPrice ? 1 : 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Sort Dropdown */}
        {showSortDropdown && (
          <View style={styles.sortDropdown}>
            {(['name_asc', 'name_desc', 'price_asc', 'price_desc'] as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortOption,
                  sortOption === option && styles.sortOptionSelected
                ]}
                onPress={() => {
                  setSortOption(option);
                  setShowSortDropdown(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortOption === option && styles.sortOptionTextSelected
                ]}>
                  {getSortLabel(option)}
                </Text>
                {sortOption === option && (
                  <Ionicons name="checkmark" size={20} color="#4CAF50" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          <View style={styles.totalProductsHeader}>
            <Text style={styles.sectionTitle}>{categoryName || 'Category'} Products</Text>
            <Text style={styles.productCount}>{filteredProducts.length} items</Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={50} color="#ccc" />
              <Text style={styles.emptyStateText}>
                {searchQuery.trim()
                  ? `No products found for "${searchQuery}"`
                  : hasActiveFilters ? 'No products match your filters' : 'No products found in this category'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <View key={product.productID || Math.random().toString()} style={styles.productWrapper}>
                  {renderProduct({ item: product })}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        initialFilters={filters}
      />
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
  controlsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  sortButton: {
    flex: 1,
  },
  filterButton: {
    flex: 1,
  },
  filterButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#e8f5e9',
  },
  controlButtonText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#4CAF50',
  },
  filterBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sortDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionSelected: {
    backgroundColor: '#e8f5e9',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
  },
  sortOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  productsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  totalProductsHeader: {
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
  productCount: {
    fontSize: 14,
    color: '#666',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#f5f5f5',
  },
  productImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productCondition: {
    fontSize: 10,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productQuantity: {
    fontSize: 10,
    color: '#999',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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

export default Customer_Browse_Categorized;