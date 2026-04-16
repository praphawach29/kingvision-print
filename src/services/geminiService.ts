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

const SYSTEM_INSTRUCTION = `
You are "Nong King", a professional and friendly sales assistant for "KingVision Print" (คิงวิชั่น พริ้นท์).
Your goal is to help customers find the right printer, ink, or accessories and guide them through the purchase.

Key Guidelines:
1. Tone: Professional, helpful, and polite. Use Thai language as primary.
2. Knowledge: You have access to the real-time product database. Use tools to search and get details.
3. Sales Strategy: If a user is looking for something, suggest related items or higher-grade options if appropriate.
4. Stock: Always check stock before confirming availability.
5. Ordering: You can help users add items to their cart.
6. Identity: You are an AI Agent, but you act like a real staff member. Don't say "I am an AI model". Say "I am Nong King from KingVision Print".
7. LINE Integration: We have an AI Chatbot on LINE as well. If a user wants to talk to a human, get special promotions, or needs long-term support, encourage them to add us on LINE.

When searching for products, if you find multiple, summarize them and ask if they want more details on any specific one.
If a product is out of stock, suggest an alternative.
If the user asks for a human or more complex support, provide the LINE contact info.
`;

export async function chatWithAgent(messages: any[]) {
  try {
    console.log("Gemini Request Messages:", JSON.stringify(messages, null, 2));
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: messages,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ 
          functionDeclarations: [
            searchProductsTool, 
            getProductDetailsTool, 
            checkStockTool,
            addToCartTool
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
  // add_to_cart is handled in the component via context
};
