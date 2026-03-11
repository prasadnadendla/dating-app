import { Injectable, inject } from '@angular/core';
import { gql, FetchPolicy, WatchQueryFetchPolicy } from '@apollo/client/core';
import { environment } from '../environments/environment';
import { LocalStorageService } from './local-storage.service';
import { UserPushSubscription } from './models/profile.model';
import { Apollo } from 'apollo-angular';

@Injectable({
  providedIn: 'root'
})
export class QueryService {

  constructor() {
  }

  private localStorageService = inject(LocalStorageService)
  private apollo = inject(Apollo)

  baseURL = environment.apiBaseURL


  getURL(path: string, params?: Record<string, string>) {
    const queryParams = new URLSearchParams(params || {});
    const url = `${this.baseURL}${path}${params ? '?'.concat(queryParams.toString()) : ''}`;
    return url;
  }

  timestampFieldMap: Record<string, string> = {
    xyz: 'modified_at',
    rtp_favorites: 'createdat',
    rtp_enquiries: 'created_at',
    rtp_activity: 'timestamp'
  };

  shortHash(text: string, length = 10) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // Convert to 32-bit integer
    }

    // Convert to unsigned int and base36 (0–9, a–z)
    const base36 = (hash >>> 0).toString(36);

    // Pad or trim to desired length
    return base36.padStart(length, '0').substring(0, length);
  }

  /** ignore timestamps to make cache work */
  cacheKeyArgs(keyArgs: any) {
    if (!keyArgs || !keyArgs?.where) return false; // no args to ignore
    // Copy args without timestamp field
    const { created_at, createdat, modified_at, ...rest } = keyArgs?.where;
    return JSON.stringify({ ...keyArgs, where: rest });
  }

  mergeResponse(existing: any, incoming: any, context: any) {
    // When doing cache.writeQuery, Apollo doesn’t pass `args`
    if (!existing) {
      // Replace entirely — writeQuery or cache restore scenario
      return incoming;
    }

    // For queries (with args), merge incrementally
    // Create a Map of the existing data for O(1) lookups
    const mergedMap = new Map(existing.map((item: any) => [item.__ref, item]));

    // Overwrite existing or add new
    incoming.forEach((item: any) => {
      mergedMap.set(item.__ref, item);
    });

    return Array.from(mergedMap.values());
  }

  async sendOTP(phone: string) {
    const response = await fetch(this.getURL('/signin'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: `+91${phone}` })
    });
    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }
  }

  async verifyOTP(phone: string, code: string) {
    const response = await fetch(this.getURL('/verify'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone: `+91${phone}`, code })
    });
    if (!response.ok) {
      throw new Error('Failed to verify OTP');
    }
    return response.json();
  }

  async onboardUser(name: string, purpose: string[], details?: any) {
    const response = await fetch(this.getURL('/api/onboard'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.localStorageService.get('token')}`
      },
      body: JSON.stringify({ name, purpose, details })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to onboard user');
    }
    return await response.json();
  }

  async updateProfile(name: string, email?: string) {
    const response = await fetch(this.getURL('/api/user'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.localStorageService.get('token')}`
      },
      body: JSON.stringify({ name, email })
    });
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    return true;
  }

  async deleteAccount() {
    const response = await fetch(this.getURL('/api/user'), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.localStorageService.get('token')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
    return true;
  }

  async uploadImage(file: File, title?: string, description?: string, is360?: boolean): Promise<{ url: string, thumbnail: string }> {
    const formData = new FormData();
    formData.append('image', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);
    if (is360) formData.append('is360', 'true');

    const response = await fetch(this.getURL('/api/image'), {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.localStorageService.get('token')}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return await response.json(); // or response.text(), etc.
  }

  async deleteImage(imageUrl: string) {
    const response = await fetch(this.getURL('/api/image'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.localStorageService.get('token')}`
      },
      body: JSON.stringify({ url: imageUrl })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Delete failed');
    }
    return true; // or response.text(), etc.
  }


  async updateSubscriptionOnServer(subscription: UserPushSubscription): Promise<boolean> {
    try {
      const response = await fetch(this.getURL('/api/subscribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.localStorageService.get('token')}` },
        body: JSON.stringify({ ...subscription.web, ...subscription.fcm }),
      });
      console.log('Subscription sent to server');
      if (!response.ok) {
        return false;
      }
      return true
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      return false
    }
  }

  async unsubscribeFromPush(endpoint: string) {
    try {
      // Notify server to remove it
      await fetch(this.getURL('/api/unsubscribe'), {
        method: 'POST',
        body: JSON.stringify({ endpoint: endpoint })
      });
    } catch (error) {
      console.error('failed to unsubscribe')
    }
  }

  async fetchAreas(city: string) {
    // fetch areas for the given city
    const response = await fetch(`https://maps.truelet.in/localities?city=${city}`);
    if (!response.ok) {
      throw new Error('Failed to fetch areas');
    }
    return await response.json()
  }

  query<T>(query: string, variables?: Record<string, any>, cachePolicy: FetchPolicy = 'cache-first') {
    return this.apollo?.query<T>({
      query: gql`${query}`,
      variables: variables || {},
      fetchPolicy: cachePolicy
    });
  }
  watchQuery<T>(query: string, variables?: Record<string, any>, cachePolicy: WatchQueryFetchPolicy = 'cache-and-network') {
    return this.apollo?.watchQuery<T>({
      query: gql`${query}`,
      variables: variables || {},
      fetchPolicy: cachePolicy,
      nextFetchPolicy: 'cache-first',
      notifyOnNetworkStatusChange: true
    });
  }

  mutate<T>(mutation: string, variables?: Record<string, any>) {
    return this.apollo?.mutate<T>({
      mutation: gql`${mutation}`,
      variables: variables || {},
    });
  }

  async clearCacheAndReinitClient() {
    await this.apollo?.client?.resetStore();
  }

}
