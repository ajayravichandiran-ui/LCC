
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Product {
  id: number;
  productId: string;
  name: string;
  quantity: number;
  receivedDate: string;
  sponsorName: string;
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
  editingId: number | null = null;

  productForm: Product = this.emptyProduct();

  // Create an empty product
  emptyProduct(): Product {
    return {
      id: 0,
      productId: '',
      name: '',
      quantity: 1,
      receivedDate: this.getTodayDate(),
      sponsorName: '',
      image: '',
      location: ''
    };
  }

  // Get today's date
  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // Add a new product name
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

  // Filter products by ID, name, sponsor, or location
  get filteredProducts(): Product[] {
    const search = this.searchText.trim().toLowerCase();

    return this.products.filter(product =>
      (product.productId && product.productId.toLowerCase().includes(search)) ||
      product.name.toLowerCase().includes(search) ||
      product.sponsorName.toLowerCase().includes(search) ||
      product.location.toLowerCase().includes(search)
    );
  }

  // Calculate total stock
  get totalPieces(): number {
    return this.products.reduce(
      (total, product) => total + product.quantity,
      0
    );
  }

  // Open Add Product form
  openAddForm(): void {
    this.editingId = null;
    this.productForm = this.emptyProduct();
    this.showForm = true;
  }

  // Open Edit Product form
  editProduct(product: Product): void {
    this.editingId = product.id;
    this.productForm = {
      ...product,
      productId: product.productId || (product.id ? String(product.id) : '')
    };
    this.showForm = true;
  }

  // Save or update a product
  saveProduct(): void {
    const productId = this.productForm.productId?.trim() ?? '';
    const name = this.productForm.name.trim();
    const sponsorName = this.productForm.sponsorName.trim();
    const location = this.productForm.location;
    const quantity = Number(this.productForm.quantity);

    if (
      !productId ||
      !name ||
      !sponsorName ||
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

    // Check for duplicate product ID
    const isDuplicate = this.products.some(
      existing =>
        existing.productId?.trim().toLowerCase() === productId.toLowerCase() &&
        existing.id !== this.editingId
    );

    if (isDuplicate) {
      window.alert('This Product ID already exists. Please enter a unique Product ID.');
      return;
    }

    // Add newly entered product names to the dropdown
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
      sponsorName,
      image: this.productForm.image || '',
      location
    };

    if (this.editingId !== null) {
      this.products = this.products.map(existing =>
        existing.id === this.editingId
          ? product
          : existing
      );
    } else {
      this.products = [...this.products, product];
    }

    this.closeForm();
  }

  // Add more received stock
  addReceivedStock(product: Product): void {
    const input = window.prompt(
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

    const updated = this.products.find(
      item => item.id === product.id
    );

    if (updated) {
      window.alert(
        `${updated.name} (${updated.location}): ` +
        `${updated.quantity} PCS available.`
      );
    }
  }

  // // Delete a product
  // deleteProduct(id: number): void {
  //   if (
  //     window.confirm(
  //       'Are you sure you want to delete this product?'
  //     )
  //   ) {
  //     this.products = this.products.filter(
  //       product => product.id !== id
  //     );
  //   }
  // }

  // Close Add/Edit form
  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.productForm = this.emptyProduct();
  }

  // Switch to LCC / Open Transfer Form
  openTransferForm(): void {
    window.alert('Switch to LCC / Transfer Form feature is under development.');
  }

  // Track products by ID
  trackByProductId(
    index: number,
    product: Product
  ): number {
    return product.id;
  }
}
