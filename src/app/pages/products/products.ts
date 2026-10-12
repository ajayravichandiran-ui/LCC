
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Product {
  id: number;
  name: string;
  quantity: number;
  minimumStock: number;
  location: string;
  image: string;
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

  searchText = '';
  showForm = false;
  editingId: number | null = null;
  imagePreview = '';
  imageError = '';

  productForm: Product = this.emptyProduct();

  emptyProduct(): Product {
    return {
      id: 0,
      name: '',
      quantity: 0,
      minimumStock: 10,
      location: '',
      image: ''
    };
  }

  get filteredProducts(): Product[] {
    const search = this.searchText.trim().toLowerCase();

    return this.products.filter(product =>
      product.name.toLowerCase().includes(search) ||
      product.location.toLowerCase().includes(search)
    );
  }

  get lowStockCount(): number {
    return this.products.filter(
      product => product.quantity <= product.minimumStock
    ).length;
  }

  get totalPieces(): number {
    return this.products.reduce(
      (total, product) => total + product.quantity, 0
    );
  }
  
addReceivedStock(product: Product): void {
  const input = window.prompt(
    `Current stock: ${product.quantity} PCS\nEnter additional quantity received:`
  );

  if (input === null || input.trim() === '') {
    return;
  }

  const quantity = Number(input);

  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    window.alert('Enter a valid positive whole number of pieces.');
    return;
  }

  product.quantity += quantity;

  window.alert(
    `${product.name} updated successfully. New stock: ${product.quantity} PCS`
  );
}


  openAddForm(): void {
    this.editingId = null;
    this.productForm = this.emptyProduct();
    this.imagePreview = '';
    this.imageError = '';
    this.showForm = true;
  }

  editProduct(product: Product): void {
    this.editingId = product.id;
    this.productForm = { ...product };
    this.imagePreview = product.image;
    this.imageError = '';
    this.showForm = true;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.imageError = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please select a valid image.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image must be 5 MB or smaller.';
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.productForm.image = this.imagePreview;
    };

    reader.onerror = () => {
      this.imageError = 'Unable to read image. Please try again.';
    };

    reader.readAsDataURL(file);
  }

  saveProduct(): void {
    this.productForm.name = this.productForm.name.trim();
    this.productForm.location = this.productForm.location.trim();

    if (!this.productForm.name) return;

    if (!this.productForm.image || this.imageError) {
      this.imageError = 'Please upload a clothing image.';
      return;
    }

    if (
      !Number.isFinite(this.productForm.quantity) ||
      this.productForm.quantity < 0 ||
      !Number.isFinite(this.productForm.minimumStock) ||
      this.productForm.minimumStock < 0
    ) {
      return;
    }

    if (this.editingId !== null) {
      const index = this.products.findIndex(
        p => p.id === this.editingId
      );

      if (index !== -1) {
        this.products[index] = {
          ...this.productForm,
          id: this.editingId
        };
      }
    } else {
      this.products.push({
        ...this.productForm,
        id: Date.now()
      });
    }

    this.closeForm();
  }

  deleteProduct(id: number): void {
    if (window.confirm('Delete this clothing product?')) {
      this.products = this.products.filter(p => p.id !== id);
    }
  }

  stockStatus(product: Product): string {
    return product.quantity <= product.minimumStock
      ? 'Low Stock'
      : 'Available';
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.imagePreview = '';
    this.imageError = '';
    this.productForm = this.emptyProduct();
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }
}
