#!/usr/bin/env python3
import sys
import json
import yfinance as yf
from datetime import datetime

def get_current_price_and_time(ticker_symbol):
    ticker = yf.Ticker(ticker_symbol)
    hist = ticker.history(period="1d", interval="1m")
    if hist.empty:
        raise ValueError("No data found. Market may be closed.")

    last_row = hist.iloc[-1]
    price = last_row['Close']
    timestamp = hist.index[-1]
    return price, timestamp

def get_exchange_rate(from_currency, to_currency):
    if from_currency == to_currency:
        return 1.0
    fx_pair = f"{from_currency}{to_currency}=X"
    fx_data = yf.Ticker(fx_pair)
    fx_hist = fx_data.history(period="1d")
    if fx_hist.empty:
        raise ValueError("No FX rate data available.")
    return fx_hist['Close'].iloc[-1]

def main():
    if len(sys.argv) < 2:
        error_response = {"error": "Missing ticker argument"}
        print(json.dumps(error_response))
        sys.exit(1)

    ticker = sys.argv[1].upper()
    currency = sys.argv[2].upper() if len(sys.argv) > 2 else "USD"

    try:
        price_usd, timestamp = get_current_price_and_time(ticker)
        exchange_rate = get_exchange_rate("USD", currency)
        converted_price = price_usd * exchange_rate

        response = {
            "ticker": ticker,
            "timestamp": timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
            "price": round(converted_price, 2),
            "currency": currency,
            "base_price_usd": round(price_usd, 2),
            "exchange_rate": round(exchange_rate, 4)
        }

        print(json.dumps(response))
        sys.exit(0)

    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()