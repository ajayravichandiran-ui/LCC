import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface SignupRequest {
  fullname: string;
  username: string;
  email: string;
  number: string;
  password: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly signupUrl =
    'http://192.168.0.131:5000/api/signup';

  constructor(private http: HttpClient) {}

  signup(data: SignupRequest): Observable<any> {
    console.log('Signup Request Payload:', data);

    return this.http.post<any>(this.signupUrl, data).pipe(
      tap({
        next: (response) => {
          console.log('Signup API Response:', response);
          console.log('Response Message:', response.message);
          console.log('Registered User:', response.user);
        },
        error: (error) => {
          console.error('Signup API Error:', error);
          console.error('Backend Error Response:', error.error);
        }
      })
    );
  }
}