import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css']
})
export class SignupComponent {
  fullName = '';
  username = '';
  email = '';
  mobile = '';
  password = '';
  confirmPassword = '';
  termsAccepted = false;

  message = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  signup(): void {
    this.message = '';
    this.errorMessage = '';

    if (
      !this.fullName.trim() ||
      !this.username.trim() ||
      !this.email.trim() ||
      !this.mobile.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (!this.termsAccepted) {
      this.errorMessage = 'Please accept the terms and conditions.';
      return;
    }

    this.isLoading = true;

    this.authService.signup({
      fullname: this.fullName.trim(),
      username: this.username.trim(),
      email: this.email.trim(),
      number: this.mobile.trim(),
      password: this.password,
      confirmPassword: this.confirmPassword
    }).subscribe({
      next: (response) => {
        this.message =
          response?.message || 'Signup successful!';
        this.isLoading = false;
        // Navigate to dashboard after successful signup
        setTimeout(() => this.router.navigate(['/dashboard']), 1200);
      },
      error: (error) => {
        console.error('Signup API error:', error);

        this.errorMessage =
          error.error?.message ||
          'Signup failed. Please check the API connection.';

        this.isLoading = false;
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
