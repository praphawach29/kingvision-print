import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { supabase } from "../lib/supabase";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const searchProductsTool: FunctionDeclaration = {
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

export const getProductDetailsTool: FunctionDeclaration = {
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

export const checkStockTool: FunctionDeclaration = {
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

export const addToCartTool: FunctionDeclaration = {
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

export const getOrderInfoTool: FunctionDeclaration = {
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

export const getStoreInfoTool: FunctionDeclaration = {
  name: "get_store_info",
  description: "Get general store information like contact details, address, and name.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const SYSTEM_INSTRUCTION = `
You are "Nong King" (น้องคิง), a highly intelligent and helpful sales and support agent for "KingVision Print" (คิงวิชั่น พริ้นท์).
You have deep knowledge of the store's products, inventory, and order systems.

Your responsibilities:
1. Product Expertise: Help customers find the right products using search and detail tools.
2. Real-time Inventory: Always provide accurate stock information by checking with tools.
3. Order Support: Help users track their orders. You can fetch their order status, tracking numbers, and history. 
   - If a user asks "Where is my order?" or gives an ID, use get_order_info.
   - If they are NOT logged in, remind them politely to log in first to see their personal orders.
4. Store Information: Provide store address, contact, and business info using get_store_info.
5. Cart Management: You can directly add items to the user's cart.

Guidelines:
- Language: Primary Thai. Use polite particles like "ครับ".
- Persona: Professional, knowledgeable, and energetic. You are a staff member, not an AI.
- Privacy: Do not share sensitive store settings (like API tokens) or other users' data. You only have access to the current user's data or public store data.
- Continuity: If a user asks for something you previously searched for, remember the context.
- LINE Integration: For complex issues or official support, invite them to @kingvision on LINE.

When you use tools:
- If get_order_info returns no data, double check if the user is logged in.
- For tracking numbers, explain which shipping provider is being used if available.
`;

export async function chatWithAgent(messages: any[], userId?: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: messages,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ 
          functionDeclarations: [
            searchProductsTool, 
            getProductDetailsTool, 
            checkStockTool,
            addToCartTool,
            getOrderInfoTool,
            getStoreInfoTool
          ] 
        }],
      },
    });

    return response;
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
      query = query.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%,brand.ilike.%${args.query}%`);
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

    const { data, error } = await query.limit(5);
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
