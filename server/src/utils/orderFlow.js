import crypto from 'node:crypto';
import { Product } from '../models/index.js';
import { conflict } from './http.js';

export function newGroupId() {
  return crypto.randomUUID();
}

export function newOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MN-${ymd}-${rand}`;
}

/**
 * Deduct stock for every item in the order. Each decrement only succeeds when enough stock
 * remains; if any item fails, earlier decrements are rolled back.
 */
export async function deductStock(order) {
  const done = [];
  for (const item of order.items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty, soldQty: item.qty } },
      { new: true }
    );
    if (!updated) {
      for (const d of done) {
        await Product.updateOne({ _id: d.product }, { $inc: { stock: d.qty, soldQty: -d.qty } });
      }
      const current = await Product.findById(item.product).select('stock unit name').lean();
      throw conflict(
        current
          ? `Only ${current.stock} ${current.unit} of ${current.name} is in stock. Update your stock or reject this order.`
          : `${item.name} has been removed from your products. Reject this order.`
      );
    }
    done.push(item);
  }
  order.stockDeducted = true;
}

export async function restoreStock(order) {
  if (!order.stockDeducted) return;
  for (const item of order.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.qty, soldQty: -item.qty } });
  }
  order.stockDeducted = false;
}

export function pushStatus(order, status, note = '') {
  order.status = status;
  order.statusHistory.push({ status, at: new Date(), note });
}
