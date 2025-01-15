import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { strategyHistory } from './mock';

@Injectable()
export class StrategiesService {
  getStrategyHistory() {
    return of(strategyHistory);
  }
}
