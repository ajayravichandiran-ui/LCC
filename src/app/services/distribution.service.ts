import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DistributionRecord {
  id: string;
  product: string;
  productId?: string;
  quantity: number;
  volunteer: string;
  receiver: string;
  date: string;
  status: string;
  location: string;
  createdAt?: string;
}

const STORAGE_KEY = 'lcc_distribution_records';

@Injectable({
  providedIn: 'root'
})
export class DistributionService {
  private recordsSubject = new BehaviorSubject<DistributionRecord[]>(this.loadInitialRecords());
  records$: Observable<DistributionRecord[]> = this.recordsSubject.asObservable();

  private loadInitialRecords(): DistributionRecord[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load distribution records from localStorage', e);
    }
    return [];
  }

  getRecords(): DistributionRecord[] {
    return this.recordsSubject.value;
  }

  addDistribution(record: Omit<DistributionRecord, 'id'> & { id?: string }): DistributionRecord {
    const current = this.recordsSubject.value;
    const newId = record.id || `DIST-${String(current.length + 1).padStart(4, '0')}`;
    const newRecord: DistributionRecord = {
      ...record,
      id: newId,
      status: record.status || 'Assigned',
      createdAt: record.createdAt || new Date().toISOString()
    };
    const updated = [newRecord, ...current];
    this.saveRecords(updated);
    return newRecord;
  }

  clearAll(): void {
    this.saveRecords([]);
  }

  private saveRecords(records: DistributionRecord[]): void {
    this.recordsSubject.next(records);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      }
    } catch (e) {
      console.error('Failed to save distribution records to localStorage', e);
    }
  }
}
