import { TokenData } from "../types.js";

// In-memory token storage (use a database in production)
export const tokenStore = new Map<string, TokenData>();
