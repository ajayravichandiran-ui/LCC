
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

interface ProductFormData {
  id: number;
  productId: string;
  name: string;
  quantity: number | null;
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
            const mapped = parsed.map((p: any, idx: number) => {
              const safeName = (p.name || 'Product').trim();
              const prefix = this.getPrefixFromName(safeName);
              const idNum = p.productId ? parseInt(String(p.productId).replace(/\D/g, ''), 10) : (101 + idx);
              const safeProductId = p.productId ? String(p.productId).trim() : `${prefix}_${isNaN(idNum) ? 101 + idx : idNum}`;
              const safeQty = Number(p.quantity);

              return {
                id: p.id ? Number(p.id) : (Date.now() + idx),
                productId: safeProductId,
                name: safeName,
                quantity: !isNaN(safeQty) && safeQty >= 0 ? safeQty : 0,
                receivedDate: p.receivedDate || this.getTodayDate(),
                sponsorName: p.sponsorName || '',
                image: p.image || '',
                location: p.location || 'Vadalur',
                updatedBy: p.updatedBy || p.addedBy || 'Admin',
                addedBy: p.addedBy || p.updatedBy || 'Admin'
              };
            });

            // Consolidate any existing duplicates by product name (e.g. SA_104 and SA_106 Sarees)
            const consolidated = this.consolidateDuplicateProducts(mapped);
            // Automatically remove any products where available stock is 0 or less
            this.products = consolidated.filter(p => (Number(p.quantity) || 0) > 0);
            if (this.products.length !== parsed.length) {
              this.saveProducts();
            }

            const maxId = this.products.reduce((max: number, p: Product) => {
              const num = parseInt(p.productId?.replace(/\D/g, '') || '0', 10);
              return Math.max(max, isNaN(num) ? 0 : num);
            }, 101);
            this.nextProductId = maxId + 1;
            return;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load products from localStorage', e);
    }
  }

  private consolidateDuplicateProducts(products: Product[]): Product[] {
    const grouped = new Map<string, Product[]>();

    for (const p of products) {
      const nameKey = (p.name || '').trim().toLowerCase();
      if (!nameKey) continue;

      if (!grouped.has(nameKey)) {
        grouped.set(nameKey, []);
      }
      grouped.get(nameKey)!.push(p);
    }

    const consolidated: Product[] = [];

    for (const [nameKey, list] of grouped.entries()) {
      if (list.length === 1) {
        consolidated.push(list[0]);
      } else {
        // Multiple entries for same product name exist (e.g. SA_104 with 90 and SA_106 with 88)
        // Sort to determine earliest/primary record
        list.sort((a, b) => {
          const numA = parseInt(a.productId?.replace(/\D/g, '') || String(a.id || 0), 10);
          const numB = parseInt(b.productId?.replace(/\D/g, '') || String(b.id || 0), 10);
          return (isNaN(numA) ? 0 : numA) - (isNaN(numB) ? 0 : numB);
        });

        const earliest = list[0];
        const totalQty = list.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        // Find latest update for date and updatedBy
        const sortedByDate = [...list].sort((a, b) => {
          const timeA = new Date(a.receivedDate || 0).getTime() || a.id || 0;
          const timeB = new Date(b.receivedDate || 0).getTime() || b.id || 0;
          return timeB - timeA;
        });
        const latest = sortedByDate[0];

        consolidated.push({
          ...earliest,
          name: latest.name || earliest.name,
          quantity: totalQty,
          receivedDate: latest.receivedDate || earliest.receivedDate,
          updatedBy: latest.updatedBy || earliest.updatedBy,
          location: latest.location || earliest.location,
          sponsorName: latest.sponsorName || earliest.sponsorName || '',
          image: latest.image || earliest.image || ''
        });
      }
    }

    return consolidated;
  }

  private saveProducts(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Exclude products with 0 or negative available stock
        this.products = this.products.filter(p => (Number(p.quantity) || 0) > 0);
        localStorage.setItem('warehouse_products', JSON.stringify(this.products));
      }
    } catch (e) {
      console.error('Failed to save products to localStorage', e);
    }
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

  get existingMatchedProduct(): Product | null {
    if (this.editingId !== null || !this.productForm.name) {
      return null;
    }
    const clean = this.productForm.name.trim().toLowerCase();
    if (!clean) return null;
    return this.products.find(p => (p.name || '').trim().toLowerCase() === clean) || null;
  }

  onProductNameChange(name: string): void {
    if (!name) {
      return;
    }
    const cleanName = name.trim().toLowerCase();
    const existing = this.products.find(p => (p.name || '').trim().toLowerCase() === cleanName);

    if (existing && this.editingId === null) {
      // Product already exists in warehouse -> reuse its established Product ID and Location
      this.productForm.productId = existing.productId;
      if (existing.location && !this.productForm.location) {
        this.productForm.location = existing.location;
      }
    } else if (this.editingId === null) {
      const prefix = this.getPrefixFromName(name);
      const numMatch = this.productForm.productId?.match(/\d+/);
      const num = numMatch ? numMatch[0] : String(this.nextProductId);
      this.productForm.productId = `${prefix}_${num}`;
    }
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

    // Reduce warehouse stock, or remove product entirely if stock reaches 0
    const remainingQty = product.quantity - quantity;
    if (remainingQty <= 0) {
      this.products = this.products.filter(item => item.id !== product.id);
    } else {
      this.products = this.products.map(item =>
        item.id === product.id
          ? { ...item, quantity: remainingQty }
          : item
      );
    }
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

  emptyProduct(): ProductFormData {
    return {
      id: 0,
      productId: this.generateProductId(),
      name: '',
      quantity: null,
      receivedDate: this.getTodayDate(),
      sponsorName: '',
      image: '',
      location: '',
      updatedBy: '',
      addedBy: ''
    };
  }

  productForm: ProductFormData = this.emptyProduct();

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
    const activeProducts = this.products.filter(p => (Number(p.quantity) || 0) > 0);
    const search = this.searchText.trim().toLowerCase();
    if (!search) {
      return activeProducts;
    }

    return activeProducts.filter(product =>
      (product.productId || '').toLowerCase().includes(search) ||
      (product.name || '').toLowerCase().includes(search) ||
      (product.sponsorName || '').toLowerCase().includes(search) ||
      (product.location || '').toLowerCase().includes(search)
    );
  }

  // ==================== TOTAL STOCK ====================

  get totalPieces(): number {
    return this.products
      .filter(p => (Number(p.quantity) || 0) > 0)
      .reduce(
        (total, product) => total + (Number(product.quantity) || 0),
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
      quantity: product.quantity,
      productId: product.productId ||
        (product.id ? String(product.id) : '')
    };

    this.showForm = true;
  }

  // ==================== SAVE PRODUCT ====================

  saveProduct(): void {
    const productId = (this.productForm.productId || '').trim();
    const name = (this.productForm.name || '').trim();
    const location = (this.productForm.location || '').trim();
    const quantity = Number(this.productForm.quantity);
    const updatedBy = (this.productForm.updatedBy || this.productForm.addedBy || '').trim();

    if (!name) {
      this.showWarning('Missing Product Name', 'Please select or enter a Product Name.');
      return;
    }

    if (!productId) {
      this.showWarning('Missing Product ID', 'Please enter a Product ID.');
      return;
    }

    if (
      this.productForm.quantity === null ||
      this.productForm.quantity === undefined ||
      this.productForm.quantity === ('' as any) ||
      isNaN(quantity) ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      this.showWarning('Invalid Quantity', 'Total quantity must be a positive whole number (at least 1 PCS).');
      return;
    }

    if (!this.productForm.receivedDate) {
      this.showWarning('Missing Received Date', 'Please select the date the product was received.');
      return;
    }

    if (!location) {
      this.showWarning('Missing Location', 'Please select the warehouse storage location.');
      return;
    }

    if (!updatedBy) {
      this.showWarning('Missing Name', 'Please enter your name in the "Your Name" field.');
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

    // ==================== CHECK FOR EXISTING PRODUCT (NO REPETITION) ====================
    if (this.editingId === null) {
      // Adding a product: Check if product with this name (or productId) already exists
      const existingProduct = this.products.find(
        p => (p.name || '').trim().toLowerCase() === name.toLowerCase() ||
             (p.productId || '').trim().toLowerCase() === productId.toLowerCase()
      );

      if (existingProduct) {
        // Product already exists -> merge into existing product (no duplicate card!)
        const prevStock = existingProduct.quantity;
        const addedQty = quantity;
        const newTotalStock = prevStock + addedQty;

        const updatedProduct: Product = {
          ...existingProduct,
          name: name, // Updated name / casing
          quantity: newTotalStock,
          receivedDate: this.productForm.receivedDate || this.getTodayDate(),
          updatedBy: updatedBy,
          location: location || existingProduct.location,
          sponsorName: this.productForm.sponsorName || existingProduct.sponsorName || '',
          image: this.productForm.image || existingProduct.image || ''
        };

        this.products = this.products.map(p =>
          p.id === existingProduct.id ? updatedProduct : p
        );
        this.saveProducts();

        // Record stock addition in Reports line-by-line
        this.reportsService.recordEntry({
          productId: existingProduct.productId,
          productName: existingProduct.name,
          eventType: 'STOCK_RECEIVED',
          eventTitle: 'Stock Added to Existing Product',
          quantityChange: addedQty,
          previousStock: prevStock,
          newStock: newTotalStock,
          location: updatedProduct.location,
          updatedBy: updatedBy,
          remarks: `Added +${addedQty} PCS to existing ${existingProduct.name} (Total: ${newTotalStock} PCS)${this.productForm.sponsorName ? ' • Sponsor: ' + this.productForm.sponsorName : ''}`,
          date: updatedProduct.receivedDate
        });

        this.closeForm();

        this.showSuccess(
          'Existing Product Stock Updated!',
          `"${existingProduct.name}" already exists in inventory. Added +${addedQty} PCS to existing stock without creating a duplicate.`,
          [
            { label: 'Product ID', value: existingProduct.productId },
            { label: 'Product Name', value: existingProduct.name },
            { label: 'Previous Stock', value: `${prevStock} PCS` },
            { label: 'Added Quantity', value: `+${addedQty} PCS` },
            { label: 'Total Available Stock', value: `${newTotalStock} PCS` },
            { label: 'Received Date', value: updatedProduct.receivedDate },
            { label: 'Updated By', value: updatedBy },
            { label: 'Location', value: updatedProduct.location }
          ]
        );
        return;
      }
    }

    // ==================== EDITING EXISTING PRODUCT ====================
    if (this.editingId !== null) {
      // Check if user changed name or productId to match ANOTHER product
      const conflictingProduct = this.products.find(
        existing =>
          existing.id !== this.editingId &&
          ((existing.name || '').trim().toLowerCase() === name.toLowerCase() ||
           (existing.productId || '').trim().toLowerCase() === productId.toLowerCase())
      );

      if (conflictingProduct) {
        // Merge this edited product into the target conflicting product
        const prevStock = conflictingProduct.quantity;
        const newTotal = prevStock + quantity;

        const merged: Product = {
          ...conflictingProduct,
          quantity: newTotal,
          receivedDate: this.productForm.receivedDate || conflictingProduct.receivedDate,
          updatedBy: updatedBy,
          location: location || conflictingProduct.location,
          sponsorName: this.productForm.sponsorName || conflictingProduct.sponsorName || '',
          image: this.productForm.image || conflictingProduct.image || ''
        };

        // Remove edited product and update the target product
        this.products = this.products
          .filter(p => p.id !== this.editingId)
          .map(p => p.id === conflictingProduct.id ? merged : p);
        this.saveProducts();

        // Record in reports
        this.reportsService.recordEntry({
          productId: conflictingProduct.productId,
          productName: conflictingProduct.name,
          eventType: 'PRODUCT_UPDATED',
          eventTitle: 'Product Merged on Edit',
          quantityChange: quantity,
          previousStock: prevStock,
          newStock: newTotal,
          location: merged.location,
          updatedBy: updatedBy,
          remarks: `Merged into existing ${conflictingProduct.name} (+${quantity} PCS)`,
          date: merged.receivedDate
        });

        this.closeForm();

        this.showSuccess(
          'Products Merged Successfully!',
          `Product was merged into existing "${conflictingProduct.name}" to prevent repetition.`,
          [
            { label: 'Product ID', value: conflictingProduct.productId },
            { label: 'Total Stock', value: `${newTotal} PCS` },
            { label: 'Updated By', value: updatedBy }
          ]
        );
        return;
      }

      // Normal edit of existing product
      const oldProduct = this.products.find(existing => existing.id === this.editingId);
      const prevStock = oldProduct ? oldProduct.quantity : 0;
      const addedBy = oldProduct?.addedBy || updatedBy;

      const product: Product = {
        id: this.editingId,
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

      this.products = this.products.map(existing =>
        existing.id === this.editingId ? product : existing
      );
      this.saveProducts();

      this.reportsService.recordEntry({
        productId: product.productId,
        productName: product.name,
        eventType: 'PRODUCT_UPDATED',
        eventTitle: 'Product Updated',
        quantityChange: product.quantity - prevStock,
        previousStock: prevStock,
        newStock: product.quantity,
        location: product.location,
        updatedBy: updatedBy,
        remarks: `Updated by ${updatedBy}`,
        date: product.receivedDate
      });

      this.closeForm();

      this.showSuccess(
        'Product Updated Successfully!',
        'Product details have been updated.',
        [
          { label: 'Product ID', value: product.productId },
          { label: 'Product Name', value: product.name },
          { label: 'Available Stock', value: `${product.quantity} PCS` },
          { label: 'Location', value: product.location },
          { label: 'Updated By', value: updatedBy }
        ]
      );
      return;
    }

    // ==================== BRAND NEW PRODUCT ====================
    const product: Product = {
      id: Date.now(),
      productId,
      name,
      quantity,
      receivedDate: this.productForm.receivedDate,
      sponsorName: this.productForm.sponsorName || '',
      image: this.productForm.image || '',
      location,
      updatedBy,
      addedBy: updatedBy
    };

    this.products = [product, ...this.products];
    const enteredNum = parseInt(productId.replace(/\D/g, ''), 10);
    if (!isNaN(enteredNum) && enteredNum >= this.nextProductId) {
      this.nextProductId = enteredNum + 1;
    } else {
      this.nextProductId++;
    }

    this.saveProducts();

    // Record brand new product entry in Reports line-by-line
    this.reportsService.recordEntry({
      productId: product.productId,
      productName: product.name,
      eventType: 'PRODUCT_ADDED',
      eventTitle: 'Product Added',
      quantityChange: product.quantity,
      previousStock: 0,
      newStock: product.quantity,
      location: product.location,
      updatedBy: updatedBy,
      remarks: product.sponsorName ? `Sponsor: ${product.sponsorName} • Added by ${updatedBy}` : `Added by ${updatedBy}`,
      date: product.receivedDate
    });

    this.closeForm();

    this.showSuccess(
      'Product Added Successfully!',
      'New product has been added to warehouse inventory.',
      [
        { label: 'Product ID', value: product.productId },
        { label: 'Product Name', value: product.name },
        { label: 'Available Stock', value: `${product.quantity} PCS` },
        { label: 'Location', value: product.location },
        { label: 'Added By', value: updatedBy }
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
