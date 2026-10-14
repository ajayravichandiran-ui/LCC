
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {

  email = '';
  message = '';

  otpSent = false;
  otpDigits: string[] = ['', '', '', '', '', ''];

  sendOtp() {
    if (!this.email.trim()) {
      this.message = 'Please enter your email address.';
      return;
    }

    this.otpSent = true;
    this.message = '';
  }

  moveNext(event: Event, index: number) {
    const input = event.target as HTMLInputElement;

    input.value = input.value.replace(/[^0-9]/g, '');
    this.otpDigits[index] = input.value;

    const next = input.nextElementSibling as HTMLInputElement | null;

    if (input.value && next) {
      next.focus();
    }
  }

  verifyOtp() {
    const otp = this.otpDigits.join('');

    if (otp.length !== 6) {
      this.message = 'Please enter all 6 digits.';
      return;
    }

    this.message =
      'OTP verification needs a backend connection.';
  }
}
