import { Injectable } from '@angular/core';
import { compact, get, isEmpty, map as lmap, mapValues, values } from 'lodash';
import { map } from 'rxjs';
import { StrategiesService } from './strategies.service';
import { SeriesOptionsType } from 'highcharts';
import { ExecutionType, StrategyStatus } from './model';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class StrategyHistoryStoreService {
  constructor(private strategyService: StrategiesService) {}
  getColor(color: StrategyStatus): string {
    switch (color) {
      case StrategyStatus.Active:
        return 'green';
      case StrategyStatus.Inactive:
        return 'red';
      case StrategyStatus.PendingActive:
        return 'blue';
      case StrategyStatus.PendingInactive:
        return 'orange';
      case StrategyStatus.Unknown:
        return 'grey';
      default:
        return 'black';
    }
  }
  strategyHistory = this.strategyService.getStrategyHistory().pipe(
    map((histories) => histories.data),
    map((strategies) => values(strategies)),
    map((strategies) => {
      const now = dayjs().local();

      const strategiesRows = lmap(strategies, (strategy, index) => {
        const seriesOptionType: SeriesOptionsType = {
          name: strategy[0].strategy.name,
          type: 'columnrange',
          pointWidth: 50,
          data: compact(
            lmap(strategy, (revisions, i) => {
              const nextItem = get(strategy, i + 1);

              const from = dayjs(revisions.timestamp);
              const to = dayjs(nextItem?.timestamp || now);
              return {
                x: index,
                low: dayjs(from).valueOf(),
                high: dayjs(to).valueOf(),
                custom: {
                  status: revisions.strategy.status,
                  operationMode: revisions.strategy.operationMode,
                  executionType: revisions.strategy.executionType,
                  timestamp: revisions.timestamp,
                },
                color: this.getColor(revisions.strategy.status),
              };
            })
          ),
        };

        return seriesOptionType;
      });

      return {
        categories: compact(strategiesRows.map((series) => series.name)),
        strategies: compact(strategiesRows),
        yAxisMin: dayjs('2024-11-26T00:00').valueOf(),
        yAxisMax: dayjs('2024-11-26T23:59').valueOf(),
      };
    }),
    map((strategies) => {
      console.log(strategies);
      return strategies;
    })
  );
}
