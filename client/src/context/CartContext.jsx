import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const KEY = 'mannu_cart_v1';

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { items: Array.isArray(raw.items) ? raw.items : [], fulfillment: raw.fulfillment || {} };
  } catch {
    return { items: [], fulfillment: {} };
  }
}

/** Snapshot of the product used to render the cart instantly; the server re-prices everything. */
function snapshot(p) {
  return {
    name: p.name,
    localNames: p.localNames,
    icon: p.icon,
    image: p.images?.[0]?.url || '',
    unit: p.unit,
    price: p.price,
    minOrderQty: p.minOrderQty,
    stock: p.stock,
    farmer: { id: p.farmer?.id || p.farmer, farmName: p.farmer?.farmName },
  };
}

export function CartProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const add = useCallback((product, qty) => {
    setState((s) => {
      const existing = s.items.find((i) => i.productId === product._id);
      const items = existing
        ? s.items.map((i) => (i.productId === product._id ? { ...i, qty: Math.min(product.stock, i.qty + qty), snap: snapshot(product) } : i))
        : [...s.items, { productId: product._id, qty, snap: snapshot(product) }];
      return { ...s, items };
    });
  }, []);

  const setQty = useCallback((productId, qty) => {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.productId === productId ? { ...i, qty } : i)) }));
  }, []);

  const remove = useCallback((productId) => {
    setState((s) => ({ ...s, items: s.items.filter((i) => i.productId !== productId) }));
  }, []);

  const setFulfillment = useCallback((farmerId, method) => {
    setState((s) => ({ ...s, fulfillment: { ...s.fulfillment, [farmerId]: method } }));
  }, []);

  const clear = useCallback(() => setState({ items: [], fulfillment: {} }), []);

  const value = useMemo(
    () => ({
      items: state.items,
      fulfillment: state.fulfillment,
      count: state.items.length,
      add,
      setQty,
      remove,
      setFulfillment,
      clear,
      qtyOf: (id) => state.items.find((i) => i.productId === id)?.qty || 0,
    }),
    [state, add, setQty, remove, setFulfillment, clear]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
