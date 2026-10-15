
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LccService } from '../../services/lcc.service';
import { ReportsService } from '../../services/reports.service';

interface Product {
  id: number;
  productId: string;
  name: string;
  quantity: number;
  receivedDate: string;
  sponsorName?: string;
  image?: string;
  location: string;
  updatedBy?: string;
  addedBy?: string;
}

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
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.css'
})
export class Products {

  // ==================== PRODUCTS ====================

  products: Product[] = [];

  productNames: string[] = [
    'Saree',
    'T-Shirt',
    'Vesti',
    'Towel',
    'Soap',
    'Oil'
  ];

  locations: string[] = [
    'Vadalur',
    'Tiruppur',
    'Bangalore'
  ];

  searchText = '';
  showForm = false;
  showTransferForm = false;
  showReceiveStockModal = false;
  selectedReceiveProduct: Product | null = null;
  receiveStockForm = {
    quantity: null as number | null,
    updatedBy: '',
    date: ''
  };
  editingId: number | null = null;

  // Generic in-app dialog
  modalDialog: AppModalDialog = {
    show: false,
    type: 'success',
    title: '',
    message: ''
  };

  // Add Product Name modal (replaces window.prompt)
  showAddNameModal = false;
  newProductNameInput = '';
  addNameError = '';

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

  // Product ID counter
  nextProductId = 102;

  constructor(
    private lccService: LccService,
    private reportsService: ReportsService
  ) {
    this.loadProducts();
  }

  private loadProducts(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('warehouse_products');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.products = parsed;
            const maxId = parsed.reduce((max: number, p: Product) => {
              const num = parseInt(p.productId?.replace(/\D/g, '') || '0', 10);
              return Math.max(max, num);
            }, 101);
            this.nextProductId = maxId + 1;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load products from localStorage', e);
    }
  }

  private saveProducts(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('warehouse_products', JSON.stringify(this.products));
      }
    } catch (e) {
      console.error('Failed to save products to localStorage', e);
    }
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
          }
        } catch (e) {
          console.error('Failed to clear data', e);
        }
        this.products = [];
        this.nextProductId = 102;
        this.lccService.clearAll();
        this.showSuccess('Data Reset Complete', 'All entered products and LCC transfer records have been cleared successfully.');
      },
      'Yes, Reset All',
      'error'
    );
  }

  getPrefixFromName(name: string): string {
    if (!name) {
      return 'PR';
    }
    // Extract letters only to properly handle names like "T-Shirt" -> "TS", "Saree" -> "SA"
    const lettersOnly = name.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length >= 2) {
      return lettersOnly.slice(0, 2).toUpperCase();
    }
    const clean = name.trim().toUpperCase();
    return clean ? (clean + 'XX').slice(0, 2) : 'PR';
  }

  generateProductId(name: string = ''): string {
    const prefix = this.getPrefixFromName(name);
    return `${prefix}_${this.nextProductId}`;
  }

  onProductNameChange(name: string): void {
    if (!name) {
      return;
    }
    const prefix = this.getPrefixFromName(name);
    const numMatch = this.productForm.productId?.match(/\d+/);
    const num = numMatch ? numMatch[0] : String(this.nextProductId);
    this.productForm.productId = `${prefix}_${num}`;
  }

  // ==================== TRANSFER FORM ====================

  transferForm: {
    productId: string;
    date: string;
    switchedBy: string;
    quantity: number | null;
  } = {
    productId: '',
    date: this.getTodayDate(),
    switchedBy: '',
    quantity: null
  };

  get selectedTransferProduct(): Product | undefined {
    if (!this.transferForm.productId) {
      return undefined;
    }
    const targetId = Number(this.transferForm.productId);
    return this.products.find(
      product => product.id === targetId
    );
  }

  get remainingTransferStock(): number {
    const product = this.selectedTransferProduct;
    if (!product) {
      return 0;
    }

    const qty = Number(this.transferForm.quantity);
    if (!qty || isNaN(qty) || qty <= 0) {
      return product.quantity;
    }

    const remaining = product.quantity - qty;
    return remaining >= 0 ? remaining : 0;
  }

  openTransferForm(): void {
    this.transferForm = {
      productId: '',
      date: this.getTodayDate(),
      switchedBy: '',
      quantity: null
    };

    this.showTransferForm = true;
  }

  closeTransferForm(): void {
    this.showTransferForm = false;
  }

  confirmTransfer(): void {
    const product = this.selectedTransferProduct;
    const quantity = Number(this.transferForm.quantity);
    const switchedBy = this.transferForm.switchedBy.trim();

    if (!product) {
      this.showWarning('Select Product', 'Please select a product to transfer.');
      return;
    }

    if (!this.transferForm.date || !switchedBy || !this.transferForm.quantity) {
      this.showWarning('Required Fields', 'Please complete all required fields.');
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > product.quantity
    ) {
      this.showWarning('Invalid Quantity', 'Enter a valid quantity within available warehouse stock.');
      return;
    }

    // Reduce warehouse stock
    this.products = this.products.map(item =>
      item.id === product.id
        ? { ...item, quantity: item.quantity - quantity }
        : item
    );
    this.saveProducts();

    // Add transfer record to LCC
    this.lccService.addTransfer({
      productId: product.productId || '',
      name: product.name,
      quantity,
      date: this.transferForm.date,
      switchedBy,
      location: product.location || 'Not assigned'
    });

    // Record every transfer in Reports line-by-line
    this.reportsService.recordEntry({
      productId: product.productId || '',
      productName: product.name,
      eventType: 'STOCK_TRANSFERRED',
      eventTitle: 'Stock Transferred to LCC',
      quantityChange: -quantity,
      previousStock: product.quantity,
      newStock: product.quantity - quantity,
      location: product.location || 'Not assigned',
      updatedBy: switchedBy,
      remarks: `Transferred to LCC inventory`,
      date: this.transferForm.date
    });

    this.closeTransferForm();

    this.showSuccess(
      'Transferred to LCC Successfully!',
      'Product stock has been transferred from warehouse to LCC inventory.',
      [
        { label: 'Product', value: `${product.productId ? product.productId + ' (' + product.name + ')' : product.name}` },
        { label: 'Quantity Transferred', value: `${quantity} PCS` },
        { label: 'Remaining Warehouse Stock', value: `${product.quantity - quantity} PCS` },
        { label: 'Switched By', value: switchedBy }
      ]
    );
  }

  // ==================== DATE ====================

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ==================== EMPTY PRODUCT ====================

  emptyProduct(): Product {
    return {
      id: 0,
      productId: '',
      name: '',
      quantity: 1,
      receivedDate: this.getTodayDate(),
      sponsorName: '',
      image: '',
      location: '',
      updatedBy: '',
      addedBy: ''
    };
  }

  productForm: Product = this.emptyProduct();

  // ==================== ADD PRODUCT NAME MODAL ====================

  openAddNameModal(): void {
    this.newProductNameInput = '';
    this.addNameError = '';
    this.showAddNameModal = true;
  }

  closeAddNameModal(): void {
    this.showAddNameModal = false;
    this.newProductNameInput = '';
    this.addNameError = '';
  }

  confirmAddName(): void {
    const name = this.newProductNameInput.trim();
    if (!name) {
      this.addNameError = 'Please enter a product name.';
      return;
    }

    const alreadyExists = this.productNames.some(
      item => item.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      this.addNameError = 'This product name already exists.';
      return;
    }

    this.productNames = [...this.productNames, name];
    this.productForm.name = name;
    this.onProductNameChange(name);
    this.closeAddNameModal();
  }

  addNewProductName(): void {
    this.openAddNameModal();
  }

  // ==================== SEARCH PRODUCTS ====================

  get filteredProducts(): Product[] {
    const search = this.searchText.trim().toLowerCase();

    return this.products.filter(product =>
      product.productId.toLowerCase().includes(search) ||
      product.name.toLowerCase().includes(search) ||
      (product.sponsorName ? product.sponsorName.toLowerCase().includes(search) : false) ||
      product.location.toLowerCase().includes(search)
    );
  }

  // ==================== TOTAL STOCK ====================

  get totalPieces(): number {
    return this.products.reduce(
      (total, product) => total + product.quantity,
      0
    );
  }

  // ==================== OPEN ADD FORM ====================

  openAddForm(): void {
    this.editingId = null;
    this.productForm = this.emptyProduct();
    this.showForm = true;
  }

  // ==================== EDIT PRODUCT ====================

  editProduct(product: Product): void {
    this.editingId = product.id;

    this.productForm = {
      ...product,
      productId: product.productId ||
        (product.id ? String(product.id) : '')
    };

    this.showForm = true;
  }

  // ==================== SAVE PRODUCT ====================

  saveProduct(): void {
    const productId = this.productForm.productId.trim();
    const name = this.productForm.name.trim();
    const location = this.productForm.location;
    const quantity = Number(this.productForm.quantity);
    const updatedBy = (this.productForm.updatedBy || this.productForm.addedBy || '').trim();

    if (
      !productId ||
      !name ||
      !location ||
      !this.productForm.receivedDate ||
      !updatedBy
    ) {
      this.showWarning('Missing Fields', 'Please fill in all required fields, including who added this product.');
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      this.showWarning('Invalid Quantity', 'Quantity must be a positive whole number.');
      return;
    }

    // Prevent duplicate Product IDs
    const isDuplicate = this.products.some(
      existing =>
        existing.productId.toLowerCase() === productId.toLowerCase() &&
        existing.id !== this.editingId
    );

    if (isDuplicate) {
      this.showWarning('Duplicate ID', 'This Product ID already exists. Please use a unique ID.');
      return;
    }

    // Add new product names to the dropdown
    if (
      !this.productNames.some(
        item => item.toLowerCase() === name.toLowerCase()
      )
    ) {
      this.productNames = [...this.productNames, name];
    }

    const isNew = this.editingId === null;
    const oldProduct = !isNew ? this.products.find(existing => existing.id === this.editingId) : undefined;
    const prevStock = oldProduct ? oldProduct.quantity : 0;
    const addedBy = isNew ? updatedBy : (oldProduct?.addedBy || updatedBy);

    const product: Product = {
      id: this.editingId ?? Date.now(),
      productId,
      name,
      quantity,
      receivedDate: this.productForm.receivedDate,
      sponsorName: this.productForm.sponsorName || '',
      image: this.productForm.image || '',
      location,
      updatedBy,
      addedBy
    };

    if (this.editingId !== null) {
      // Update existing product
      this.products = this.products.map(existing =>
        existing.id === this.editingId
          ? product
          : existing
      );
    } else {
      // Add new product
      this.products = [...this.products, product];
      const enteredNum = parseInt(productId.replace(/\D/g, ''), 10);
      if (!isNaN(enteredNum) && enteredNum >= this.nextProductId) {
        this.nextProductId = enteredNum + 1;
      } else {
        this.nextProductId++;
      }
    }

    this.saveProducts();

    // Record every product entry in Reports line-by-line
    this.reportsService.recordEntry({
      productId: product.productId,
      productName: product.name,
      eventType: isNew ? 'PRODUCT_ADDED' : 'PRODUCT_UPDATED',
      eventTitle: isNew ? 'Product Added' : 'Product Updated',
      quantityChange: isNew ? product.quantity : (product.quantity - prevStock),
      previousStock: prevStock,
      newStock: product.quantity,
      location: product.location,
      updatedBy: updatedBy,
      remarks: isNew
        ? (product.sponsorName ? `Sponsor: ${product.sponsorName} • Added by ${updatedBy}` : `Added by ${updatedBy}`)
        : `Updated by ${updatedBy}`,
      date: product.receivedDate
    });

    this.closeForm();

    this.showSuccess(
      isNew ? 'Product Added Successfully!' : 'Product Updated Successfully!',
      isNew
        ? 'New product has been added to warehouse inventory.'
        : 'Product details have been updated.',
      [
        { label: 'Product ID', value: product.productId },
        { label: 'Product Name', value: product.name },
        { label: 'Available Stock', value: `${product.quantity} PCS` },
        { label: 'Location', value: product.location },
        { label: isNew ? 'Added by' : 'Updated by', value: updatedBy }
      ]
    );
  }

  // ==================== RECEIVE STOCK ====================

  // ==================== RECEIVE STOCK ====================

  openReceiveStock(product: Product): void {
    this.selectedReceiveProduct = product;
    this.receiveStockForm = {
      quantity: null,
      updatedBy: product.updatedBy || '',
      date: this.getTodayDate()
    };
    this.showReceiveStockModal = true;
  }

  closeReceiveStock(): void {
    this.showReceiveStockModal = false;
    this.selectedReceiveProduct = null;
  }

  confirmReceiveStock(): void {
    if (!this.selectedReceiveProduct) {
      return;
    }

    const qty = Number(this.receiveStockForm.quantity);
    const updatedBy = this.receiveStockForm.updatedBy?.trim() || '';

    if (!Number.isSafeInteger(qty) || qty < 1) {
      this.showWarning('Invalid Quantity', 'Please enter a valid positive quantity.');
      return;
    }

    if (!updatedBy) {
      this.showWarning('Updated By Required', 'Please enter who updated / received this stock.');
      return;
    }

    const targetId = this.selectedReceiveProduct.id;
    const previousQty = this.selectedReceiveProduct.quantity;
    const newQty = previousQty + qty;

    this.products = this.products.map(p =>
      p.id === targetId
        ? {
            ...p,
            quantity: newQty,
            updatedBy: updatedBy,
            receivedDate: this.receiveStockForm.date || p.receivedDate
          }
        : p
    );

    this.saveProducts();
    const prod = this.selectedReceiveProduct;
    this.closeReceiveStock();

    // Record every stock received in Reports line-by-line
    this.reportsService.recordEntry({
      productId: prod.productId,
      productName: prod.name,
      eventType: 'STOCK_RECEIVED',
      eventTitle: 'Stock Received',
      quantityChange: qty,
      previousStock: previousQty,
      newStock: newQty,
      location: prod.location,
      updatedBy: updatedBy,
      remarks: `Stock updated (+${qty} PCS)`,
      date: this.receiveStockForm.date
    });

    this.showSuccess(
      'Stock Updated Successfully!',
      'Warehouse stock has been received and updated.',
      [
        { label: 'Product', value: `${prod.productId} (${prod.name})` },
        { label: 'Added', value: `+${qty} PCS` },
        { label: 'New Available Stock', value: `${newQty} PCS` },
        { label: 'Updated by', value: updatedBy }
      ]
    );
  }

  addReceivedStock(product: Product): void {
    this.openReceiveStock(product);
  }

  // ==================== DELETE PRODUCT ====================

  deleteProduct(id: number): void {
    const product = this.products.find(p => p.id === id);
    const name = product ? `${product.productId} (${product.name})` : 'this product';
    this.showConfirm(
      'Delete Product?',
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
      () => {
        if (product) {
          // Record product deletion in Reports line-by-line
          this.reportsService.recordEntry({
            productId: product.productId,
            productName: product.name,
            eventType: 'PRODUCT_DELETED',
            eventTitle: 'Product Deleted',
            quantityChange: -product.quantity,
            previousStock: product.quantity,
            newStock: 0,
            location: product.location,
            updatedBy: 'Admin',
            remarks: 'Product removed from warehouse inventory'
          });
        }
        this.products = this.products.filter(p => p.id !== id);
        this.saveProducts();
        this.showSuccess('Product Deleted', `${name} was removed from warehouse products.`);
      },
      'Delete Product',
      'error'
    );
  }

  // ==================== CLOSE ADD / EDIT FORM ====================

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.productForm = this.emptyProduct();
  }

  // ==================== TRACK PRODUCTS ====================

  trackByProductId(
    index: number,
    product: Product
  ): number {
    return product.id;
  }
}
