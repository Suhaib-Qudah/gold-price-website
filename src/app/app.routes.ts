import { Routes } from '@angular/router';
import { DailyPriceComponent } from './daily-price/daily-price.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'daily-price' },
  { path: 'daily-price', component: DailyPriceComponent }
];
