import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { Country, DailyPriceService, DailyPriceResult, GoldPrice } from '../services/daily-price.service';

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
export class DailyPriceComponent implements OnInit, OnDestroy {
  readonly countries = signal<Country[]>([]);
  readonly selectedCountryCode = signal('JO');
  readonly countriesLoading = signal(false);
  readonly pricesLoading = signal(false);
  readonly loading = computed(() => this.countriesLoading() || this.pricesLoading());
  readonly error = signal<string | null>(null);
  readonly countryName = signal('');
  readonly currency = signal('');
  readonly latestPrice = signal<GoldPrice | null>(null);
  readonly previousPrice = signal<GoldPrice | null>(null);
  readonly currentTimestamp = signal(new Date());
  readonly bannerMessages: string[] = [
    'تم إلغاء التسعيرة الورقية',
    'لا يوجد عروض على الذهب',
    'التسعيرة المعتمدة هي التسعيرة الإلكترونية',
    'للاستفسارات أو الشكاوى التواصل على رقم النقابة الرسمي 0777762999'
  ];
  readonly bannerMessageIndex = signal(0);
  readonly currentBannerMessage = computed(
    () => this.bannerMessages[this.bannerMessageIndex()] ?? ''
  );
  readonly bannerAnimationClass = computed(() =>
    this.bannerMessageIndex() % 2 === 0 ? 'banner-slide-a' : 'banner-slide-b'
  );

  private readonly refreshIntervalMs = 60 * 1000;
  private readonly bannerIntervalMs = 10 * 1000;
  private refreshTimerId: number | null = null;
  private bannerTimerId: number | null = null;
  private cachedCountries: Country[] = [];
  private readonly cachedPricesByCountry = new Map<string, DailyPriceResult>();


  readonly karats: Array<{ label: string; sellKey: PriceKey; buyKey: PriceKey }> = [
    { label: '24K', sellKey: 'sell24k', buyKey: 'buy24k' },
    { label: '21K', sellKey: 'sell21k', buyKey: 'buy21k' },
    { label: '18K', sellKey: 'sell18k', buyKey: 'buy18k' },
    { label: '14K', sellKey: 'sell14k', buyKey: 'buy14k' }
  ];

  private readonly service = inject(DailyPriceService);

  ngOnInit(): void {
    this.load();
    this.startAutoRefresh();
    this.startBannerRotation();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    this.stopBannerRotation();
  }

  load(options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;
    if (!silent) {
      this.error.set(null);
    }
    this.loadCountries({ silent });
  }

  loadCountries(options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;

    if (!silent) {
      this.countriesLoading.set(true);
    }

    const timeoutId = silent
      ? null
      : window.setTimeout(() => {
          if (this.countriesLoading()) {
            this.error.set('تعذر الاتصال بالخادم، يرجى المحاولة مجدداً.');
            this.countriesLoading.set(false);
          }
        }, 12000);

    this.service
      .getCountries()
      .pipe(
        finalize(() => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            this.countriesLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (countries: Country[]) => {
          this.cachedCountries = countries;
          this.countries.set(countries);
          const preferred = this.selectedCountryCode();
          const resolvedCode =
            countries.find((country) => country.code === preferred)?.code ||
            countries[0]?.code ||
            'JO';

          this.selectedCountryCode.set(resolvedCode);

          if (resolvedCode) {
            this.loadPrices(resolvedCode, { silent });
          }
        },
        error: (err: Error) => {
          if (this.cachedCountries.length > 0) {
            this.countries.set(this.cachedCountries);
            const cachedCode =
              this.selectedCountryCode() || this.cachedCountries[0]?.code || '';

            if (cachedCode) {
              this.selectedCountryCode.set(cachedCode);
              this.loadPrices(cachedCode, { silent: true });
            }
            return;
          }

          this.error.set(err.message || 'تعذر تحميل قائمة الدول، يرجى المحاولة مجدداً.');
        }
      });
  }

  loadPrices(countryCode: string, options?: { silent?: boolean }): void {
    const silent = options?.silent ?? false;

    if (!countryCode) {
      this.error.set('الرجاء اختيار دولة لعرض التسعيرة.');
      return;
    }

    if (!silent) {
      this.pricesLoading.set(true);
      this.latestPrice.set(null);
      this.previousPrice.set(null);
    }

    const timeoutId = silent
      ? null
      : window.setTimeout(() => {
          if (this.pricesLoading()) {
            this.error.set('تعذر الاتصال بالخادم، يرجى المحاولة مجدداً.');
            this.pricesLoading.set(false);
          }
        }, 12000);

    this.service
      .getPrices(countryCode)
      .pipe(
        finalize(() => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
            this.pricesLoading.set(false);
          }
        })
      )
      .subscribe({
        next: (result: DailyPriceResult) => {
          this.cachedPricesByCountry.set(countryCode, result);
          this.countryName.set(result.country.name);
          this.currency.set(result.country.currency);
          this.latestPrice.set(result.latest);
          this.previousPrice.set(result.previous ?? null);
          this.currentTimestamp.set(new Date());
        },
        error: (err: Error) => {
          const cached = this.cachedPricesByCountry.get(countryCode);
          if (cached) {
            this.countryName.set(cached.country.name);
            this.currency.set(cached.country.currency);
            this.latestPrice.set(cached.latest);
            this.previousPrice.set(cached.previous ?? null);
            return;
          }

          this.error.set(err.message || 'تعذر تحميل التسعيرة، يرجى المحاولة مجدداً.');
        }
      });
  }

  onCountryChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const code = select?.value ?? '';
    this.selectedCountryCode.set(code);
    this.loadPrices(code);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.refreshTimerId = window.setInterval(() => {
      this.load({ silent: true });
    }, this.refreshIntervalMs);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimerId !== null) {
      window.clearInterval(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  private startBannerRotation(): void {
    this.stopBannerRotation();

    if (this.bannerMessages.length <= 1) {
      return;
    }

    this.bannerTimerId = window.setInterval(() => {
      this.bannerMessageIndex.update(
        (index) => (index + 1) % this.bannerMessages.length
      );
    }, this.bannerIntervalMs);
  }

  private stopBannerRotation(): void {
    if (this.bannerTimerId !== null) {
      window.clearInterval(this.bannerTimerId);
      this.bannerTimerId = null;
    }
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
    const parts = new Intl.DateTimeFormat('ar-JO-u-nu-latn', {
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
    return new Intl.DateTimeFormat('ar-JO-u-nu-latn', {
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

