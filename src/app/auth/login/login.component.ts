import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QueryService } from '../../query.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);

  step = signal<'phone' | 'otp'>('phone');
  phone = '';
  otp = '';
  loading = signal(false);
  error = signal('');

  async sendOTP() {
    if (this.phone.length !== 10 || !/^\d{10}$/.test(this.phone)) {
      this.error.set('Enter a valid 10-digit mobile number');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.queryService.sendOTP(this.phone);
      this.step.set('otp');
    } catch {
      this.error.set('Failed to send OTP. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async verifyOTP() {
    if (this.otp.length < 4) {
      this.error.set('Enter the OTP sent to your number');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.queryService.verifyOTP(this.phone, this.otp);
      this.authService.login(result.token, result.user);
      if (result.user?.isOnboarded) {
        this.router.navigate(['/discover']);
      } else {
        this.router.navigate(['/onboarding']);
      }
    } catch {
      this.error.set('Invalid OTP. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
