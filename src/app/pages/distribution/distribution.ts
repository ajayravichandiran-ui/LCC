import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface DistributionRecord {
  id: string;
  product: string;
  quantity: number;
  volunteer: string;
  receiver: string;
  date: string;
  status: string;
}

@Component({
  selector: 'app-distribution',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './distribution.html',
  styleUrl: './distribution.css'
})
export class Distribution {

  showModal = false;
  searchText = '';

  selectedVolunteer = '';
  selectedProduct = '';
  receiverName = '';
  distributionQuantity: number | null = null;
  distributionDate = this.getToday();

  products = [
    {
      id: 'SAR001',
      name: 'Saree',
      availableQty: 250,
      totalQty: 250
    },
    {
      id: 'DHO002',
      name: 'Dhoti',
      availableQty: 180,
      totalQty: 180
    },
    {
      id: 'TOW003',
      name: 'Towel',
      availableQty: 300,
      totalQty: 300
    },
    {
      id: 'SHI004',
      name: 'Shirt',
      availableQty: 150,
      totalQty: 150
    },
    {
      id: 'PAN005',
      name: 'Pant',
      availableQty: 120,
      totalQty: 120
    },
    {
      id: 'CHU006',
      name: 'Churidar',
      availableQty: 100,
      totalQty: 100
    },
    {
      id: 'DRE007',
      name: 'Dress',
      availableQty: 200,
      totalQty: 200
    },
    {
      id: 'BED008',
      name: 'Bedsheet',
      availableQty: 175,
      totalQty: 175
    }
  ];

  distributions: DistributionRecord[] = [
    {
      id: 'DIST-0001',
      product: 'Saree',
      quantity: 20,
      volunteer: 'Arun',
      receiver: 'Arun Kumar',
      date: '14-10-2026',
      status: 'Assigned'
    },
    {
      id: 'DIST-0002',
      product: 'Dhoti',
      quantity: 15,
      volunteer: 'Priya',
      receiver: 'Ravi',
      date: '14-10-2026',
      status: 'Assigned'
    },
    {
      id: 'DIST-0003',
      product: 'Towel',
      quantity: 25,
      volunteer: 'Kumar',
      receiver: 'Kumar',
      date: '13-10-2026',
      status: 'Assigned'
    },
    {
      id: 'DIST-0004',
      product: 'Shirt',
      quantity: 10,
      volunteer: 'Manoj',
      receiver: 'Priya',
      date: '13-10-2026',
      status: 'Assigned'
    },
    {
      id: 'DIST-0005',
      product: 'Churidar',
      quantity: 8,
      volunteer: 'Surya',
      receiver: 'Manoj',
      date: '12-10-2026',
      status: 'Assigned'
    }
  ];

  openDistributionModal(): void {
    this.resetForm();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetForm(): void {
    this.selectedVolunteer = '';
    this.selectedProduct = '';
    this.receiverName = '';
    this.distributionQuantity = null;
    this.distributionDate = this.getToday();
  }

  get selectedProductDetails() {
    return this.products.find(
      product => product.id === this.selectedProduct
    );
  }

  get availableQuantity(): number {
    return this.selectedProductDetails?.availableQty ?? 0;
  }

  get newBalance(): number {
    if (!this.selectedProductDetails) {
      return 0;
    }

    return Math.max(
      0,
      this.availableQuantity -
        (this.distributionQuantity ?? 0)
    );
  }

  get stockPercentage(): number {
    if (!this.selectedProductDetails) {
      return 0;
    }

    const percentage =
      (this.selectedProductDetails.availableQty /
        this.selectedProductDetails.totalQty) *
      100;

    return Math.round(percentage);
  }

  get totalDistributions(): number {
    return this.distributions.length;
  }

  get lccToDistribution(): number {
    return this.distributions.reduce(
      (total, distribution) =>
        total + distribution.quantity,
      0
    );
  }

  get todayDistribution(): number {
    const today = this.getToday();

    return this.distributions
      .filter(
        distribution =>
          distribution.date === today
      )
      .reduce(
        (total, distribution) =>
          total + distribution.quantity,
        0
      );
  }

  get filteredDistributions(): DistributionRecord[] {
    const search =
      this.searchText
        .toLowerCase()
        .trim();

    if (!search) {
      return this.distributions;
    }

    return this.distributions.filter(
      distribution =>
        distribution.id
          .toLowerCase()
          .includes(search) ||

        distribution.product
          .toLowerCase()
          .includes(search) ||

        distribution.volunteer
          .toLowerCase()
          .includes(search) ||

        distribution.receiver
          .toLowerCase()
          .includes(search) ||

        distribution.date
          .toLowerCase()
          .includes(search) ||

        distribution.status
          .toLowerCase()
          .includes(search)
    );
  }

  createDistribution(): void {

    if (!this.selectedVolunteer.trim()) {
      alert('Please enter volunteer name.');
      return;
    }

    if (!this.selectedProduct) {
      alert('Please select a product.');
      return;
    }

    if (
      !this.distributionQuantity ||
      this.distributionQuantity <= 0
    ) {
      alert('Please enter a valid quantity.');
      return;
    }

    if (
      this.distributionQuantity >
      this.availableQuantity
    ) {
      alert(
        `Only ${this.availableQuantity} units are available.`
      );
      return;
    }

    if (!this.receiverName.trim()) {
      alert('Please enter receiver name.');
      return;
    }

    if (!this.distributionDate) {
      alert('Please select distribution date.');
      return;
    }

    const product = this.products.find(
      item =>
        item.id === this.selectedProduct
    );

    if (!product) {
      alert('Product not found.');
      return;
    }

    product.availableQty -=
      this.distributionQuantity;

    const newId =
      `DIST-${String(
        this.distributions.length + 1
      ).padStart(4, '0')}`;

    const newDistribution: DistributionRecord = {
      id: newId,
      product: product.name,
      quantity:
        this.distributionQuantity,
      volunteer:
        this.selectedVolunteer,
      receiver:
        this.receiverName,
      date:
        this.distributionDate,
      status: 'Assigned'
    };

    this.distributions.unshift(
      newDistribution
    );

    alert(
      'Product assigned successfully.'
    );

    this.closeModal();
    this.resetForm();
  }

  getToday(): string {
    const today = new Date();

    const day = String(
      today.getDate()
    ).padStart(2, '0');

    const month = String(
      today.getMonth() + 1
    ).padStart(2, '0');

    const year =
      today.getFullYear();

    return `${day}-${month}-${year}`;
  }
}