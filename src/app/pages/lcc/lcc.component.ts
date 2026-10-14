import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { LccService, LccTransferItem } from '../../services/lcc.service';

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

  constructor(
    private lccService: LccService,
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

  deleteTransfer(id: number): void {
    if (window.confirm('Are you sure you want to remove this transfer item from LCC?')) {
      this.lccService.deleteTransfer(id);
    }
  }

  goBackToProducts(): void {
    this.router.navigate(['/products']);
  }

  trackByTransferId(index: number, item: LccTransferItem): number {
    return item.id;
  }
}