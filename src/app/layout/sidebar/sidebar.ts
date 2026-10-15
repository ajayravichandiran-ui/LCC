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
    { name: 'Dashboard', icon: '𓃑', route: '/dashboard' },
    { name: 'Products', icon: '📦', route: '/products' },
    { name: 'LCC', icon: '🏬', route: '/lcc' },
    { name: 'Distribution', icon: '🚛', route: '/distribution' },
    { name: 'Members', icon: '👨‍👨', route: '/members' },
    { name: 'Reports', icon: '📝', route: '/reports' }
  ];

  onLogout(): void {
    this.router.navigate(['/login']);
  }
}
