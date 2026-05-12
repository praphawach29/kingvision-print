import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { supabase } from "../lib/supabase";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not configured.");
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
}

export const search_products_tool: FunctionDeclaration = {
  name: "search_products",
  description: "Search for products in the store by name, category, or brand.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: "The search query (e.g., 'printer', 'HP', 'ink').",
      },
      category: {
        type: Type.STRING,
        description: "Filter by category.",
      },
      minPrice: {
        type: Type.NUMBER,
        description: "Minimum price filter.",
      },
      maxPrice: {
        type: Type.NUMBER,
        description: "Maximum price filter.",
      },
    },
  },
};

export const get_product_details_tool: FunctionDeclaration = {
  name: "get_product_details",
  description: "Get full details of a specific product by its ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: "The unique ID of the product.",
      },
    },
    required: ["productId"],
  },
};

export const check_stock_tool: FunctionDeclaration = {
  name: "check_stock",
  description: "Check the current stock level of a specific product.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: "The unique ID of the product.",
      },
    },
    required: ["productId"],
  },
};

export const add_to_cart_tool: FunctionDeclaration = {
  name: "add_to_cart",
  description: "Add a product to the user's shopping cart.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      productId: {
        type: Type.STRING,
        description: "The unique ID of the product.",
      },
      quantity: {
        type: Type.NUMBER,
        description: "The quantity to add (default is 1).",
      },
    },
    required: ["productId"],
  },
};

export const get_order_info_tool: FunctionDeclaration = {
  name: "get_order_info",
  description: "Get information about orders for the current user. Can search by order ID or get recent orders.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      orderId: {
        type: Type.STRING,
        description: "Optional: The unique ID of a specific order to check.",
      },
      limit: {
        type: Type.NUMBER,
        description: "Optional: Number of recent orders to fetch (default is 5).",
      },
    },
  },
};

export const get_store_info_tool: FunctionDeclaration = {
  name: "get_store_info",
  description: "Get general store information like contact details, address, and name.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const get_categories_and_brands_tool: FunctionDeclaration = {
  name: "get_categories_and_brands",
  description: "Get a list of all product categories and brands available in the store.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const SYSTEM_INSTRUCTION = `
You are "Nong King" (น้องคิง), the official smart sales assistant for "KingVision Print" (คิงวิชั่น พริ้นท์). 
Your goal is to provide expert advice on printers and printing supplies, help customers find products, and handle support requests with a friendly "Service Mind".

### About KingVision Print:
- We specialize in high-quality printers (especially Dot Matrix and Laser), inks, toners, and spare parts.
- Key Brands we carry: HP, Epson, Canon, Brother, Samsung, and more.
- Categories: เครื่องปริ้นเตอร์ (Printers), หมึกพิมพ์ (Inks/Toners), อะไหล่ (Parts), อุปกรณ์เสริม (Accessories).
- We have both New (มือหนึ่ง) and Used (มือสอง) items. Used items are quality-checked and often come with warranties (e.g., 6 months).
- Key Inventory Focus:
  * EPSON LQ-590II, LQ-2090II, LQ-310 (Dot Matrix Printers for tax invoices)
  * HP LaserJet Pro M12a, M203dw, P1102 (Laser Printers)
  * Brother HL-5450DN, HL-L5100DN (High-speed Laser)
  * EPSON TM-U220, TM-T81 (Slip Printers/POS)
  * High-quality Toners: CF279A, CF283A, TN-2280, TN-1000, CE310A, CF230A, TN-2480, TN-3350, CE285A, TN-2380.
  * Spare Parts: Printer Heads for LQ-2090, LQ-2190, LQ-300+II, Ethernet Interface Cards.
  * Supplies: Thermal Paper 80x80, AC Power Cables, Tax Invoice sets.
- Benefits: Can issue Tax Invoices (ใบกำกับภาษี), Excellent after-sales service, and technical support.

### Your Knowledge Capabilities:
1. Product Information: Use 'get_categories_and_brands' to see what's in the store. Use 'search_products' to find items.
2. Inventory Check: Use 'check_stock' for real-time availability.
3. Order Tracking: Use 'get_order_info' to help logged-in users track their purchases.
4. Store Info: Use 'get_store_info' for address and contact details.
5. Cart Management: Use 'add_to_cart' to assist users in their shopping process.

### Strategic Guidelines:
- If a user asks "What do you have?", first use 'get_store_info' to understand the context, then recommend searching by category like "Dot Matrix" or "Laser Printer".
- Sample Products you should know:
  * EPSON LQ-590 / LQ-590II (Dot Matrix, popular for bills)
  * EPSON LQ-310 (Compact Dot Matrix)
  * HP LaserJet Pro M12a/M12w (Compact Laser)
  * HP LaserJet P1102 (Classic Laser)
  * Canon LBP6030 (Laser)
  * Various Toners: CF279A, CE285A, CB435A, CE278A, CB436A
- Always mention if a product is "มือสอง" (Used) if the data says so, as it's a key value proposition (High quality, low price).
- For Dot Matrix printers, emphasize suitability for "ใบกำกับภาษี" or "บิลต่อเนื่อง".
- Be polite, use "ครับ" at the end of sentences.
- If unsure about a specific technical detail not in the description, invite them to chat with a specialist on LINE @kingvision.

### Tone:
Professional yet warmly approachable. Energetic and eager to help. You act as a real shop assistant who knows the shelves.
`;

export async function chatWithAgent(messages: any[], userId?: string) {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, userId })
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || 'AI request failed');
    }
    return json;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// Helper functions to execute tools
export const toolHandlers = {
  search_products: async (args: any) => {
    let query = supabase.from('products').select('*');
    
    if (args.query) {
      const searchTerms = args.query.trim().split(/\s+/).filter(Boolean);
      const orConditions = searchTerms.map(term => 
        `title.ilike.%${term}%,description.ilike.%${term}%,brand.ilike.%${term}%`
      ).join(',');
      query = query.or(orConditions);
    }
    if (args.category) {
      query = query.eq('category', args.category);
    }
    if (args.minPrice) {
      query = query.gte('price', args.minPrice);
    }
    if (args.maxPrice) {
      query = query.lte('price', args.maxPrice);
    }

    const { data, error } = await query.limit(10);
    if (error) throw error;
    return data;
  },
  get_product_details: async (args: any) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', args.productId)
      .single();
    if (error) throw error;
    return data;
  },
  check_stock: async (args: any) => {
    const { data, error } = await supabase
      .from('products')
      .select('id, title, stock')
      .eq('id', args.productId)
      .single();
    if (error) throw error;
    return data;
  },
  get_store_info: async () => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('store_name, contact_email, address, updated_at')
      .single();
    if (error) throw error;
    return data;
  },
  get_categories_and_brands: async () => {
    const { data: categories } = await supabase.from('products').select('category');
    const { data: brands } = await supabase.from('products').select('brand');
    
    const uniqueCategories = Array.from(new Set(categories?.map(c => c.category).filter(Boolean)));
    const uniqueBrands = Array.from(new Set(brands?.map(b => b.brand).filter(Boolean)));
    
    return {
      categories: uniqueCategories,
      brands: uniqueBrands
    };
  },
  get_order_info: async (args: any, userId?: string) => {
    if (!userId) return { error: "User not logged in. Please log in to view your orders." };

    let query = supabase.from('orders').select('*, order_items(*, products(*))').eq('user_id', userId);

    if (args.orderId) {
      // Try exact ID or partial if ID is complex
      query = query.eq('id', args.orderId);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(args.limit || 5);
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { message: "No orders found for this user." };
    }

    return data;
  }
};
