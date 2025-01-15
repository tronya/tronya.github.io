export class Colors {
  /** Colors are specified in ultima-web-framework. */
  private static rootStyles: CSSStyleDeclaration;
  private static rgbRed = Colors.hexToRgb('--delete-color');
  private static rgbYellow = Colors.hexToRgb('--warning-yellow');
  private static rgbGreen = Colors.hexToRgb('--ok-green');
  private static rgbBlue = Colors.hexToRgb('--true-blue');
  private static rgbGrey = Colors.hexToRgb('--unknown-grey');

  public static neutral = Colors.rgbBlue;
  public static good = Colors.rgbGreen;
  public static medium = Colors.rgbYellow;
  public static bad = Colors.rgbRed;
  public static error = Colors.hexToRgb('var(--error-red)');

  public static hexToRgb(hex: string): string {
    const hexToRgb = (hex: string) =>
      hex
        .replace(
          /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
          (m: any, r: string, g: string, b: string) => '#' + r + r + g + g + b + b
        )
        .replace(/\s/g, '')
        .slice(1)
        .match(/.{2}/g)
        .map((x: string) => parseInt(x, 16));
    if (!this.rootStyles) {
      const html = document.querySelector('html');
      this.rootStyles = window.getComputedStyle(html as any);
    }
    const hexColor = this.rootStyles.getPropertyValue(hex);
    if (!hexColor) return '0, 0, 0';
    return hexToRgb(hexColor);
  }

  public static saturation = {
    neutral: { value: 0, color: Colors.neutral },
    good: { value: 60, color: Colors.good },
    medium: { value: 80, color: Colors.medium },
    bad: { value: 95, color: Colors.bad },
  };

  public static red(alpha = 1): string {
    return `rgba(${Colors.rgbRed}, ${alpha})`;
  }

  public static yellow(alpha = 1): string {
    return `rgba(${Colors.rgbYellow}, ${alpha})`;
  }

  public static green(alpha = 1): string {
    return `rgba(${Colors.rgbGreen}, ${alpha})`;
  }

  public static blue(alpha = 1): string {
    return `rgba(${Colors.rgbBlue}, ${alpha})`;
  }

  public static grey(alpha = 1): string {
    return `rgba(${Colors.rgbGrey}, ${alpha})`;
  }
}
