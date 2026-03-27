import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { DailyPriceService, DailyPriceResult, GoldPrice } from '../services/daily-price.service';

type PriceKey =
  | 'sell24k'
  | 'buy24k'
  | 'sell21k'
  | 'buy21k'
  | 'sell18k'
  | 'buy18k'
  | 'sell14k'
  | 'buy14k';

@Component({
  selector: 'app-daily-price',
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './daily-price.component.html',
  styleUrl: './daily-price.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DailyPriceComponent implements OnInit {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly countryName = signal('');
  readonly currency = signal('');
  readonly latestPrice = signal<GoldPrice | null>(null);
  readonly previousPrice = signal<GoldPrice | null>(null);
  readonly currentTimestamp = new Date();


  readonly karats: Array<{ label: string; sellKey: PriceKey; buyKey: PriceKey }> = [
    { label: '24K', sellKey: 'sell24k', buyKey: 'buy24k' },
    { label: '21K', sellKey: 'sell21k', buyKey: 'buy21k' },
    { label: '18K', sellKey: 'sell18k', buyKey: 'buy18k' },
    { label: '14K', sellKey: 'sell14k', buyKey: 'buy14k' }
  ];

  private readonly service = inject(DailyPriceService);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    // Fallback guard in case the request hangs unexpectedly
    const timeoutId = setTimeout(() => {
      if (this.loading()) {
        this.error.set('تعذر الاتصال بالخادم، يرجى المحاولة مجدداً.');
        this.loading.set(false);
      }
    }, 12000);

    this.service
      .getPrices('JO')
      .pipe(
        finalize(() => {
          clearTimeout(timeoutId);
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (result: DailyPriceResult) => {
          this.countryName.set(result.country.name);
          this.currency.set(result.country.currency);
          this.latestPrice.set(result.latest);
          this.previousPrice.set(result.previous ?? null);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message || 'تعذر تحميل التسعيرة، يرجى المحاولة مجدداً.');
          this.loading.set(false);
        }
      });
  }

  formatNumber(value?: number | null): string {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return '--';
    }
    return value.toFixed(3);
  }

  formatDate(value?: string | number | Date): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat('ar-JO-u-nu-arab', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(date);

    const day = parts.find((part) => part.type === 'day')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const year = parts.find((part) => part.type === 'year')?.value;

    if (!day || !month || !year) {
      return '--';
    }

    return `${day}-${month}-${year}`;
  }

  formatTime(value?: string | number | Date): string {
    if (!value) {
      return '--';
    }
    const date = new Date(value);
    return new Intl.DateTimeFormat('ar-JO-u-nu-arab', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  }

  trend(key: PriceKey): 'up' | 'down' | 'flat' | null {
    const latest = this.latestPrice();
    const prev = this.previousPrice();

    if (!latest || !prev) {
      return null;
    }

    const current = latest[key];
    const previous = prev[key];

    if (current === undefined || previous === undefined) {
      return null;
    }

    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'flat';
  }

  trendArrow(key: PriceKey): string {
    const direction = this.trend(key);
    if (direction === 'up') return '▲';
    if (direction === 'down') return '▼';
    if (direction === 'flat') return '–';
    return '';
  }

  trendClass(key: PriceKey): string {
    const direction = this.trend(key);
    if (!direction) return '';
    return direction;
  }
}

