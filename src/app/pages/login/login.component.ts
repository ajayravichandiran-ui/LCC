import {
  Component,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

export interface DimParticle {
  x: number;
  y: number;
  size: number;
  delay: number;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  username = '';
  password = '';
  rememberMe = false;
  showPassword = false;

  images = [
    '/asset/helping-person1.png',
    '/asset/helping-person2.png',
    '/asset/helping-person3.png'
  ];

  currentSlide = 0;
  private sliderInterval: ReturnType<typeof setInterval> | undefined;

  // =====================================================
  // ULTRA-DARK CINEMATIC INITIAL SCREEN & ROPE
  // =====================================================
  isDarkScreen = true;
  isLampTriggered = false;
  isPageRevealed = false;

  ropeY = 0;
  isDragging = false;
  dragStartY = 0;
  ropeSwinging = true;
  readonly pullThreshold = 20; // activation threshold in px
  readonly maxPull = 120; // maximum pull clamp in px
  private isClickCandidate = false;

  // Tiny dim floating particles for magical nighttime feeling
  particles: DimParticle[] = Array.from({ length: 8 }, (_, i) => ({
    x: Math.floor((i * 41 + 13) % 92 + 4),
    y: Math.floor((i * 53 + 17) % 86 + 6),
    size: i % 3 === 0 ? 2.5 : 1.5,
    delay: (i * 1.3) % 6
  }));

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startSliderTimer();
  }

  // Pointer & Touch Events for the Hanging Rope
  onRopePointerDown(event: MouseEvent | TouchEvent): void {
    if (this.isLampTriggered) return;
    this.isDragging = true;
    this.ropeSwinging = false;
    this.isClickCandidate = true;

    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.dragStartY = clientY;
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  @HostListener('window:touchmove', ['$event'])
  onPointerMove(event: MouseEvent | TouchEvent): void {
    if (!this.isDragging || this.isLampTriggered) return;

    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    const deltaY = clientY - this.dragStartY;

    if (Math.abs(deltaY) > 5) {
      this.isClickCandidate = false;
    }

    if (deltaY > 0) {
      this.ropeY = Math.min(this.maxPull, deltaY * 0.85);

      // Auto-trigger as soon as user pulls past 25px!
      if (this.ropeY >= this.pullThreshold) {
        this.isDragging = false;
        this.triggerPull();
      }
    } else {
      this.ropeY = 0;
    }
  }

  @HostListener('window:mouseup')
  @HostListener('window:touchend')
  onPointerUp(): void {
    if (!this.isDragging || this.isLampTriggered) return;
    this.isDragging = false;

    if (this.isClickCandidate || this.ropeY >= this.pullThreshold) {
      this.triggerPull();
    } else {
      this.ropeY = 0;
      setTimeout(() => {
        if (!this.isLampTriggered) {
          this.ropeSwinging = true;
        }
      }, 300);
    }
  }

  triggerPull(): void {
    if (this.isLampTriggered) return;
    this.isLampTriggered = true;
    this.ropeSwinging = false;
    this.isPageRevealed = true;

    // Retract rope upward and disappear
    this.ropeY = -300;

    // Remove dark screen completely from DOM
    setTimeout(() => {
      this.isDarkScreen = false;
    }, 600);
  }

  // Existing auth & slider logic
  private startSliderTimer(): void {
    this.sliderInterval = setInterval(() => {
      this.currentSlide++;
      if (this.currentSlide >= this.images.length) {
        this.currentSlide = 0;
      }
    }, 5000);
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
    this.startSliderTimer();
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  loginUser(): void {
    if (!this.username || !this.password) {
      alert('Please enter username and password');
      return;
    }
    this.router.navigate(['/dashboard']);
  }

  refreshPage(): void {
    window.location.reload();
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
    }
  }
}