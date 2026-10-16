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
const CLEANUP_KEY = 'lcc_reports_history_reset_v1';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private recordsSubject = new BehaviorSubject<ReportRecord[]>(this.loadInitialRecords());
  records$: Observable<ReportRecord[]> = this.recordsSubject.asObservable();

  constructor() {
    // Automatic demo data seeding removed so report history starts completely clean
  }

  private loadInitialRecords(): ReportRecord[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // One-time cleanup of previous mock/seeded demo report history
        if (!localStorage.getItem(CLEANUP_KEY)) {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.setItem(CLEANUP_KEY, 'true');
          return [];
        }

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Filter out any legacy dummy/mock seed records
            return parsed.filter((r: ReportRecord) => !r.id?.startsWith('RPT-INIT-'));
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
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to clear reports from localStorage', e);
    }
    this.recordsSubject.next([]);
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
}
