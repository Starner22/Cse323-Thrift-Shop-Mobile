import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
  initialFilters?: FilterState;
}

export interface FilterState {
  conditions: string[];
  minPrice: string;
  maxPrice: string;
}

const CONDITION_OPTIONS = ['Excellent', 'Good', 'Normal', 'Subpar'];

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApply,
  onReset,
  initialFilters
}) => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    if (initialFilters) {
      setSelectedConditions(initialFilters.conditions || []);
      setMinPrice(initialFilters.minPrice || '');
      setMaxPrice(initialFilters.maxPrice || '');
    }
  }, [initialFilters, visible]);

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev => {
      if (prev.includes(condition)) {
        return prev.filter(c => c !== condition);
      } else {
        return [...prev, condition];
      }
    });
  };

  const handleApply = () => {
    // Validate price range
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    
    if (minPrice && maxPrice && min > max) {
      Alert.alert('Invalid Range', 'Minimum price cannot be greater than maximum price');
      return;
    }
    
    onApply({
      conditions: selectedConditions,
      minPrice: minPrice,
      maxPrice: maxPrice
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedConditions([]);
    setMinPrice('');
    setMaxPrice('');
    onReset();
    onClose();
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return '#4CAF50';
      case 'Good': return '#8BC34A';
      case 'Normal': return '#FFC107';
      case 'Subpar': return '#FF9800';
      default: return '#999';
    }
  };

  const getConditionEmoji = (condition: string) => {
    switch (condition) {
      case 'Excellent': return '⭐';
      case 'Good': return '👍';
      case 'Normal': return '👌';
      case 'Subpar': return '⚠️';
      default: return '📦';
    }
  };

  const hasActiveFilters = selectedConditions.length > 0 || minPrice || maxPrice;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackground} />
        </TouchableWithoutFeedback>
        
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Condition Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Condition</Text>
              <Text style={styles.sectionSubtitle}>Select one or more conditions</Text>
              <View style={styles.conditionsGrid}>
                {CONDITION_OPTIONS.map((condition) => {
                  const isSelected = selectedConditions.includes(condition);
                  return (
                    <TouchableOpacity
                      key={condition}
                      style={[
                        styles.conditionChip,
                        isSelected && styles.conditionChipSelected,
                        { borderColor: isSelected ? getConditionColor(condition) : '#ddd' }
                      ]}
                      onPress={() => toggleCondition(condition)}
                    >
                      <Text style={[
                        styles.conditionChipText,
                        isSelected && styles.conditionChipTextSelected
                      ]}>
                        {getConditionEmoji(condition)} {condition}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={getConditionColor(condition)} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedConditions.length > 0 && (
                <Text style={styles.selectedCount}>
                  {selectedConditions.length} condition{selectedConditions.length > 1 ? 's' : ''} selected
                </Text>
              )}
            </View>

            {/* Price Range Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Range</Text>
              <Text style={styles.sectionSubtitle}>Set minimum and maximum price</Text>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="$0"
                    placeholderTextColor="#999"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.priceSeparator}>—</Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="$1000"
                    placeholderTextColor="#999"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <View style={styles.activeFiltersContainer}>
                <Text style={styles.activeFiltersTitle}>Active Filters:</Text>
                <View style={styles.activeFiltersList}>
                  {selectedConditions.map((condition) => (
                    <View key={condition} style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>{condition}</Text>
                    </View>
                  ))}
                  {minPrice && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>Min ${minPrice}</Text>
                    </View>
                  )}
                  {maxPrice && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>Max ${maxPrice}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleReset}
            >
              <Ionicons name="refresh-outline" size={20} color="#666" />
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.applyButton, hasActiveFilters && styles.applyButtonActive]}
              onPress={handleApply}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
              {hasActiveFilters && (
                <View style={styles.applyBadge}>
                  <Text style={styles.applyBadgeText}>
                    {selectedConditions.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  conditionChipSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
  },
  conditionChipText: {
    fontSize: 13,
    color: '#555',
    marginRight: 4,
  },
  conditionChipTextSelected: {
    color: '#333',
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  priceSeparator: {
    fontSize: 18,
    color: '#999',
    marginHorizontal: 12,
  },
  activeFiltersContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  activeFiltersTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  activeFiltersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  activeFilterChip: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  applyButtonActive: {
    backgroundColor: '#4CAF50',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  applyBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  applyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FilterModal;