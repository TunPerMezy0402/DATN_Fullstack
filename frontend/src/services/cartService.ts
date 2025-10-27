// src/services/cartService.ts
export interface CartItem {
  id: number;
  name: string;
  price: number;
  discount_price?: number | null;
  image?: string;
  quantity: number;
  stock_quantity?: number;
  // 👇 thêm thông tin biến thể
  variant?: {
    color?: string;
    size?: string;
    skuId?: string | number;
    key?: string; // color|size
  };
}

const KEY = "cart_items";

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function makeKey(id: number, key?: string) {
  return `${id}:${key ?? ""}`;
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  const itemKey = makeKey(item.id, item.variant?.key);
  const idx = cart.findIndex(
    (x) => makeKey(x.id, x.variant?.key) === itemKey
  );
  if (idx >= 0) {
    const maxQ = item.stock_quantity ?? Infinity;
    cart[idx].quantity = Math.min((cart[idx].quantity || 0) + item.quantity, maxQ);
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

export function clearCart() {
  saveCart([]);
}