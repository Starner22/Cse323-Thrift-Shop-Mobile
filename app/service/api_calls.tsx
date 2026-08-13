import StorageService from './StorageService';

const API_URL = `http://172.20.144.60/Thrift_Shop_api/api`;
const AUTH_URL = `http://172.20.144.60/Thrift_Shop_api/auth`;

// Types
export interface Category {
  id: number;
  name: string;
  image: string;
  productCount?: number;
}

export interface Product {
  productID: number;
  name: string;
  description: string;
  price: number;
  condition: 'Excellent' | 'Good' | 'Normal' | 'Subpar';
  quantity: number;
  categoryID: number | null;
  categoryName?: string;
  image: string; 
  sellerID: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    user: {
        userID: number;
        name: string;
        email: string;
        role: 'Admin' | 'Moderator' | 'Seller' | 'Buyer';
        permissions?: {
            can_moderate_sellers: boolean;
            can_moderate_products: boolean;
            can_approve_new_sellers: boolean;
            can_approve_new_products: boolean;
            can_manage_reports: boolean;
            can_view_analytics: boolean;
            can_manage_moderators: boolean;
        };
    };
    message?: string;
}


export interface RegisterResponse {
    success: boolean;
    message: string;
}

export interface ProductWithCategory extends Product {
  categoryName?: string;
}

// API Service
class ApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    requireAuth: boolean = false
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    console.log('Fetching:', url);
    
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add auth token if required
      if (requireAuth) {
        const token = await StorageService.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          console.log('Token added to request');
        } else {
          throw new Error('Authentication required');
        }
      }

      const response = await fetch(url, {
        headers,
        ...options,
      });

      console.log('Response status:', response.status);

      // Handle 401 issues
      if (response.status === 401) {
        console.log('Session expired');
        await StorageService.clearAll();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const text = await response.text();
        console.log('Error response:', text.substring(0, 200));
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  // ========== AUTH REQUEST METHOD ==========


  private async authRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${AUTH_URL}${endpoint}`;
    console.log('Auth request:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        ...options,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.log('Error response:', text.substring(0, 200));
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Auth error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await this.authRequest<LoginResponse>('/login.php', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.token) {
        await StorageService.storeToken(response.token);
        await StorageService.storeUser(response.user);
        console.log('Login successful');
      }

      return response;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }


  async register(name: string, email: string, password: string): Promise<RegisterResponse> {
    try {
      return await this.authRequest<RegisterResponse>('/register.php', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
    } catch (error: any) {
      console.error('Register error:', error);
      throw error;
    }
  }


async getCurrentUser(): Promise<any | null> {
    try {
        const storedUser = await StorageService.getUser();
        if (storedUser) {
            return storedUser;
        }

        const response = await this.request<any>('/auth/verify.php', {
            method: 'POST',
        }, true);

        if (response && response.valid && response.user) {
            // Ensure permissions exist with defaults
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
            await StorageService.storeUser(userWithPermissions);
            return userWithPermissions;
        }
        return null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}


  async logout(): Promise<void> {
    await StorageService.clearAll();
    console.log('Logout successful');
  }


  // ========== CATEGORY METHODS ==========

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/category.php');
  }

  async getCategoriesWithCounts(limit?: number): Promise<Category[]> {
    try {
      let endpoint = '/category.php?count=true';
      if (limit) {
        endpoint += `&limit=${limit}`;
      }
      const result = await this.request<Category[]>(endpoint);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching categories with counts:', error);
      return [];
    }
  }

  // ========== PRODUCT METHODS ==========

  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/product.php');
  }

  async getProductsByCategory(categoryID: number): Promise<Product[]> {
    return this.request<Product[]>(`/product.php?category=${categoryID}`);
  }

  async getProduct(productID: number): Promise<Product> {
    return this.request<Product>(`/product.php?id=${productID}`);
  }

  async getProductById(productId: number): Promise<Product | null> {
      const result = await this.request<Product>(`/product.php?id=${productId}`);
      return result || null;
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.request<Product[]>(`/product.php?search=${encodeURIComponent(query)}`);
  }

  async getProductsSorted(sort: string = 'name_asc'): Promise<Product[]> {
    try {
      const result = await this.request<Product[]>(`/product.php?sort=${sort}`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching sorted products:', error);
      return [];
    }
  }

  async getProductsByCategorySorted(categoryID: number, sort: string = 'name_asc'): Promise<Product[]> {
    try {
      const result = await this.request<Product[]>(`/product.php?category=${categoryID}&sort=${sort}`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error fetching sorted products by category:', error);
      return [];
    }
  }

  // ========== WISHLIST METHODS ==========

  async getWishlist(): Promise<any[]> {
      try {
          return await this.request<any[]>('/wishlist.php', {}, true);
      } catch (error) {
          console.error('Error fetching wishlist:', error);
          return [];
      }
  }

  async addToWishlist(productId: number): Promise<any> {
      try {
          return await this.request<any>('/wishlist.php', {
              method: 'POST',
              body: JSON.stringify({ productId }),
          }, true);
      } catch (error) {
          console.error('Error adding to wishlist:', error);
          throw error;
      }
  }


  async removeFromWishlist(wishlistItemId: number): Promise<any> {
      try {
          return await this.request<any>('/wishlist.php', {
              method: 'DELETE',
              body: JSON.stringify({ wishlistItemId }),
          }, true);
      } catch (error) {
          console.error('Error removing from wishlist:', error);
          throw error;
      }
  }

  async isInWishlist(productId: number): Promise<boolean> {
      try {
          const wishlist = await this.getWishlist();
          return wishlist.some(item => item.productID === productId);
      } catch (error) {
          console.error('Error checking wishlist:', error);
          return false;
      }
  }

  // ========== SELLER METHODS ==========

  async checkSellerStatus(): Promise<any> {
      try {
          const response = await this.request<any>('/seller_apply.php', {}, true);
          return {
              hasApplied: response.hasApplied || false,
              status: response.status || null,  // 'pending', 'approved', 'rejected', 'suspended'
              canEdit: response.canEdit || false,
              profile: response.profile || null,
              message: response.message || ''
          };
      } catch (error) {
          console.error('Error checking seller status:', error);
          return { hasApplied: false, status: null, canEdit: false };
      }
  }

  async applySeller(data: any): Promise<any> {
      try {
          return await this.request<any>('/seller_apply.php', {
              method: 'POST',
              body: JSON.stringify(data),
          }, true);
      } catch (error) {
          console.error('Error applying to become seller:', error);
          throw error;
      }
  }

  // ========== USER PROFILE METHODS ==========

  async updateUserProfile(data: any): Promise<any> {
      try {
          return await this.request<any>('/user_edit_profile.php', {
              method: 'PUT',
              body: JSON.stringify(data),
          }, true);
      } catch (error) {
          console.error('Error updating profile:', error);
          throw error;
      }
  }
  
  async updateSellerProfile(data: any): Promise<any> {
      try {
          return await this.request<any>('/seller_edit_business.php', {
              method: 'PUT',
              body: JSON.stringify(data),
          }, true);
      } catch (error) {
          console.error('Error updating seller profile:', error);
          throw error;
      }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<any> {
      try {
          return await this.request<any>('/user_change_password.php', {
              method: 'POST',
              body: JSON.stringify({ currentPassword, newPassword }),
          }, true);
      } catch (error) {
          console.error('Error changing password:', error);
          throw error;
      }
  }

  // ========== CART METHODS ==========

  async getCart(): Promise<any> {
      try {
          return await this.request<any>('/cart.php', {}, true);
      } catch (error) {
          console.error('Error fetching cart:', error);
          return { items: [], totalItems: 0, totalPrice: 0 };
      }
  }

  async addToCart(productID: number, quantity: number = 1): Promise<any> {
      try {
          return await this.request<any>('/cart.php', {
              method: 'POST',
              body: JSON.stringify({ productID, quantity }),
          }, true);
      } catch (error) {
          console.error('Error adding to cart:', error);
          throw error;
      }
  }


  async updateCartItem(cartItemID: number, quantity: number): Promise<any> {
      try {
          return await this.request<any>('/cart.php', {
              method: 'PUT',
              body: JSON.stringify({ cartItemID, quantity }),
          }, true);
      } catch (error) {
          console.error('Error updating cart:', error);
          throw error;
      }
  }


  async removeFromCart(cartItemID: number): Promise<any> {
      try {
          return await this.request<any>('/cart.php', {
              method: 'DELETE',
              body: JSON.stringify({ cartItemID }),
          }, true);
      } catch (error) {
          console.error('Error removing from cart:', error);
          throw error;
      }
  }


  async clearCart(): Promise<any> {
      try {
          // Get all items first
          const cart = await this.getCart();
          if (!cart.items || cart.items.length === 0) {
              return { success: true, message: 'Cart is already empty' };
          }
          
          // Remove each item
          for (const item of cart.items) {
              await this.removeFromCart(item.cartItemID);
          }
          
          return { success: true, message: 'Cart cleared' };
      } catch (error) {
          console.error('Error clearing cart:', error);
          throw error;
      }
  }


  async getCartCount(): Promise<number> {
      try {
          const cart = await this.getCart();
          return cart.totalItems || 0;
      } catch (error) {
          console.error('Error getting cart count:', error);
          return 0;
      }
  }

  // ========== SELLER PRODUCT METHODS ==========

  async createProduct(productData: any): Promise<any> {  
    try {
        // Make sure the image is included properly
        const formData = {
            name: productData.name,
            description: productData.description,
            categoryID: productData.categoryID,
            condition: productData.condition,
            price: productData.price,
            quantity: productData.quantity,
            image: productData.image  // Base64 image
        };

        const response = await this.request<any>('/sell_product.php', {
            method: 'POST',
            body: JSON.stringify(formData),
        }, true);
        
        return response;
    } catch (error) {
        console.error('Error creating product:', error);
        throw error;
    }
  }   

  async getMyProducts(status?: string): Promise<any[]> {
      try {
          let endpoint = '/seller_products.php';
          if (status) {
              endpoint += `?status=${status}`;
          }
          const result = await this.request<any[]>(endpoint, {}, true);
          return Array.isArray(result) ? result : [];
      } catch (error) {
          console.error('Error fetching my products:', error);
          return [];
      }
  }

  async deleteProduct(productID: number): Promise<any> {
      try {
          return await this.request<any>('/seller_products.php', {
              method: 'DELETE',
              body: JSON.stringify({ productID }),
          }, true);
      } catch (error) {
          console.error('Error deleting product:', error);
          throw error;
      }
  }


  async updateProduct(productID: number, productData: any): Promise<any> {
      try {
          return await this.request<any>('/seller_products.php', {
              method: 'PUT',
              body: JSON.stringify({ productID, ...productData }),
          }, true);
      } catch (error) {
          console.error('Error updating product:', error);
          throw error;
      }
  }

    async toggleProductVisibility(productID: number, isActive: boolean): Promise<any> {
        try {
            console.log('Toggling product visibility:', { productID, isActive });
            const response = await this.request<any>('/seller_products.php', {
                method: 'POST',
                body: JSON.stringify({ 
                    productID, 
                    isActive: isActive ? 1 : 0, 
                    action: 'toggle_visibility' 
                }),
            }, true);
            console.log('Toggle response:', response);
            return response;
        } catch (error) {
            console.error('Error toggling product visibility:', error);
            throw error;
        }
    }

  // ========== MODERATOR METHODS ==========

	async getPendingProducts(): Promise<any[]> {
		try {
				const result = await this.request<any[]>('/moderate_pending_products.php', {}, true);
				return Array.isArray(result) ? result : [];
		} catch (error) {
				console.error('Error fetching pending products:', error);
				return [];
		}
	}

	async approveProduct(productID: number): Promise<any> {
		try {
				return await this.request<any>('/moderate_pending_products.php', {
					method: 'POST',
					body: JSON.stringify({ productID, action: 'approve' }),
				}, true);
		} catch (error) {
				console.error('Error approving product:', error);
				throw error;
		}
	}

	async rejectProduct(productID: number, reason: string): Promise<any> {
		try {
				return await this.request<any>('/moderate_pending_products.php', {
					method: 'POST',
					body: JSON.stringify({ productID, action: 'reject', reason }),
				}, true);
		} catch (error) {
				console.error('Error rejecting product:', error);
				throw error;
		}
	}

  // ========== SELLER MODERATION METHODS ==========

	async getPendingSellers(): Promise<any[]> {
		try {
				const result = await this.request<any[]>('/moderate_pending_sellers.php', {}, true);
				return Array.isArray(result) ? result : [];
		} catch (error) {
				console.error('Error fetching pending sellers:', error);
				return [];
		}
	}

	async approveSeller(userID: number): Promise<any> {
		try {
				return await this.request<any>('/moderate_pending_sellers.php', {
					method: 'POST',
					body: JSON.stringify({ userID, action: 'approve' }),
				}, true);
		} catch (error) {
				console.error('Error approving seller:', error);
				throw error;
		}
	}

	async rejectSeller(userID: number, reason: string): Promise<any> {
		try {
				return await this.request<any>('/moderate_pending_sellers.php', {
					method: 'POST',
					body: JSON.stringify({ userID, action: 'reject', reason }),
				}, true);
		} catch (error) {
				console.error('Error rejecting seller:', error);
				throw error;
		}
	}

// ========== MODERATOR PRODUCT MANAGEMENT ==========

	async getAllProductsForModeration(filter?: string): Promise<any[]> {
		try {
			let endpoint = '/moderate_current_products.php';
			if (filter) {
					endpoint += `?filter=${filter}`;
			}
			const result = await this.request<any[]>(endpoint, {}, true);
			return Array.isArray(result) ? result : [];
		} catch (error) {
			console.error('Error fetching products for moderation:', error);
			return [];
		}
	}

	async updateProductVisibility(productID: number, canDisplay: boolean): Promise<any> {
		try {
			return await this.request<any>('/moderate_current_products.php', {
					method: 'PUT',
					body: JSON.stringify({ productID, canDisplay, action: 'toggle_display' }),
			}, true);
		} catch (error) {
			console.error('Error updating product visibility:', error);
			throw error;
		}
	}

	async moderateUpdateProduct(productID: number, productData: any): Promise<any> {
		try {
			return await this.request<any>('/moderate_current_products.php', {
					method: 'PUT',
					body: JSON.stringify({ productID, ...productData, action: 'update_details' }),
			}, true);
		} catch (error) {
			console.error('Error updating product details:', error);
			throw error;
		}
	}

	async addModerationNote(productID: number, note: string): Promise<any> {
		try {
			return await this.request<any>('/moderate_current_products.php', {
					method: 'POST',
					body: JSON.stringify({ productID, note, action: 'add_note' }),
			}, true);
		} catch (error) {
			console.error('Error adding moderation note:', error);
			throw error;
		}
	}

  // ========== SELLER MANAGEMENT (Moderator) ==========

  async getAllSellersForManagement(filter?: string): Promise<any[]> {
      try {
          let endpoint = '/moderate_current_sellers.php';
          if (filter) {
              endpoint += `?filter=${filter}`;
          }
          const result = await this.request<any[]>(endpoint, {}, true);
          return Array.isArray(result) ? result : [];
      } catch (error) {
          console.error('Error fetching sellers for management:', error);
          return [];
      }
  }

  async suspendSeller(userID: number, reason: string): Promise<any> {
      try {
          return await this.request<any>('/moderate_current_sellers.php', {
              method: 'POST',
              body: JSON.stringify({ userID, action: 'suspend', reason }),
          }, true);
      } catch (error) {
          console.error('Error suspending seller:', error);
          throw error;
      }
  }


  async restoreSeller(userID: number): Promise<any> {
      try {
          return await this.request<any>('/moderate_current_sellers.php', {
              method: 'POST',
              body: JSON.stringify({ userID, action: 'restore' }),
          }, true);
      } catch (error) {
          console.error('Error restoring seller:', error);
          throw error;
      }
  }

  async getSellerDetails(userID: number): Promise<any> {
      try {
          return await this.request<any>(`/moderate_current_sellers.php?userID=${userID}`, {}, true);
      } catch (error) {
          console.error('Error getting seller details:', error);
          return null;
      }
  }

  // ========== ADDRESS METHODS ==========

  async getAddresses(): Promise<any> {
      try {
          return await this.request<any>('/customer_address.php', {}, true);
      } catch (error) {
          console.error('Error fetching addresses:', error);
          return { success: false, addresses: [] };
      }
  }

  async addAddress(addressData: any): Promise<any> {
      try {
          return await this.request<any>('/customer_address.php', {
              method: 'POST',
              body: JSON.stringify(addressData),
          }, true);
      } catch (error) {
          console.error('Error adding address:', error);
          throw error;
      }
  }


  async updateAddress(addressID: number, addressData: any): Promise<any> {
      try {
          return await this.request<any>('/customer_address.php', {
              method: 'PUT',
              body: JSON.stringify({ addressID, ...addressData }),
          }, true);
      } catch (error) {
          console.error('Error updating address:', error);
          throw error;
      }
  }

  async deleteAddress(addressID: number): Promise<any> {
      try {
          return await this.request<any>('/customer_address.php', {
              method: 'DELETE',
              body: JSON.stringify({ addressID }),
          }, true);
      } catch (error) {
          console.error('Error deleting address:', error);
          throw error;
      }
  }

  // ========== MODERATION HISTORY ==========

  async getModerationHistory(limit: number = 50, offset: number = 0, action?: string, category?: string): Promise<any> {
      try {
          let endpoint = `/moderation_history.php?limit=${limit}&offset=${offset}`;
          if (action) {
              endpoint += `&action=${action}`;
          }
          if (category) {
              endpoint += `&category=${category}`;
          }
          console.log('Fetching moderation history:', endpoint);
          const response = await this.request<any>(endpoint, {}, true);
          console.log('Moderation history response:', response);
          return response;
      } catch (error) {
          console.error('Error fetching moderation history:', error);
          // Return empty data instead of throwing
          return { success: false, data: [], pagination: { total: 0 } };
      }
  }

  // ========== ADMIN - USER MANAGEMENT ==========

  async getUsers(page: number = 1, limit: number = 20, search: string = '', role: string = ''): Promise<any> {
      try {
          let endpoint = `/admin_manage_user.php?page=${page}&limit=${limit}`;
          if (search) {
              endpoint += `&search=${encodeURIComponent(search)}`;
          }
          if (role) {
              endpoint += `&role=${role}`;
          }
          return await this.request<any>(endpoint, {}, true);
      } catch (error) {
          console.error('Error fetching users:', error);
          return { success: false, data: [], pagination: { total: 0 } };
      }
  }

  async getUserDetails(userID: number): Promise<any> {
      try {
          return await this.request<any>(`/admin_manage_user.php?userID=${userID}`, {}, true);
      } catch (error) {
          console.error('Error fetching user details:', error);
          return { success: false };
      }
  }

  async adminUpdateUser(userID: number, data: any): Promise<any> {
      try {
          return await this.request<any>('/admin_manage_user.php', {
              method: 'PUT',
              body: JSON.stringify({ userID, ...data }),
          }, true);
      } catch (error) {
          console.error('Error updating user:', error);
          throw error;
      }
  }

  async adminDeleteUser(userID: number): Promise<any> {
      try {
          return await this.request<any>('/admin_manage_user.php', {
              method: 'DELETE',
              body: JSON.stringify({ userID }),
          }, true);
      } catch (error) {
          console.error('Error deleting user:', error);
          throw error;
      }
  }

  // ========== ADMIN - SELLER MANAGEMENT ==========

  async getSellersForAdmin(page: number = 1, limit: number = 20, search: string = '', filter: string = 'all'): Promise<any> {
      try {
          let endpoint = `/admin_manage_seller.php?page=${page}&limit=${limit}`;
          if (search) {
              endpoint += `&search=${encodeURIComponent(search)}`;
          }
          if (filter !== 'all') {
              endpoint += `&filter=${filter}`;
          }
          return await this.request<any>(endpoint, {}, true);
      } catch (error) {
          console.error('Error fetching sellers:', error);
          return { success: false, data: [], pagination: { total: 0 } };
      }
  }

  async getSellerDetailsForAdmin(sellerID: number): Promise<any> {
      try {
          return await this.request<any>(`/admin_manage_seller.php?sellerID=${sellerID}`, {}, true);
      } catch (error) {
          console.error('Error fetching seller details:', error);
          return { success: false };
      }
  }

  async adminSellerAction(data: { userID: number; action: 'approve' | 'reject' | 'suspend' | 'restore'; reason?: string }): Promise<any> {
      try {
          return await this.request<any>('/admin_manage_seller.php', {
              method: 'POST',
              body: JSON.stringify(data),
          }, true);
      } catch (error) {
          console.error('Error performing seller action:', error);
          throw error;
      }
  }

  async adminUpdateSeller(userID: number, data: any): Promise<any> {
      try {
          return await this.request<any>('/admin_manage_seller.php', {
              method: 'PUT',
              body: JSON.stringify({ userID, ...data }),
          }, true);
      } catch (error) {
          console.error('Error updating seller:', error);
          throw error;
      }
  }

  async adminDeleteSeller(userID: number): Promise<any> {
      try {
          return await this.request<any>('/admin_manage_seller.php', {
              method: 'DELETE',
              body: JSON.stringify({ userID }),
          }, true);
      } catch (error) {
          console.error('Error deleting seller:', error);
          throw error;
      }
  }

  // ========== ADMIN - MODERATOR MANAGEMENT ==========

    async getModeratorsForAdmin(page: number = 1, limit: number = 20, search: string = ''): Promise<any> {
        try {
            let endpoint = `/api/admin_manage_moderators.php?page=${page}&limit=${limit}`;
            if (search) {
                endpoint += `&search=${encodeURIComponent(search)}`;
            }
            return await this.request<any>(endpoint, {}, true);
        } catch (error) {
            console.error('Error fetching moderators:', error);
            return { success: false, data: [], pagination: { total: 0 } };
        }
    }

    async getModeratorDetailsForAdmin(moderatorID: number): Promise<any> {
        try {
            return await this.request<any>(`/api/admin_manage_moderators.php?moderatorID=${moderatorID}`, {}, true);
        } catch (error) {
            console.error('Error fetching moderator details:', error);
            return { success: false };
        }
    }

    async adminAddModerator(userID: number, permissions: any): Promise<any> {
        try {
            return await this.request<any>('/api/admin_manage_moderators.php', {
                method: 'POST',
                body: JSON.stringify({ userID, permissions }),
            }, true);
        } catch (error) {
            console.error('Error adding moderator:', error);
            throw error;
        }
    }

    async adminUpdateModeratorPermissions(userID: number, permissions: any): Promise<any> {
        try {
            return await this.request<any>('/api/admin_manage_moderators.php', {
                method: 'PUT',
                body: JSON.stringify({ userID, permissions }),
            }, true);
        } catch (error) {
            console.error('Error updating moderator permissions:', error);
            throw error;
        }
    }

    async adminRemoveModerator(userID: number): Promise<any> {
        try {
            return await this.request<any>('/api/admin_manage_moderators.php', {
                method: 'DELETE',
                body: JSON.stringify({ userID }),
            }, true);
        } catch (error) {
            console.error('Error removing moderator:', error);
            throw error;
        }
    }

}

export const apiService = new ApiService();