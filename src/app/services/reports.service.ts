import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ReportEventType =
  | 'STOCK_RECEIVED'
  | 'PRODUCT_ADDED'
  | 'STOCK_TRANSFERRED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'LCC_TRANSFER_DELETED';

export interface ReportRecord {
  id: string;              // e.g. "RPT-1001"
  date: string;            // e.g. "2026-10-15" or "15-10-2026"
  time: string;            // e.g. "09:15:30 AM"
  productId: string;       // e.g. "SA_102"
  productName: string;     // e.g. "Saree"
  eventType: ReportEventType;
  eventTitle: string;      // e.g. "Stock Received", "Product Added", "Stock Transferred"
  quantityChange: number;  // e.g. +10, -5, +50
  previousStock: number;   // stock before transaction
  newStock: number;        // stock after transaction
  location: string;        // e.g. "Vadalur"
  updatedBy: string;       // e.g. "Abi"
  remarks: string;         // e.g. "Stock replenished", "Initial entry"
  timestamp: number;       // Date.now() for chronological sorting
}

const STORAGE_KEY = 'lcc_reports_records';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private recordsSubject = new BehaviorSubject<ReportRecord[]>(this.loadInitialRecords());
  records$: Observable<ReportRecord[]> = this.recordsSubject.asObservable();

  constructor() {
    this.seedFromExistingDataIfEmpty();
  }

  private loadInitialRecords(): ReportRecord[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load reports records from localStorage', e);
    }
    return [];
  }

  getRecords(): ReportRecord[] {
    return this.recordsSubject.value;
  }

  private saveRecords(records: ReportRecord[]): void {
    this.recordsSubject.next(records);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch (e) {
      console.error('Failed to save reports records to localStorage', e);
    }
  }

  private getFormattedDate(): string {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  private getFormattedTime(): string {
    const d = new Date();
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  private generateRecordId(): string {
    const count = this.recordsSubject.value.length + 1;
    const random = Math.floor(Math.random() * 900 + 100);
    return `RPT-${count.toString().padStart(4, '0')}-${random}`;
  }

  /**
   * Record every single data entry row-by-row
   */
  recordEntry(entry: {
    productId: string;
    productName: string;
    eventType: ReportEventType;
    eventTitle?: string;
    quantityChange: number;
    previousStock?: number;
    newStock?: number;
    location?: string;
    updatedBy?: string;
    remarks?: string;
    date?: string;
    time?: string;
  }): ReportRecord {
    const prev = entry.previousStock ?? 0;
    const newStk = entry.newStock ?? Math.max(0, prev + entry.quantityChange);

    const titleMap: Record<ReportEventType, string> = {
      STOCK_RECEIVED: 'Stock Received',
      PRODUCT_ADDED: 'Product Added',
      STOCK_TRANSFERRED: 'Stock Transferred to LCC',
      PRODUCT_UPDATED: 'Product Updated',
      PRODUCT_DELETED: 'Product Deleted',
      LCC_TRANSFER_DELETED: 'LCC Transfer Removed'
    };

    const newRecord: ReportRecord = {
      id: this.generateRecordId(),
      date: entry.date || this.getFormattedDate(),
      time: entry.time || this.getFormattedTime(),
      productId: entry.productId || 'N/A',
      productName: entry.productName || 'Unknown Product',
      eventType: entry.eventType,
      eventTitle: entry.eventTitle || titleMap[entry.eventType] || 'Inventory Action',
      quantityChange: entry.quantityChange,
      previousStock: prev,
      newStock: newStk,
      location: entry.location || 'Vadalur',
      updatedBy: entry.updatedBy?.trim() || 'System',
      remarks: entry.remarks || '',
      timestamp: Date.now()
    };

    // Insert at the beginning so newest records appear first
    const updated = [newRecord, ...this.recordsSubject.value];
    this.saveRecords(updated);
    return newRecord;
  }

  /**
   * Delete a single record from reports
   */
  deleteRecord(id: string): void {
    const updated = this.recordsSubject.value.filter(r => r.id !== id);
    this.saveRecords(updated);
  }

  /**
   * Clear all records
   */
  clearAllRecords(): void {
    this.saveRecords([]);
  }

  /**
   * Export all records as CSV file
   */
  exportToCsv(customRecords?: ReportRecord[]): void {
    const records = customRecords || this.recordsSubject.value;
    if (records.length === 0) {
      return;
    }

    const headers = [
      'Record ID',
      'Date',
      'Time',
      'Product ID',
      'Product Name',
      'Event / Action',
      'Quantity Change',
      'Previous Stock',
      'New Stock',
      'Location',
      'Updated By',
      'Remarks'
    ];

    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = records.map(r => [
      escapeCsv(r.id),
      escapeCsv(r.date),
      escapeCsv(r.time),
      escapeCsv(r.productId),
      escapeCsv(r.productName),
      escapeCsv(r.eventTitle),
      escapeCsv(r.quantityChange > 0 ? `+${r.quantityChange}` : `${r.quantityChange}`),
      escapeCsv(r.previousStock),
      escapeCsv(r.newStock),
      escapeCsv(r.location),
      escapeCsv(r.updatedBy),
      escapeCsv(r.remarks)
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    link.setAttribute('download', `lcc_inventory_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export all records as formatted JSON file
   */
  exportToJson(customRecords?: ReportRecord[]): void {
    const records = customRecords || this.recordsSubject.value;
    if (records.length === 0) {
      return;
    }
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    link.setAttribute('download', `lcc_reports_records_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Seed existing warehouse products and LCC transfers into reports
   * if no reports exist yet, so current data entries are already visible
   */
  private seedFromExistingDataIfEmpty(): void {
    if (this.recordsSubject.value.length > 0) {
      return;
    }

    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      const initialRecords: ReportRecord[] = [];
      const productsData = localStorage.getItem('warehouse_products');
      if (productsData) {
        const products = JSON.parse(productsData);
        if (Array.isArray(products) && products.length > 0) {
          products.forEach((p: any, idx: number) => {
            const date = p.receivedDate || this.getFormattedDate();
            initialRecords.push({
              id: `RPT-INIT-00${idx + 1}`,
              date,
              time: '09:00:00 AM',
              productId: p.productId || `PR_${100 + idx}`,
              productName: p.name || 'Product',
              eventType: 'PRODUCT_ADDED',
              eventTitle: 'Product Added (Initial Record)',
              quantityChange: p.quantity || 0,
              previousStock: 0,
              newStock: p.quantity || 0,
              location: p.location || 'Vadalur',
              updatedBy: p.updatedBy || 'Initial Setup',
              remarks: p.sponsorName ? `Sponsor: ${p.sponsorName}` : 'Initial warehouse inventory entry',
              timestamp: Date.now() - (products.length - idx) * 3600000
            });

            // If updated by is set (like Abi12 in the screenshot), also record stock received entry
            if (p.updatedBy && p.updatedBy !== 'Initial Setup') {
              initialRecords.unshift({
                id: `RPT-INIT-REC-00${idx + 1}`,
                date,
                time: '10:15:00 AM',
                productId: p.productId,
                productName: p.name,
                eventType: 'STOCK_RECEIVED',
                eventTitle: 'Stock Received',
                quantityChange: 12,
                previousStock: Math.max(0, (p.quantity || 12) - 12),
                newStock: p.quantity || 12,
                location: p.location || 'Vadalur',
                updatedBy: p.updatedBy,
                remarks: 'Stock updated and verified',
                timestamp: Date.now() - (products.length - idx) * 1800000
              });
            }
          });
        }
      }

      // Check LCC transferred items
      const lccData = localStorage.getItem('lcc_transferred_items');
      if (lccData) {
        const lccItems = JSON.parse(lccData);
        if (Array.isArray(lccItems) && lccItems.length > 0) {
          lccItems.forEach((item: any, idx: number) => {
            initialRecords.unshift({
              id: `RPT-INIT-LCC-00${idx + 1}`,
              date: item.date || this.getFormattedDate(),
              time: '11:30:00 AM',
              productId: item.productId || 'N/A',
              productName: item.name || 'Transferred Item',
              eventType: 'STOCK_TRANSFERRED',
              eventTitle: 'Stock Transferred to LCC',
              quantityChange: -(item.quantity || 0),
              previousStock: item.quantity ? item.quantity + 10 : 10,
              newStock: 10,
              location: item.location || 'LCC Center',
              updatedBy: item.switchedBy || 'Operator',
              remarks: `Transferred to LCC inventory`,
              timestamp: Date.now() - idx * 1200000
            });
          });
        }
      }

      if (initialRecords.length > 0) {
        this.saveRecords(initialRecords);
      }
    } catch (e) {
      console.error('Failed to seed initial report records', e);
    }
  }
}
