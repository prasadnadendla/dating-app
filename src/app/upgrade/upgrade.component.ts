import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { QueryService } from '../query.service';

interface PricingItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  price: string;
  priceLabel: string;
  highlight?: boolean;
}

@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [],
  templateUrl: './upgrade.component.html'
})
export class UpgradeComponent {
  private queryService = inject(QueryService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private platformId = inject(PLATFORM_ID);

  selectedItem = signal('spark_pass');
  purchasing = signal(false);

  readonly features = [
    'See who liked you',
    'Unlimited likes & super likes',
    'Priority profile boost every week',
    'Advanced filters (community, religion, language)',
    'Read receipts in chat',
  ];

  readonly pricingItems: PricingItem[] = [
    {
      id: 'boost',
      icon: '🚀',
      title: 'Verified Boost',
      description: 'Appear at top of discover for 24hrs',
      price: '₹99',
      priceLabel: 'one-time',
    },
    {
      id: 'super_like',
      icon: '⭐',
      title: 'Super Interest',
      description: 'Stand out and get noticed instantly',
      price: '₹29',
      priceLabel: 'per use',
    },
    {
      id: 'see_likes',
      icon: '👀',
      title: 'See Who Liked You',
      description: 'Unlock blurred profiles who liked you',
      price: '₹199',
      priceLabel: '/week',
    },
    {
      id: 'spark_pass',
      icon: '✨',
      title: 'Spark Pass',
      description: 'All features unlocked — the complete experience',
      price: '₹499',
      priceLabel: '/month',
      highlight: true,
    },
  ];

  getSelectedPrice(): string {
    return this.pricingItems.find(i => i.id === this.selectedItem())?.price ?? '₹499';
  }

  async purchase() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.purchasing.set(true);
    try {
      const response = await fetch(
        this.queryService.getURL('/api/payment/order'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authService.token()}`
          },
          body: JSON.stringify({ plan: this.selectedItem() })
        }
      );
      if (!response.ok) throw new Error('Payment init failed');
      const { orderId, amount, currency } = await response.json();

      // Razorpay checkout
      const win = window as any;
      if (!win.Razorpay) {
        this.notification.error('Payment gateway loading. Try again.');
        this.purchasing.set(false);
        return;
      }
      const rzp = new win.Razorpay({
        key: 'rzp_live_XXXXXXXX', // replaced at build via environment
        amount,
        currency: currency || 'INR',
        order_id: orderId,
        name: 'Genzyy',
        description: this.pricingItems.find(i => i.id === this.selectedItem())?.title,
        handler: async (paymentResult: any) => {
          await this.verifyPayment(paymentResult);
        },
        prefill: {
          contact: this.authService.currentUser()?.phone ?? '',
        },
        theme: { color: '#e328f0' },
      });
      rzp.open();
    } catch {
      this.notification.error('Could not initiate payment. Try again.');
    } finally {
      this.purchasing.set(false);
    }
  }

  private async verifyPayment(result: any) {
    try {
      const response = await fetch(
        this.queryService.getURL('/api/payment/verify'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authService.token()}`
          },
          body: JSON.stringify(result)
        }
      );
      if (!response.ok) throw new Error();
      const user = this.authService.currentUser();
      if (user) this.authService.setUser({ ...user, isPremium: true });
      this.notification.success('Welcome to Spark Pass! ✨');
      this.router.navigate(['/discover']);
    } catch {
      this.notification.error('Payment verification failed. Contact support.');
    }
  }
}
