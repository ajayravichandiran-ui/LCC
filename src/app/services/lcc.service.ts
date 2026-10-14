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

  private loadInitialItems(): LccTransferItem[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          return JSON.parse(data);
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

  addTransfer(item: Omit<LccTransferItem, 'id' | 'createdAt'>): LccTransferItem {
    const newItem: LccTransferItem = {
      ...item,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    const updated = [newItem, ...this.itemsSubject.value];
    this.saveItems(updated);
    return newItem;
  }

  deleteTransfer(id: number): void {
    const updated = this.itemsSubject.value.filter(item => item.id !== id);
    this.saveItems(updated);
  }

  clearAll(): void {
    this.saveItems([]);
  }

  private saveItems(items: LccTransferItem[]): void {
    this.itemsSubject.next(items);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }
    } catch (e) {
      console.error('Failed to save LCC items to localStorage', e);
    }
  }
}
