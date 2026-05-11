import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Breadcrumb } from '../components/Breadcrumb';

export function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice } = useCart();

  const shipping = items.length > 0 ? 100 : 0;
  const grandTotal = totalPrice + shipping;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold text-kv-navy mb-4">ตะกร้าสินค้าของคุณว่างเปล่า</h2>
        <p className="text-gray-500 mb-8">ดูเหมือนคุณจะยังไม่ได้เพิ่มสินค้าใดๆ ลงในตะกร้า</p>
        <Link to="/shop" className="bg-kv-orange text-white px-8 py-3 rounded-md font-medium hover:bg-kv-orange/90 transition-colors">
          เลือกซื้อสินค้าต่อ
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-kv-gray min-h-screen py-8">
      <div className="container mx-auto px-4">
        <Breadcrumb items={[{ label: 'ตะกร้าสินค้า' }]} />
        <h1 className="text-3xl font-bold text-kv-navy mb-8">ตะกร้าสินค้า</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="w-full lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-kv-border overflow-hidden">
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-kv-border font-medium text-gray-600 font-thai">
                <div className="col-span-6">สินค้า</div>
                <div className="col-span-2 text-center">ราคา</div>
                <div className="col-span-2 text-center">จำนวน</div>
                <div className="col-span-2 text-right">ยอดรวม</div>
              </div>

              <div className="divide-y divide-kv-border">
                {items.map((item) => {
                  const cartItemId = `${item.id}-${JSON.stringify(item.selected_options || [])}`;
                  return (
                    <div key={cartItemId} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center relative">
                      <div className="col-span-1 md:col-span-6 flex items-start md:items-center gap-4">
                        <button 
                          onClick={() => removeFromCart(cartItemId)}
                          className="text-gray-400 hover:text-red-500 transition-colors absolute top-4 right-4 md:static"
                        >
                          <Trash2 size={20} />
                        </button>
                        <img src={item.image && item.image.trim() !== '' ? item.image : 'https://via.placeholder.com/100'} alt={item.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded border border-gray-200" referrerPolicy="no-referrer" />
                        <div className="flex-1 pr-8 md:pr-0">
                          <Link to={`/product/${item.id}`} className="font-medium text-kv-navy hover:text-kv-orange transition-colors line-clamp-2 text-sm md:text-base">
                            {item.name}
                          </Link>
                          {item.selected_options && item.selected_options.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.selected_options.map((opt, idx) => (
                                <div key={idx} className="text-[10px] md:text-xs text-gray-500 font-bold">
                                  {opt.name}: <span className="text-kv-navy">{opt.value}</span>
                                  {opt.price_modifier > 0 && <span className="text-green-600 ml-1">(+฿{opt.price_modifier})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="md:hidden text-kv-orange font-bold mt-1">
                            ฿{item.price.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 text-center font-medium text-gray-700 hidden md:block">
                        ฿{item.price.toLocaleString()}
                      </div>
  
                      <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center mt-2 md:mt-0">
                        <div className="flex items-center border border-gray-300 rounded">
                          <button 
                            onClick={() => updateQuantity(cartItemId, item.quantity - 1)}
                            className="px-3 py-1.5 md:py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="px-3 py-1.5 md:py-1 font-medium text-center min-w-[40px]">
                            {item.quantity}
                          </span>
                          <button 
                            onClick={() => updateQuantity(cartItemId, item.quantity + 1)}
                            className="px-3 py-1.5 md:py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
  
                      <div className="col-span-1 md:col-span-2 text-right font-bold text-kv-orange hidden md:block">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm border border-kv-border p-6 sticky top-6">
              <h2 className="text-xl font-bold text-kv-navy mb-6">สรุปคำสั่งซื้อ</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>ยอดรวมสินค้า</span>
                  <span>฿{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ค่าจัดส่ง</span>
                  <span>฿{shipping.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-kv-border pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-kv-navy">ยอดสุทธิ</span>
                  <span className="text-2xl font-bold text-red-600">
                    ฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <Link 
                to="/checkout" 
                className="w-full bg-[#FFD700] text-gray-900 py-4 rounded-md font-bold text-lg hover:bg-[#F5CF00] transition-colors flex items-center justify-center"
              >
                ดำเนินการชำระเงิน <ArrowRight size={20} className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
