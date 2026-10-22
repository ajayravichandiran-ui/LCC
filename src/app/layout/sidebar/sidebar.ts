import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { Subscription } from 'rxjs';

// Keeps the previous page available if a route recreates the navbar.
// It survives Angular component destruction, but resets on a full page refresh.
let previousNavbarRoute: string | null = null;
let pendingNavbarDestination: string | null = null;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements AfterViewInit, OnDestroy {
  @ViewChild('navLinks') navLinks!: ElementRef<HTMLElement>;
  @ViewChild('navSlider') navSlider!: ElementRef<HTMLElement>;

  menuItems = [
    { name: 'Dashboard', route: '/dashboard' },
    { name: 'Products', route: '/products' },
    { name: 'LCC', route: '/lcc' },
    { name: 'Distribution', route: '/distribution' },
    { name: 'Reports', route: '/reports' }
  ];

  isMobileMenuOpen = false;

  private routerSubscription?: Subscription;
  private startFrame = 0;
  private finishFrame = 0;
  private initializing = true;
  private initialDestination = '';
  private onWindowResize = () => this.snapToRoute(this.router.url);

  constructor(private router: Router) {}

  ngAfterViewInit(): void {
    const destination = this.normalizedRoute(
      pendingNavbarDestination ?? this.router.url
    );
    this.initialDestination = destination;
    const origin = previousNavbarRoute;

    // Set the starting position WITHOUT animation.
    // This makes the animation work even if the navbar is recreated by routing.
    if (origin && origin !== destination && this.hasRoute(origin)) {
      this.snapToRoute(origin);
      this.startFrame = requestAnimationFrame(() => {
        this.finishFrame = requestAnimationFrame(() => {
          this.initializing = false;
          this.moveToRoute(this.initialDestination);
        });
      });
    } else {
      this.snapToRoute(destination);
      this.startFrame = requestAnimationFrame(() => {
        this.initializing = false;
        this.navSlider?.nativeElement.classList.add('is-ready');
      });
    }

    this.routerSubscription = this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        previousNavbarRoute = this.normalizedRoute(this.router.url);
        pendingNavbarDestination = this.normalizedRoute(event.url);
      }

      if (event instanceof NavigationEnd) {
        this.initialDestination = this.normalizedRoute(event.urlAfterRedirects);
        pendingNavbarDestination = null;
        // If the component stays mounted, slide on route changes too.
        if (!this.initializing) this.moveToRoute(this.initialDestination);
      }
    });

    window.addEventListener('resize', this.onWindowResize);
  }

  onTabClick(route: string): void {
    // Start the movement on click, without waiting for navigation to finish.
    this.moveToRoute(route);
    this.closeMobileMenu();
  }

  onActiveChange(route: string, isActive: boolean): void {
    if (isActive && !this.initializing) {
      this.moveToRoute(route);
    }
  }

  private normalizedRoute(url: string): string {
    const path = url.split('?')[0].split('#')[0];
    const match = this.menuItems.find(item =>
      path === item.route || path.startsWith(item.route + '/')
    );
    return match?.route || path;
  }

  private hasRoute(route: string): boolean {
    return this.menuItems.some(item => item.route === route);
  }

  private getLink(route: string): HTMLElement | undefined {
    const index = this.menuItems.findIndex(
      item => item.route === this.normalizedRoute(route)
    );
    if (index < 0) return undefined;
    return this.navLinks.nativeElement.querySelectorAll<HTMLElement>(
      '.nav-link'
    )[index];
  }

  private positionAt(route: string): void {
    if (window.matchMedia('(max-width: 960px)').matches) return;

    const link = this.getLink(route);
    const slider = this.navSlider?.nativeElement;
    if (!link || !slider) return;

    slider.style.width = `${link.offsetWidth}px`;
    slider.style.transform = `translateX(${link.offsetLeft}px)`;
    slider.classList.add('is-visible');
  }

  private snapToRoute(route: string): void {
    const slider = this.navSlider?.nativeElement;
    if (!slider) return;

    slider.classList.remove('is-ready');
    this.positionAt(route);
    // Flush layout so the browser sees the non-animated starting position.
    void slider.offsetWidth;
  }

  private moveToRoute(route: string): void {
    const slider = this.navSlider?.nativeElement;
    if (!slider) return;

    slider.classList.add('is-ready');
    this.positionAt(route);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  onLogout(): void {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
    window.removeEventListener('resize', this.onWindowResize);
    cancelAnimationFrame(this.startFrame);
    cancelAnimationFrame(this.finishFrame);
  }
}
