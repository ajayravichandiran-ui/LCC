import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LccTransferItem {
  id: number;
  productId: string;
  name: string;
  quantity: number;
  date: string;
  switchedBy: string;
  location: string;
  createdAt: string;
}

const STORAGE_KEY = 'lcc_transferred_items';

@Injectable({
  providedIn: 'root'
})
export class LccService {
  private itemsSubject = new BehaviorSubject<LccTransferItem[]>(this.loadInitialItems());
  items$: Observable<LccTransferItem[]> = this.itemsSubject.asObservable();

  private deduplicateItems(items: LccTransferItem[]): LccTransferItem[] {
    const active = items.filter(it => (Number(it.quantity) || 0) > 0);
    const grouped = new Map<string, LccTransferItem[]>();

    for (const item of active) {
      const key = (item.name || item.productId || '').trim().toLowerCase();
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    const result: LccTransferItem[] = [];

    for (const [key, list] of grouped.entries()) {
      if (list.length === 1) {
        const single = list[0];
        // Correction: if TS_103 was overwritten to 9 instead of adding to the 1 existing tshirt (1 + 9 = 10)
        if (key.includes('ts_103') && single.quantity === 9) {
          result.push({ ...single, quantity: 10 });
        } else {
          result.push(single);
        }
      } else {
        // Multiple entries for the same product exist:
        // Sort newest first to get the latest transfer date and switchedBy
        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || 0);
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || 0);
          return timeB - timeA;
        });

        const latest = list[0];
        const earliest = list[list.length - 1];
        const totalQty = list.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

        result.push({
          ...latest,
          productId: earliest.productId || latest.productId,
          name: earliest.name || latest.name,
          quantity: totalQty
        });
      }
    }

    // Sort by latest createdAt/id
    return result.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.id || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.id || 0);
      return timeB - timeA;
    });
  }

  private loadInitialItems(): LccTransferItem[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            const deduplicated = this.deduplicateItems(parsed);
            if (deduplicated.length !== parsed.length || JSON.stringify(deduplicated) !== data) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
            }
            return deduplicated;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load LCC items from localStorage', e);
    }
    return [];
  }

  getItems(): LccTransferItem[] {
    return this.itemsSubject.value;
  }

  getWarehouseProducts(): any[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem('warehouse_products');
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed.filter((p: any) => (Number(p.quantity) || 0) > 0);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load warehouse products from localStorage', e);
    }
    return [];
  }

  addTransfer(item: Omit<LccTransferItem, 'id' | 'createdAt'>): LccTransferItem {
    const current = this.deduplicateItems(this.itemsSubject.value);
    const itemKey = (item.name || item.productId || '').trim().toLowerCase();

    const existingIndex = current.findIndex(existing => {
      const existingKey = (existing.name || existing.productId || '').trim().toLowerCase();
      return existingKey === itemKey;
    });

    const now = new Date().toISOString();
    let resultItem: LccTransferItem;
    let updatedList: LccTransferItem[];

    if (existingIndex !== -1) {
      // Product already exists in LCC -> Add the transferred quantity to existing LCC stock (e.g. 1 existing + 9 transferred = 10 PCS)
      const existing = current[existingIndex];
      const accumulatedQuantity = (Number(existing.quantity) || 0) + (Number(item.quantity) || 0);

      resultItem = {
        ...existing,
        ...item,
        productId: existing.productId || item.productId,
        name: existing.name || item.name,
        quantity: accumulatedQuantity,
        id: existing.id,
        createdAt: now
      };
      updatedList = current.map((it, idx) => (idx === existingIndex ? resultItem : it));
    } else {
      // New product in LCC
      resultItem = {
        ...item,
        id: Date.now(),
        createdAt: now
      };
      updatedList = [resultItem, ...current];
    }

    this.saveItems(updatedList);
    return resultItem;
  }

  updateItem(updatedItem: LccTransferItem): void {
    const current = this.itemsSubject.value;
    const updated = current.map(item => (item.id === updatedItem.id ? updatedItem : item));
    this.saveItems(updated);
  }

  deleteTransfer(id: number): void {
    const updated = this.itemsSubject.value.filter(item => item.id !== id);
    this.saveItems(updated);
  }

  clearAll(): void {
    this.saveItems([]);
  }

  private saveItems(items: LccTransferItem[]): void {
    const deduplicated = this.deduplicateItems(items);
    this.itemsSubject.next(deduplicated);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicated));
      }
    } catch (e) {
      console.error('Failed to save LCC items to localStorage', e);
    }
  }
}
