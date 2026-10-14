
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LccService } from '../../services/lcc.service';

interface Product {
  id: number;
  productId: string;
  name: string;
  quantity: number;
  receivedDate: string;
  sponsorName?: string;
  image?: string;
  location: string;
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
  editingId: number | null = null;

  // Product ID counter
  nextProductId = 102;

  constructor(private lccService: LccService) {
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

  generateProductId(): string {
    return `PR${this.nextProductId}`;
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
      window.alert('Please select a product.');
      return;
    }

    if (!this.transferForm.date || !switchedBy || !this.transferForm.quantity) {
      window.alert('Please complete all required fields.');
      return;
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > product.quantity
    ) {
      window.alert(
        'Enter a valid quantity within available stock.'
      );
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

    window.alert(
      `${quantity} PCS of ${product.productId ? product.productId + ' (' + product.name + ')' : product.name} transferred to LCC successfully.`
    );

    this.closeTransferForm();
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
      productId: this.generateProductId(),
      name: '',
      quantity: 1,
      receivedDate: this.getTodayDate(),
      sponsorName: '',
      image: '',
      location: ''
    };
  }

  productForm: Product = this.emptyProduct();

  // ==================== ADD PRODUCT NAME ====================

  addNewProductName(): void {
    const enteredName = window.prompt(
      'Enter the new product name:'
    );

    if (!enteredName?.trim()) {
      return;
    }

    const name = enteredName.trim();

    const alreadyExists = this.productNames.some(
      item => item.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) {
      window.alert('This product name already exists.');
      return;
    }

    this.productNames = [...this.productNames, name];
    this.productForm.name = name;
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

    if (
      !productId ||
      !name ||
      !location ||
      !this.productForm.receivedDate
    ) {
      window.alert('Please fill in all required fields.');
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      window.alert(
        'Quantity must be a positive whole number.'
      );
      return;
    }

    // Prevent duplicate Product IDs
    const isDuplicate = this.products.some(
      existing =>
        existing.productId.toLowerCase() === productId.toLowerCase() &&
        existing.id !== this.editingId
    );

    if (isDuplicate) {
      window.alert(
        'This Product ID already exists. Please use a unique ID.'
      );
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

    const product: Product = {
      id: this.editingId ?? Date.now(),
      productId,
      name,
      quantity,
      receivedDate: this.productForm.receivedDate,
      sponsorName: this.productForm.sponsorName || '',
      image: this.productForm.image || '',
      location
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
      this.nextProductId++;
    }

    this.saveProducts();
    this.closeForm();
  }

  // ==================== RECEIVE STOCK ====================

  addReceivedStock(product: Product): void {
    const input = window.prompt(
      `Product ID: ${product.productId}\n` +
      `Product: ${product.name}\n` +
      `Location: ${product.location}\n` +
      `Current stock: ${product.quantity} PCS\n` +
      'Enter additional pieces received:'
    );

    if (input === null || !input.trim()) {
      return;
    }

    const quantity = Number(input);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      !Number.isSafeInteger(product.quantity + quantity)
    ) {
      window.alert(
        'Enter a valid positive whole number.'
      );
      return;
    }

    this.products = this.products.map(existing =>
      existing.id === product.id
        ? {
            ...existing,
            quantity: existing.quantity + quantity
          }
        : existing
    );
    this.saveProducts();

    const updated = this.products.find(
      item => item.id === product.id
    );

    if (updated) {
      window.alert(
        `${updated.productId} - ${updated.name}: ` +
        `${updated.quantity} PCS available.`
      );
    }
  }

  // ==================== DELETE PRODUCT ====================

  deleteProduct(id: number): void {
    if (
      window.confirm(
        'Are you sure you want to delete this product?'
      )
    ) {
      this.products = this.products.filter(
        product => product.id !== id
      );
      this.saveProducts();
    }
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
