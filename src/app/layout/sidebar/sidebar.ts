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
    { name: 'Dashboard', icon: '\u{1F3E0}', route: '/dashboard' },
    { name: 'Products', icon: '\u{1F4E6}', route: '/products' },
    { name: 'LCC', icon: '\u{1F3ED}', route: '/lcc' },
    { name: 'Distribution', icon: '\u{1F69A}', route: '/distribution' },
    { name: 'Members', icon: '\u{1F465}', route: '/members' },
    { name: 'Reports', icon: '\u{1F4CA}', route: '/reports' }
  ];

  onLogout(): void {
    this.router.navigate(['/login']);
  }
}
