import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LccService, LccTransferItem } from '../../services/lcc.service';
import { ReportsService } from '../../services/reports.service';
import { DistributionService } from '../../services/distribution.service';

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
  selector: 'app-lcc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lcc.component.html',
  styleUrls: ['./lcc.component.css']
})
export class LccComponent implements OnInit, OnDestroy {
  items: LccTransferItem[] = [];
  searchText = '';
  private subscription?: Subscription;

  modalDialog: AppModalDialog = {
    show: false,
    type: 'success',
    title: '',
    message: ''
  };

  constructor(
    private lccService: LccService,
    private reportsService: ReportsService,
    private distributionService: DistributionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subscription = this.lccService.items$.subscribe(items => {
      this.items = items;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get totalItems(): number {
    return this.items.length;
  }

  get totalPieces(): number {
    return this.items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0
    );
  }

  get filteredItems(): LccTransferItem[] {
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return this.items;
    }

    return this.items.filter(item =>
      (item.productId && item.productId.toLowerCase().includes(search)) ||
      (item.name && item.name.toLowerCase().includes(search)) ||
      (item.switchedBy && item.switchedBy.toLowerCase().includes(search)) ||
      (item.location && item.location.toLowerCase().includes(search)) ||
      (item.date && item.date.toLowerCase().includes(search))
    );
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

  showSuccess(
    title: string,
    message: string,
    details?: { label: string; value: string | number }[]
  ): void {
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

  // ==================== EDIT LCC ITEM ====================
  showEditModal = false;
  selectedEditItem: LccTransferItem | null = null;
  editForm = {
    quantity: 1,
    switchedBy: '',
    date: '',
    location: ''
  };

  openEditModal(item: LccTransferItem): void {
    this.selectedEditItem = item;
    this.editForm = {
      quantity: item.quantity,
      switchedBy: item.switchedBy || '',
      date: item.date || '',
      location: item.location || ''
    };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedEditItem = null;
  }

  confirmSaveEdit(): void {
    if (!this.selectedEditItem) {
      return;
    }

    const qty = Number(this.editForm.quantity);
    const switchedBy = this.editForm.switchedBy.trim();

    if (!Number.isSafeInteger(qty) || qty < 1) {
      this.showWarning('Invalid Quantity', 'Please enter a valid positive quantity.');
      return;
    }

    if (!switchedBy) {
      this.showWarning('Switched By Required', 'Please enter who updated/switched this stock.');
      return;
    }

    const prevQty = this.selectedEditItem.quantity;
    const updatedItem: LccTransferItem = {
      ...this.selectedEditItem,
      quantity: qty,
      switchedBy: switchedBy,
      date: this.editForm.date || this.selectedEditItem.date,
      location: this.editForm.location || this.selectedEditItem.location,
      createdAt: new Date().toISOString()
    };

    this.lccService.updateItem(updatedItem);

    // Record in Reports
    this.reportsService.recordEntry({
      productId: updatedItem.productId || '',
      productName: updatedItem.name,
      eventType: 'STOCK_TRANSFERRED',
      eventTitle: 'LCC Stock Updated',
      quantityChange: qty - prevQty,
      previousStock: prevQty,
      newStock: qty,
      location: updatedItem.location,
      updatedBy: switchedBy,
      remarks: `LCC record updated by ${switchedBy}`,
      date: updatedItem.date
    });

    const label = `${updatedItem.productId} (${updatedItem.name})`;
    this.closeEditModal();
    this.showSuccess('LCC Record Updated', `${label} details have been updated successfully.`, [
      { label: 'Product', value: label },
      { label: 'LCC Stock', value: `${qty} PCS` },
      { label: 'Switched By', value: switchedBy }
    ]);
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

  deleteTransfer(id: number): void {
    const item = this.items.find(i => i.id === id);
    const label = item ? `${item.productId ? item.productId + ' (' + item.name + ')' : item.name}` : 'this transfer record';

    this.showConfirm(
      'Remove LCC Record?',
      `Are you sure you want to remove ${label} from LCC?`,
      () => {
        if (item) {
          this.reportsService.recordEntry({
            productId: item.productId || '',
            productName: item.name,
            eventType: 'LCC_TRANSFER_DELETED',
            eventTitle: 'LCC Transfer Removed',
            quantityChange: item.quantity,
            previousStock: 0,
            newStock: item.quantity,
            location: item.location || 'LCC',
            updatedBy: item.switchedBy || 'Admin',
            remarks: 'Record deleted from LCC'
          });
        }
        this.lccService.deleteTransfer(id);
        this.showSuccess('Record Removed', `${label} was removed from LCC inventory.`);
      },
      'Remove Record',
      'error'
    );
  }
  // ==================== TRANSFER TO DISTRIBUTION ====================
  showDistributionTransferModal = false;
  distTransferForm = {
    selectedItemId: '' as string | number,
    date: this.getTodayDate(),
    transferredBy: '',
    receiver: '',
    quantity: null as number | null
  };

  get availableLccItems(): LccTransferItem[] {
    return this.items.filter(item => (Number(item.quantity) || 0) > 0);
  }

  get selectedDistTransferProduct(): LccTransferItem | undefined {
    if (!this.distTransferForm.selectedItemId) {
      return undefined;
    }
    return this.items.find(item => String(item.id) === String(this.distTransferForm.selectedItemId));
  }

  get remainingDistTransferStock(): number {
    const product = this.selectedDistTransferProduct;
    if (!product) return 0;
    const qty = Number(this.distTransferForm.quantity) || 0;
    const remaining = product.quantity - qty;
    return remaining >= 0 ? remaining : 0;
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  private formatDateForDistribution(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  }

  openDistributionTransferModal(): void {
    const available = this.availableLccItems;
    this.distTransferForm = {
      selectedItemId: available.length > 0 ? available[0].id : '',
      date: this.getTodayDate(),
      transferredBy: '',
      receiver: '',
      quantity: null
    };
    this.showDistributionTransferModal = true;
  }

  closeDistributionTransferModal(): void {
    this.showDistributionTransferModal = false;
  }

  confirmDistributionTransfer(): void {
    const product = this.selectedDistTransferProduct;
    const quantity = Number(this.distTransferForm.quantity);
    const transferredBy = this.distTransferForm.transferredBy.trim();
    const receiver = this.distTransferForm.receiver.trim();
    const transferDate = this.distTransferForm.date;

    if (!product) {
      this.showWarning('Select Product', 'Please select a product from LCC inventory to transfer.');
      return;
    }

    if (!transferDate || !transferredBy || !receiver || !this.distTransferForm.quantity) {
      this.showWarning('Required Fields', 'Please complete all required fields.');
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > product.quantity
    ) {
      this.showWarning('Invalid Quantity', `Enter a valid quantity within available LCC stock (${product.quantity} PCS).`);
      return;
    }

    const remainingQty = product.quantity - quantity;
    if (remainingQty <= 0) {
      this.lccService.deleteTransfer(product.id);
    } else {
      this.lccService.updateItem({
        ...product,
        quantity: remainingQty
      });
    }

    this.distributionService.addDistribution({
      product: product.name,
      productId: product.productId || '',
      quantity: quantity,
      volunteer: transferredBy,
      receiver: receiver,
      date: this.formatDateForDistribution(transferDate),
      status: 'Assigned',
      location: product.location || 'LCC'
    });

    this.reportsService.recordEntry({
      productId: product.productId || '',
      productName: product.name,
      eventType: 'STOCK_TRANSFERRED',
      eventTitle: 'Transferred to Distribution',
      quantityChange: -quantity,
      previousStock: product.quantity,
      newStock: Math.max(0, remainingQty),
      location: product.location || 'LCC',
      updatedBy: transferredBy,
      remarks: `Transferred to Distribution (${receiver})`,
      date: transferDate
    });

    this.closeDistributionTransferModal();

    this.showSuccess(
      'Transferred to Distribution Successfully!',
      'Product stock has been transferred from LCC to Distribution.',
      [
        { label: 'Product', value: `${product.productId ? product.productId + ' (' + product.name + ')' : product.name}` },
        { label: 'Quantity Transferred', value: `${quantity} PCS` },
        { label: 'Remaining LCC Stock', value: `${Math.max(0, remainingQty)} PCS` },
        { label: 'Transferred By', value: transferredBy },
        { label: 'Receiver / Destination', value: receiver }
      ]
    );
  }

  resetAllData(): void {
    this.showConfirm(
      'Reset All Data?',
      'Are you sure you want to reset and clear all entered products and transfer data? This action cannot be undone.',
      () => {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem('warehouse_products');
            localStorage.removeItem('lcc_transferred_items');
            localStorage.removeItem('lcc_distribution_records');
            localStorage.removeItem('lcc_reports_records');
          }
        } catch (e) {
          console.error('Failed to clear data', e);
        }
        this.items = [];
        this.lccService.clearAll();
        this.distributionService.clearAll();
        this.reportsService.clearAllRecords();
        this.showSuccess('Data Reset Complete', 'All entered products, LCC items, and report records have been cleared successfully.');
      },
      'Yes, Reset All',
      'error'
    );
  }

  goBackToProducts(): void {
    this.router.navigate(['/products']);
  }

  trackByTransferId(index: number, item: LccTransferItem): number {
    return item.id;
  }
}