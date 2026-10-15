import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReportEventType, ReportRecord, ReportsService } from '../../services/reports.service';

export interface AppModalDialog {
  show: boolean;
  type: 'success' | 'warning' | 'error' | 'confirm';
  title: string;
  message: string;
  details?: { label: string; value: string | number }[];
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class ReportsComponent implements OnInit, OnDestroy {
  records: ReportRecord[] = [];
  private subscription?: Subscription;

  // Filter controls
  searchText = '';
  selectedEventType: string = 'ALL';
  selectedDate: string = '';
  sortOrder: 'newest' | 'oldest' = 'newest';

  // Pagination
  currentPage = 1;
  pageSize = 15;
  readonly pageSizes = [10, 15, 25, 50, 100];

  // In-app modal dialog
  modalDialog: AppModalDialog = {
    show: false,
    type: 'success',
    title: '',
    message: ''
  };

  // Manual Entry Modal
  showManualEntryModal = false;
  manualForm = {
    productId: '',
    productName: '',
    eventType: 'STOCK_RECEIVED' as ReportEventType,
    quantity: 1,
    location: 'Vadalur',
    updatedBy: '',
    date: this.getTodayDate(),
    remarks: ''
  };
  manualFormError = '';

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    this.subscription = this.reportsService.records$.subscribe(records => {
      this.records = records;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  // ==================== METRICS ====================

  get totalRecords(): number {
    return this.records.length;
  }

  get totalReceivedQty(): number {
    return this.records
      .filter(r => r.eventType === 'STOCK_RECEIVED')
      .reduce((sum, r) => sum + Math.abs(r.quantityChange), 0);
  }

  get totalTransferredQty(): number {
    return this.records
      .filter(r => r.eventType === 'STOCK_TRANSFERRED')
      .reduce((sum, r) => sum + Math.abs(r.quantityChange), 0);
  }

  get uniqueProductsCount(): number {
    const ids = new Set(this.records.map(r => r.productId).filter(Boolean));
    return ids.size;
  }

  // ==================== FILTERING & SEARCH ====================

  get filteredRecords(): ReportRecord[] {
    const search = this.searchText.trim().toLowerCase();

    let list = this.records.filter(r => {
      // Event type filter
      if (this.selectedEventType !== 'ALL' && r.eventType !== this.selectedEventType) {
        return false;
      }

      // Date filter
      if (this.selectedDate && r.date !== this.selectedDate) {
        return false;
      }

      // Search term filter
      if (search) {
        const matchId = (r.productId || '').toLowerCase().includes(search);
        const matchName = (r.productName || '').toLowerCase().includes(search);
        const matchUser = (r.updatedBy || '').toLowerCase().includes(search);
        const matchLoc = (r.location || '').toLowerCase().includes(search);
        const matchTitle = (r.eventTitle || '').toLowerCase().includes(search);
        const matchRptId = (r.id || '').toLowerCase().includes(search);
        const matchRemarks = (r.remarks || '').toLowerCase().includes(search);

        if (!matchId && !matchName && !matchUser && !matchLoc && !matchTitle && !matchRptId && !matchRemarks) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (this.sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });

    return list;
  }

  get paginatedRecords(): ReportRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecords.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRecords.length / this.pageSize));
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedEventType = 'ALL';
    this.selectedDate = '';
    this.sortOrder = 'newest';
    this.currentPage = 1;
  }

  // ==================== EXPORT ACTIONS ====================

  exportCsv(): void {
    const recordsToExport = this.filteredRecords;
    if (recordsToExport.length === 0) {
      this.showWarning('No Records', 'There are no records to export matching your filter criteria.');
      return;
    }
    this.reportsService.exportToCsv(recordsToExport);
    this.showSuccess('Report Downloaded', `Successfully exported ${recordsToExport.length} line-by-line records as CSV file.`);
  }

  exportJson(): void {
    const recordsToExport = this.filteredRecords;
    if (recordsToExport.length === 0) {
      this.showWarning('No Records', 'There are no records to export.');
      return;
    }
    this.reportsService.exportToJson(recordsToExport);
    this.showSuccess('JSON Exported', `Successfully exported ${recordsToExport.length} records as JSON file.`);
  }

  printReport(): void {
    window.print();
  }

  // ==================== MANUAL REPORT ENTRY MODAL ====================

  openManualEntryModal(): void {
    this.manualForm = {
      productId: '',
      productName: '',
      eventType: 'STOCK_RECEIVED',
      quantity: 1,
      location: 'Vadalur',
      updatedBy: '',
      date: this.getTodayDate(),
      remarks: ''
    };
    this.manualFormError = '';
    this.showManualEntryModal = true;
  }

  closeManualEntryModal(): void {
    this.showManualEntryModal = false;
    this.manualFormError = '';
  }

  saveManualEntry(): void {
    const pId = this.manualForm.productId.trim();
    const pName = this.manualForm.productName.trim();
    const user = this.manualForm.updatedBy.trim();
    const qty = Number(this.manualForm.quantity);

    if (!pId || !pName || !user) {
      this.manualFormError = 'Please fill in Product ID, Product Name, and Updated By.';
      return;
    }

    if (!Number.isSafeInteger(qty) || qty < 1) {
      this.manualFormError = 'Please enter a valid positive quantity.';
      return;
    }

    this.reportsService.recordEntry({
      productId: pId,
      productName: pName,
      eventType: this.manualForm.eventType,
      quantityChange: this.manualForm.eventType === 'STOCK_TRANSFERRED' ? -qty : qty,
      previousStock: 0,
      newStock: qty,
      location: this.manualForm.location,
      updatedBy: user,
      remarks: this.manualForm.remarks || 'Manual report log entry',
      date: this.manualForm.date
    });

    this.closeManualEntryModal();
    this.showSuccess('Record Added', `Report entry for ${pId} (${pName}) was successfully saved.`);
  }

  // ==================== CLEAR RECORDS ====================

  clearAllRecords(): void {
    this.showConfirm(
      'Clear All Report Logs?',
      'Are you sure you want to delete all line-by-line recorded history from reports? This action cannot be undone.',
      () => {
        this.reportsService.clearAllRecords();
        this.showSuccess('Reports Cleared', 'All report records have been cleared successfully.');
      },
      'Yes, Clear All',
      'error'
    );
  }

  deleteSingleRecord(record: ReportRecord): void {
    this.showConfirm(
      'Delete Record?',
      `Are you sure you want to delete report record #${record.id}?`,
      () => {
        this.reportsService.deleteRecord(record.id);
        this.showSuccess('Record Removed', `Report record #${record.id} was deleted.`);
      },
      'Delete Record',
      'error'
    );
  }

  // ==================== HELPERS ====================

  getBadgeClass(type: ReportEventType): string {
    switch (type) {
      case 'STOCK_RECEIVED':
        return 'badge-received';
      case 'PRODUCT_ADDED':
        return 'badge-added';
      case 'STOCK_TRANSFERRED':
        return 'badge-transferred';
      case 'PRODUCT_UPDATED':
        return 'badge-updated';
      case 'PRODUCT_DELETED':
      case 'LCC_TRANSFER_DELETED':
        return 'badge-deleted';
      default:
        return 'badge-default';
    }
  }

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  showSuccess(title: string, message: string, details?: { label: string; value: string | number }[]): void {
    this.modalDialog = {
      show: true,
      type: 'success',
      title,
      message,
      details,
      confirmText: 'OK',
      onConfirm: () => {
        this.modalDialog.show = false;
      }
    };
  }

  showWarning(title: string, message: string): void {
    this.modalDialog = {
      show: true,
      type: 'warning',
      title,
      message,
      confirmText: 'OK',
      onConfirm: () => {
        this.modalDialog.show = false;
      }
    };
  }

  showConfirm(
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirm',
    type: 'warning' | 'error' = 'warning'
  ): void {
    this.modalDialog = {
      show: true,
      type,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      onConfirm: () => {
        this.modalDialog.show = false;
        onConfirm();
      },
      onCancel: () => {
        this.modalDialog.show = false;
      }
    };
  }
}
