import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import * as Highcharts from 'highcharts';
import { MonoBankApi } from '../../../../api/monobank';
import { CurrencyWithSpacePipe } from './currency.pipe';
import { Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'graph',
  standalone: true,
  templateUrl: './graph.component.html',
  styleUrls: ['graph.component.scss'],
  imports: [CommonModule, CurrencyWithSpacePipe],
  providers: [CurrencyPipe],
})
export class GraphComponent implements OnDestroy {
  private subscription = new Subscription();
  constructor(private monobankApi: MonoBankApi) {
    this.subscription = this.monobankApi
      .getFormattedJarData()
      .subscribe((jar) => {
        console.log(jar);
        this.showBar(+jar.amount);
      });
  }
  ngOnDestroy(): void {
    console.log('Unsubscribe detected');
    this.subscription.unsubscribe();
  }

  Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {};
  alreadyCouldBye: { cost: number; iterator: number; width: number }[] = [];
  lastNeededMoney: {
    alreadyHave: { percentage: number; cost: number };
    stillNeeded: { percentage: number; cost: number };
  } = {
    alreadyHave: { cost: 0, percentage: 10 },
    stillNeeded: { cost: 0, percentage: 10 },
  };

  showBar(founded: number) {
    const itemCost = 11484.47;
    const availableMoney = founded;

    const moneyOverTheItem = availableMoney % itemCost;
    const moneyNeededForNext = itemCost - moneyOverTheItem;
    const totalItems = Math.floor(availableMoney / itemCost);

    const totalAmount = moneyNeededForNext + availableMoney;

    const oneItemPercentage = (itemCost / totalAmount) * 100;
    const craftedForTheNext = (moneyOverTheItem / totalAmount) * 100;
    const stillNeededForTheNext = (moneyNeededForNext / totalAmount) * 100;

    this.lastNeededMoney = {
      alreadyHave: { cost: moneyOverTheItem, percentage: craftedForTheNext },
      stillNeeded: {
        cost: moneyNeededForNext,
        percentage: stillNeededForTheNext,
      },
    };
    this.alreadyCouldBye = Array.from({ length: totalItems }).map(
      (_, iterator) => ({
        cost: itemCost,
        iterator,
        width: oneItemPercentage,
      })
    );
  }
}
