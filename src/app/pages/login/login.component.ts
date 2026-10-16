import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

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
  errorMessage = '';

  images = [
    '/asset/helping-person1.png',
    '/asset/helping-person2.png',
    '/asset/helping-person3.png'
  ];

  currentSlide = 0;
  private sliderInterval: ReturnType<typeof setInterval> | undefined;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.startSliderTimer();
  }

  // Carousel timer
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
      this.errorMessage = 'Please enter your username and password';
      return;
    }
    this.errorMessage = '';
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