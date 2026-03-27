import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError, timeout } from 'rxjs';

interface ApiGoldPrice {
  id: number;
  country_id: number;
  buy_24k: string;
  buy_21k: string;
  buy_18k: string;
  buy_14k: string;
  sell_24k: string;
  sell_21k: string;
  sell_18k: string;
  sell_14k: string;
  published_at: string;
  created_at: string;
  updated_at: string;
}

interface ApiCountry {
  id: number;
  name: string;
  code: string;
  currency: string;
  gold_prices: ApiGoldPrice[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: ApiCountry;
}

export interface Country {
  id: number;
  name: string;
  code: string;
  currency: string;
}

export interface GoldPrice {
  id: number;
  countryId: number;
  buy24k: number;
  buy21k: number;
  buy18k: number;
  buy14k: number;
  sell24k: number;
  sell21k: number;
  sell18k: number;
  sell14k: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyPriceResult {
  country: Country;
  latest: GoldPrice;
  previous?: GoldPrice;
}

@Injectable({ providedIn: 'root' })
export class DailyPriceService {
  // Use relative base to work with the dev-server proxy (see proxy.conf.json)
  private readonly apiBase = '/api/countries';

  constructor(private readonly http: HttpClient) {}

  getPrices(countryCode = 'JO'): Observable<DailyPriceResult> {
    return this.http
      .get<ApiResponse>(`${this.apiBase}/${countryCode}/prices`)
      .pipe(
        timeout(10000),
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Unexpected API response.');
          }

          const sortedPrices = [...(response.data.gold_prices || [])].sort(
            (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
          );

          const [latest, previous] = sortedPrices;

          if (!latest) {
            throw new Error('No pricing data returned for this country.');
          }

          return {
            country: {
              id: response.data.id,
              name: response.data.name,
              code: response.data.code,
              currency: response.data.currency
            },
            latest: this.mapPrice(latest),
            previous: previous ? this.mapPrice(previous) : undefined
          } satisfies DailyPriceResult;
        }),
        catchError((error: HttpErrorResponse | Error) => {
          const message =
            error instanceof HttpErrorResponse
              ? error.message || 'Network error while fetching prices.'
              : error.message || 'An unknown error occurred while fetching prices.';
          return throwError(() => new Error(message));
        })
      );
  }

  private mapPrice(price: ApiGoldPrice): GoldPrice {
    return {
      id: price.id,
      countryId: price.country_id,
      buy24k: Number(price.buy_24k),
      buy21k: Number(price.buy_21k),
      buy18k: Number(price.buy_18k),
      buy14k: Number(price.buy_14k),
      sell24k: Number(price.sell_24k),
      sell21k: Number(price.sell_21k),
      sell18k: Number(price.sell_18k),
      sell14k: Number(price.sell_14k),
      publishedAt: price.published_at,
      createdAt: price.created_at,
      updatedAt: price.updated_at
    } satisfies GoldPrice;
  }
}

