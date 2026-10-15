import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { LccService } from '../../services/lcc.service';

export interface StatCard {
  title: string;
  value: number;
  icon: string;
  description: string;
  color: string;
  isAlert?: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  constructor(private lccService: LccService) {}

  stats: StatCard[] = [
    {
      title: 'Total Stock',
      value: 0,
      icon: '🏭',
      description: 'Units available in LCC + Products',
      color: 'blue'
    },
    {
      title: 'Total Products',
      value: 0,
      icon: '📦',
      description: 'Total products (LCC + Products)',
      color: 'yellow'
    },
    {
      title: 'Low Stock Items',
      value: 0,
      icon: '⚠️',
      description: 'All stocks adequate',
      color: 'red',
      isAlert: false
    },
    {
      title: 'Categories',
      value: 0,
      icon: '📊',
      description: 'Product categories',
      color: 'green'
    }
  ];

  stockMovement = [
    { day: 'Mon', received: 70, distributed: 35 },
    { day: 'Tue', received: 95, distributed: 55 },
    { day: 'Wed', received: 60, distributed: 45 },
    { day: 'Thu', received: 120, distributed: 70 },
    { day: 'Fri', received: 85, distributed: 50 },
    { day: 'Sat', received: 105, distributed: 65 },
    { day: 'Sun', received: 45, distributed: 25 }
  ];

  lowStockProducts: any[] = [];

  activities = [
    {
      title: 'Stock Received',
      description: 'New products added to warehouse',
      time: 'Today',
      icon: '📥'
    },
    {
      title: 'Product Updated',
      description: 'Product details were modified',
      time: 'Today',
      icon: '✏️'
    },
    {
      title: 'Stock Distributed',
      description: 'Items dispatched from warehouse',
      time: 'Yesterday',
      icon: '🚚'
    },
    {
      title: 'Low Stock Alert',
      description: 'Some products need restocking',
      time: 'Yesterday',
      icon: '⚠️'
    }
  ];

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    const warehouseProducts = this.lccService.getWarehouseProducts();
    const lccItems = this.lccService.getItems();

    const warehouseCount = warehouseProducts.length;
    const lccCount = lccItems.length;
    const totalProducts = warehouseCount + lccCount;

    const warehouseStock = warehouseProducts.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    const lccStock = lccItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );
    const totalStock = warehouseStock + lccStock;

    // Distinct categories/product names
    const categorySet = new Set<string>();
    warehouseProducts.forEach(p => {
      if (p.name && typeof p.name === 'string' && p.name.trim()) {
        categorySet.add(p.name.trim());
      }
    });
    lccItems.forEach(item => {
      if (item.name && typeof item.name === 'string' && item.name.trim()) {
        categorySet.add(item.name.trim());
      }
    });

    const lowWarehouseProducts = warehouseProducts.filter(
      p => Number(p.quantity) < 20
    );
    const lowLccItems = lccItems.filter(
      item => Number(item.quantity) < 20
    );
    const lowStockCount = lowWarehouseProducts.length + lowLccItems.length;
    const isLowStock = lowStockCount > 0;

    this.stats = [
      {
        title: 'Total Stock',
        value: totalStock,
        icon: '🏢',
        description: `${warehouseStock} Products + ${lccStock} LCC units`,
        color: 'blue'
      },
      {
        title: 'Total Products',
        value: totalProducts,
        icon: '📦',
        description: `${warehouseCount} Products + ${lccCount} LCC`,
        color: 'yellow'
      },
      {
        title: 'Low Stock Items',
        value: lowStockCount,
        icon: '⚠️',
        description: isLowStock ? 'About to update the product' : 'All stocks adequate',
        color: 'red',
        isAlert: isLowStock
      },
      {
        title: 'Categories',
        value: categorySet.size || (totalProducts > 0 ? 1 : 0),
        icon: '🗃️',
        description: 'Distinct product types',
        color: 'green'
      }
    ];

    // Build low stock list for products with stock below 20
    const realLowStock: any[] = [];
    lowWarehouseProducts.forEach(p => {
      realLowStock.push({
        name: p.productId ? `${p.productId} - ${p.name}` : p.name,
        category: p.location ? `Warehouse (${p.location})` : 'Warehouse',
        stock: Number(p.quantity),
        minimum: 20
      });
    });
    lowLccItems.forEach(item => {
      realLowStock.push({
        name: item.productId ? `${item.productId} - ${item.name}` : item.name,
        category: item.location ? `LCC (${item.location})` : 'LCC',
        stock: Number(item.quantity),
        minimum: 20
      });
    });

    this.lowStockProducts = realLowStock;

    // Add recent transfer activities if any
    if (lccItems.length > 0) {
      const recentTransfers = lccItems.slice(0, 2).map(item => ({
        title: 'Transferred to LCC',
        description: `${item.quantity} PCS of ${item.productId ? item.productId + ' ' : ''}${item.name} by ${item.switchedBy || 'Staff'}`,
        time: item.date || 'Recent',
        icon: '🔄'
      }));
      this.activities = [...recentTransfers, ...this.activities.slice(0, 2)];
    }
  }

  getBarHeight(value: number): number {
    return (value / 120) * 100;
  }
}
