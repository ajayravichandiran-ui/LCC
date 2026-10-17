import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  constructor(private router: Router) {}

  menuItems = [
    { name: 'Dashboard', route: '/dashboard' },
    { name: 'Products', route: '/products' },
    { name: 'LCC', route: '/lcc' },
    { name: 'Distribution', route: '/distribution' },
    // { name: 'Members', route: '/members' },
    { name: 'Reports', route: '/reports' }
  ];

  isMobileMenuOpen = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  goToDashboard(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.router.navigate(['/dashboard']);
  }

  onLogout(): void {
    this.router.navigate(['/login']);
  }
}
