import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface DispatchRecord {
  id: string;
  destination: string;
  driverName: string;
  vehicleNo: string;
  itemsCount: number;
  piecesCount: number;
  dispatchDate: Date;
  status: 'In-Transit' | 'Delivered' | 'Pending';
}

@Component({
  selector: 'app-distribution',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './distribution.html',
  styleUrl: './distribution.css'
})
export class DistributionComponent implements OnInit {
  searchText: string = '';
  statusFilter: string = 'All';

  dispatches: DispatchRecord[] = [
    {
      id: 'DSP-2026-001',
      destination: 'Central LCC Retail Outlet #4',
      driverName: 'Ravi Kumar',
      vehicleNo: 'TN-45-AB-1204',
      itemsCount: 12,
      piecesCount: 240,
      dispatchDate: new Date(),
      status: 'In-Transit'
    },
    {
      id: 'DSP-2026-002',
      destination: 'North Zone Distribution Hub',
      driverName: 'M. Senthil',
      vehicleNo: 'TN-45-CD-3891',
      itemsCount: 8,
      piecesCount: 160,
      dispatchDate: new Date(Date.now() - 86400000),
      status: 'Delivered'
    },
    {
      id: 'DSP-2026-003',
      destination: 'Metro Express Depot',
      driverName: 'K. Anand',
      vehicleNo: 'TN-45-EF-9012',
      itemsCount: 15,
      piecesCount: 310,
      dispatchDate: new Date(Date.now() - 172800000),
      status: 'Pending'
    },
    {
      id: 'DSP-2026-004',
      destination: 'South Regional Warehouse',
      driverName: 'P. Vignesh',
      vehicleNo: 'TN-45-GH-5561',
      itemsCount: 20,
      piecesCount: 450,
      dispatchDate: new Date(Date.now() - 259200000),
      status: 'Delivered'
    }
  ];

  ngOnInit(): void {}

  get filteredDispatches(): DispatchRecord[] {
    return this.dispatches.filter(d => {
      const matchesSearch =
        !this.searchText ||
        d.id.toLowerCase().includes(this.searchText.toLowerCase()) ||
        d.destination.toLowerCase().includes(this.searchText.toLowerCase()) ||
        d.driverName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        d.vehicleNo.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesStatus =
        this.statusFilter === 'All' || d.status === this.statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  get totalDispatches(): number {
    return this.dispatches.length;
  }

  get totalPiecesDispatched(): number {
    return this.dispatches.reduce((acc, curr) => acc + curr.piecesCount, 0);
  }

  get inTransitCount(): number {
    return this.dispatches.filter(d => d.status === 'In-Transit').length;
  }

  get deliveredCount(): number {
    return this.dispatches.filter(d => d.status === 'Delivered').length;
  }
}
