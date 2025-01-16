import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Pipe({
  name: 'currencyWithSpace',
})
export class CurrencyWithSpacePipe implements PipeTransform {
  constructor(private currencyPipe: CurrencyPipe) {}

  transform(
    value: any,
    currencyCode: string = 'UAH',
    display: string = 'symbol',
    digitsInfo: string = '1.0-0'
  ): string {
    // Форматуємо значення як валюту
    const formattedValue = this.currencyPipe.transform(
      value,
      currencyCode,
      display,
      digitsInfo
    );

    // Перевіряємо та додаємо пробіл після символу валюти
    if (formattedValue) {
      return formattedValue.replace(/(\S)(\d)/, '$1 $2');
    }

    return '';
  }
}
