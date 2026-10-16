import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LccService } from '../../services/lcc.service';
import { ReportsService, ReportRecord } from '../../services/reports.service';

export interface StatCard {
  title: string;
  value: number;
  icon: string;
  description: string;
  color: string;
  isAlert?: boolean;
}

export interface ActivityItem {
  title: string;
  description: string;
  time: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  constructor(
    private lccService: LccService,
    private reportsService: ReportsService
  ) {}

  stats: StatCard[] = [
    {
      title: 'Total Product',
      value: 0,
      icon: '🏢',
      description: 'Units available in LCC + Products',
      color: 'blue'
    },
    {
      title: 'Total Stocks Items',
      value: 0,
      icon: '📦',
      description: 'Total stocks (LCC + Products)',
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
      icon: '🗃️',
      description: 'Product categories',
      color: 'green'
    }
  ];

  stockMovement = [
    { day: 'Mon', received: 0, distributed: 0 },
    { day: 'Tue', received: 0, distributed: 0 },
    { day: 'Wed', received: 0, distributed: 0 },
    { day: 'Thu', received: 0, distributed: 0 },
    { day: 'Fri', received: 0, distributed: 0 },
    { day: 'Sat', received: 0, distributed: 0 },
    { day: 'Sun', received: 0, distributed: 0 }
  ];

  lowStockProducts: any[] = [];
  activities: ActivityItem[] = [];

  ngOnInit(): void {
    this.loadStats();

    // Re-calculate stats live whenever LCC inventory updates
    this.subscriptions.push(
      this.lccService.items$.subscribe(() => {
        this.loadStats();
      })
    );

    // Re-calculate stats and recent activity live whenever reports records update
    this.subscriptions.push(
      this.reportsService.records$.subscribe(() => {
        this.loadStats();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
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
        title: 'Total Products',
        value: totalStock,
        icon: '🏢',
        description: `${warehouseStock} Warehouse + ${lccStock} LCC units`,
        color: 'blue'
      },
      {
        title: 'Total Stocks Items',
        value: totalProducts,
        icon: '📦',
        description: `${warehouseCount} Products + ${lccCount} LCC`,
        color: 'yellow'
        
      },
      {
        title: 'Low Stock Items',
        value: lowStockCount,
        icon: '⚠️',
        description: isLowStock ? 'Stock Required (< 20 PCS)' : 'All stocks adequate',
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

    // Build dynamic live activities from reports & operations
    this.activities = this.buildRecentActivities();

    // Calculate real weekly stock movement
    this.calculateStockMovement();
  }

  buildRecentActivities(): ActivityItem[] {
    const records = this.reportsService.getRecords();

    if (records && records.length > 0) {
      return records.slice(0, 3).map(r => {
        let icon = '📦';
        if (r.eventType === 'STOCK_RECEIVED') icon = '📥';
        else if (r.eventType === 'STOCK_TRANSFERRED') icon = '🔄';
        else if (r.eventType === 'PRODUCT_UPDATED') icon = '✏️';
        else if (r.eventType === 'PRODUCT_DELETED' || r.eventType === 'LCC_TRANSFER_DELETED') icon = '🗑️';
        else if (r.eventType === 'PRODUCT_ADDED') icon = '✨';

        const qtyPrefix = r.quantityChange > 0 ? `+${r.quantityChange}` : `${r.quantityChange}`;
        const prodName = r.productId && r.productId !== 'N/A'
          ? `${r.productId} (${r.productName})`
          : r.productName;

        let description = '';
        if (r.eventType === 'STOCK_RECEIVED') {
          description = `${prodName} • ${qtyPrefix} PCS received by ${r.updatedBy || 'Staff'}`;
        } else if (r.eventType === 'PRODUCT_ADDED') {
          description = `${prodName} • ${r.newStock} PCS registered by ${r.updatedBy || 'Staff'}`;
        } else if (r.eventType === 'STOCK_TRANSFERRED') {
          description = `${prodName} • ${Math.abs(r.quantityChange)} PCS transferred to LCC by ${r.updatedBy || 'Staff'}`;
        } else if (r.eventType === 'PRODUCT_UPDATED') {
          description = `${prodName} • Stock updated to ${r.newStock} PCS by ${r.updatedBy || 'Staff'}`;
        } else if (r.eventType === 'PRODUCT_DELETED') {
          description = `${prodName} • Removed from inventory by ${r.updatedBy || 'Admin'}`;
        } else {
          description = `${prodName} • ${r.remarks || 'Warehouse operation'}`;
        }

        return {
          title: r.eventTitle || 'Warehouse Operation',
          description,
          time: this.formatActivityTime(r.date, r.time, r.timestamp),
          icon
        };
      });
    }

    // Fallback if no records in ReportsService yet: build from transfers and products
    const lccItems = this.lccService.getItems();
    const warehouseProducts = this.lccService.getWarehouseProducts();
    const fallback: ActivityItem[] = [];

    if (lccItems && lccItems.length > 0) {
      lccItems.slice(0, 2).forEach(item => {
        fallback.push({
          title: 'Transferred to LCC',
          description: `${item.productId ? item.productId + ' (' + item.name + ')' : item.name} • ${item.quantity} PCS transferred by ${item.switchedBy || 'Staff'}`,
          time: this.formatActivityTime(item.date),
          icon: '🔄'
        });
      });
    }

    if (warehouseProducts && warehouseProducts.length > 0) {
      warehouseProducts.slice(0, 2).forEach(p => {
        fallback.push({
          title: 'Product in Warehouse',
          description: `${p.productId ? p.productId + ' (' + p.name + ')' : p.name} • ${p.quantity} PCS available in ${p.location || 'Warehouse'}`,
          time: this.formatActivityTime(p.receivedDate),
          icon: '📦'
        });
      });
    }

    return fallback.slice(0, 4);
  }

  private formatActivityTime(dateStr?: string, timeStr?: string, timestamp?: number): string {
    const today = new Date();
    const todayYMD = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayDMY = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

    const isToday =
      dateStr === todayYMD ||
      dateStr === todayDMY ||
      (timestamp ? new Date(timestamp).toDateString() === today.toDateString() : false);

    const timePortion = timeStr ? ` at ${timeStr}` : '';
    if (isToday) {
      return `Today${timePortion}`;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestYMD = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const yestDMY = `${String(yesterday.getDate()).padStart(2, '0')}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${yesterday.getFullYear()}`;

    const isYesterday =
      dateStr === yestYMD ||
      dateStr === yestDMY ||
      (timestamp ? new Date(timestamp).toDateString() === yesterday.toDateString() : false);

    if (isYesterday) {
      return `Yesterday${timePortion}`;
    }

    return dateStr ? `${dateStr}${timePortion}` : 'Recent';
  }

  private normalizeDateToYMD(dateStr?: string): string {
    if (!dateStr) return '';
    // If DD-MM-YYYY -> convert to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('-');
      return `${y}-${m}-${d}`;
    }
    return dateStr;
  }

  calculateStockMovement(): void {
    const records = this.reportsService.getRecords();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days: { day: string; dateStr: string; received: number; distributed: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      last7Days.push({
        day: days[d.getDay()],
        dateStr,
        received: 0,
        distributed: 0
      });
    }

    let hasActivity = false;
    if (records && records.length > 0) {
      records.forEach(r => {
        const normDate = this.normalizeDateToYMD(r.date);
        const bucket = last7Days.find(d => d.dateStr === r.date || d.dateStr === normDate);
        if (bucket) {
          if (r.eventType === 'STOCK_RECEIVED' || r.eventType === 'PRODUCT_ADDED') {
            bucket.received += Math.max(0, Number(r.quantityChange) || 0);
            hasActivity = true;
          } else if (r.eventType === 'STOCK_TRANSFERRED') {
            bucket.distributed += Math.abs(Number(r.quantityChange) || 0);
            hasActivity = true;
          }
        }
      });
    }

    if (hasActivity) {
      this.stockMovement = last7Days.map(d => ({
        day: d.day,
        received: d.received,
        distributed: d.distributed
      }));
    } else {
      // Default baseline preview if no recorded daily movements yet
      this.stockMovement = [
        { day: 'Mon', received: 70, distributed: 35 },
        { day: 'Tue', received: 95, distributed: 55 },
        { day: 'Wed', received: 60, distributed: 45 },
        { day: 'Thu', received: 120, distributed: 70 },
        { day: 'Fri', received: 85, distributed: 50 },
        { day: 'Sat', received: 105, distributed: 65 },
        { day: 'Sun', received: 45, distributed: 25 }
      ];
    }
  }

  getBarHeight(value: number): number {
    if (!value || value <= 0) return 0;
    const maxVal = Math.max(
      ...this.stockMovement.map(m => Math.max(m.received, m.distributed)),
      120
    );
    return Math.min(100, Math.max(8, (value / maxVal) * 100));
  }
}
