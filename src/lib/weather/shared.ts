export type WeatherConditionKind = "RAIN" | "SNOW" | "CLOUDS" | "CLEAR" | "OTHER";

export type DailyWeatherForecast = {
  date: string;
  maxTempC: number;
  condition: WeatherConditionKind;
  openWeatherMain: string;
  iconCode: string;
};

export function isRainLikeCondition(c: WeatherConditionKind): boolean {
  return c === "RAIN" || c === "SNOW";
}
