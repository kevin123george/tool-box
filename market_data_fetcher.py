#!/usr/bin/env python3
"""Fetches OHLCV market data using yfinance, converted to EUR.
Usage: python3 market_data_fetcher.py <SYMBOL> ohlc <PERIOD> <INTERVAL>
Returns JSON to stdout. All OHLC prices converted to EUR, volume unchanged.
"""
import sys
import json
import math
import yfinance as yf

TARGET_CURRENCY = "EUR"


def get_exchange_rate(from_currency, to_currency):
    """Get exchange rate using yfinance."""
    if from_currency == to_currency:
        return 1.0
    fx_pair = f"{from_currency}{to_currency}=X"
    fx = yf.Ticker(fx_pair)
    h = fx.history(period="1d")
    if h.empty:
        return 1.0
    return float(h["Close"].iloc[-1])


def safe_float(v):
    """Convert to float, return None for NaN/Inf."""
    if v is None:
        return None
    if hasattr(v, 'item'):
        v = v.item()
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return round(float(v), 4)


def fetch_ohlc(symbol, period, interval):
    """Fetch OHLCV data for a symbol."""
    ticker = yf.Ticker(symbol)
    info = ticker.info
    source_currency = info.get("financialCurrency") or info.get("currency") or "USD"
    rate = get_exchange_rate(source_currency, TARGET_CURRENCY)

    df = ticker.history(period=period, interval=interval)
    if df is None or df.empty:
        return {"error": f"No data found for {symbol}", "symbol": symbol}

    data = []
    for idx, row in df.iterrows():
        ts = idx
        if hasattr(ts, 'strftime'):
            # For intraday intervals, include time
            if interval in ('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h'):
                time_str = ts.strftime('%Y-%m-%dT%H:%M')
            else:
                time_str = ts.strftime('%Y-%m-%d')
        else:
            time_str = str(ts)

        o = safe_float(row.get("Open"))
        h = safe_float(row.get("High"))
        l = safe_float(row.get("Low"))
        c = safe_float(row.get("Close"))
        v = safe_float(row.get("Volume"))

        if o is None or c is None:
            continue

        data.append({
            "time": time_str,
            "open": round(o * rate, 4),
            "high": round(h * rate, 4) if h else round(o * rate, 4),
            "low": round(l * rate, 4) if l else round(o * rate, 4),
            "close": round(c * rate, 4),
            "volume": v if v else 0
        })

    return {
        "data": data,
        "symbol": symbol,
        "currency": TARGET_CURRENCY,
        "sourceCurrency": source_currency,
        "exchangeRate": round(rate, 6),
        "period": period,
        "interval": interval
    }


def main():
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: market_data_fetcher.py <SYMBOL> ohlc <PERIOD> <INTERVAL>"}))
        sys.exit(1)

    symbol = sys.argv[1].upper()
    command = sys.argv[2].lower()
    period = sys.argv[3]
    interval = sys.argv[4]

    try:
        if command == "ohlc":
            result = fetch_ohlc(symbol, period, interval)
        else:
            result = {"error": f"Unknown command: {command}"}
            print(json.dumps(result))
            sys.exit(1)

        if "error" in result:
            print(json.dumps(result))
            sys.exit(1)

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
