import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selected_options?: { name: string; value: string; price_modifier: number }[];
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (newItem: CartItem) => {
    setItems(prevItems => {
      // Generate a unique key for the item based on its ID and selected options
      const newItemOptionsKey = JSON.stringify(newItem.selected_options || []);
      
      const existingItemIndex = prevItems.findIndex(item => 
        item.id === newItem.id && 
        JSON.stringify(item.selected_options || []) === newItemOptionsKey
      );

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity
        };
        return updatedItems;
      }
      
      return [...prevItems, newItem];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    // We need to be careful here because multiple items might have the same product ID but different options
    // For simplicity, we'll use a unique identifier if we had one, but for now we'll match on ID and options
    // Actually, let's just use the index or a generated cartItemId
    setItems(prevItems => prevItems.filter((item, index) => {
      const itemKey = `${item.id}-${JSON.stringify(item.selected_options || [])}`;
      return itemKey !== cartItemId;
    }));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prevItems =>
      prevItems.map((item, index) => {
        const itemKey = `${item.id}-${JSON.stringify(item.selected_options || [])}`;
        return itemKey === cartItemId ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
