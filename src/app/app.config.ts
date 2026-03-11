import { ApplicationConfig, provideZonelessChangeDetection, isDevMode, PLATFORM_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions, withInMemoryScrolling } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloLink } from '@apollo/client/core';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideClientHydration(withIncrementalHydration()),
    provideHttpClient(withFetch()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: APOLLO_OPTIONS,
      useFactory: (httpLink: HttpLink, platformId: object) => {
        const isBrowser = isPlatformBrowser(platformId);

        const cache = new InMemoryCache({
          typePolicies: {
            Query: {
              fields: {
                discoverProfiles: { keyArgs: false, merge: true },
                matches: { keyArgs: false },
                chatMessages: { keyArgs: ['matchId'] },
                clubs: { keyArgs: false },
                myProfile: { keyArgs: false },
                whoLikedMe: { keyArgs: false },
              },
            },
            DatingProfile: { keyFields: ['id'] },
            Match: { keyFields: ['id'] },
            Message: { keyFields: ['id'] },
            Club: { keyFields: ['id'] },
          },
        });

      const authLink = new ApolloLink((operation, forward) => {
        const token = isBrowser ? localStorage.getItem('token') : null;

        operation.setContext(({ headers = {} }) => ({
          headers: {
            ...headers,
            Authorization: token ? `Bearer ${token}` : '',
          }
        }));

        return forward(operation);
      });

      // 4. Angular-specific HttpLink
      const http = httpLink.create({ uri: environment.apiBaseURL + '/api/graph' });

      return {
        link: authLink.concat(http),
        cache,
        defaultOptions: {
          watchQuery: { fetchPolicy: 'cache-and-network' },
          query: { fetchPolicy: 'cache-first' },
        },
      };
      },
      deps: [HttpLink, PLATFORM_ID],
    },
    Apollo,
  ],
};
