import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {

  username = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  showForgotPassword = false;
  forgotEmail = '';
  forgotOtp = '';
  errorMessage = '';
  otpSent = false;
  otp: string[] = ['', '', '', '', '', ''];
  showSignup = false;
  signupData = {
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    createPassword: '',
    confirmPassword: ''
  };

  showCreatePassword = false;
  showConfirmPassword = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

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

  
openSignup(event: Event): void {
  event.preventDefault();
  this.showSignup = true;
}

closeSignup(): void {
  this.showSignup = false;
}

openForgotPassword(event: Event): void {
  event.preventDefault();
  this.showSignup = false;
  this.showForgotPassword = true;
  this.otpSent = false;
  this.otp = ['', '', '', '', '', ''];
}

closeForgotPassword(): void {
  this.showForgotPassword = false;
}

sendForgotOtp(): void {
  if (!this.forgotEmail.trim()) {
    alert('Please enter your email address');
    return;
  }

  this.otpSent = true;
}

verifyOtp(): void {
  const enteredOtp = this.otp.join('');

  if (enteredOtp.length !== 6) {
    alert('Please enter all 6 digits');
    return;
  }

  alert('OTP verification API connect செய்ய வேண்டும்.');
}

submitSignup(): void {
  if (
    !this.signupData.fullName.trim() ||
    !this.signupData.username.trim() ||
    !this.signupData.email.trim() ||
    !this.signupData.mobile.trim() ||
    !this.signupData.createPassword ||
    !this.signupData.confirmPassword
  ) {
    alert('Please fill all fields');
    return;
  }

  if (!/^\d{10}$/.test(this.signupData.mobile)) {
    alert('Enter a valid 10-digit mobile number');
    return;
  }

  if (
    this.signupData.createPassword !==
    this.signupData.confirmPassword
  ) {
    alert('Passwords do not match');
    return;
  }

  alert('All fields validated successfully!');
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