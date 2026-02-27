#!/usr/bin/env python3
import sys
import json
import yfinance as yf
from datetime import datetime

def get_current_price_and_native_currency(ticker_symbol):
    ticker = yf.Ticker(ticker_symbol)
    # Try intraday first; fall back to daily (last 5 trading days) when market is closed
    hist = ticker.history(period="1d", interval="1m")
    if hist.empty:
        hist = ticker.history(period="5d", interval="1d")
    if hist.empty:
        raise ValueError("No data found for ticker (possibly delisted or invalid symbol).")

    last_row = hist.iloc[-1]
    price = last_row['Close']
    timestamp = hist.index[-1]

    # Get the currency this stock actually trades in (e.g. EUR for SAP.DE, GBp for VOD.L)
    info = ticker.fast_info
    native_currency = getattr(info, 'currency', None) or 'USD'
    # yfinance sometimes returns GBp (pence) — normalise to GBP
    pence_factor = 1.0
    if native_currency == 'GBp':
        price = price / 100.0
        native_currency = 'GBP'
        pence_factor = 100.0

    prev_close_native = getattr(info, 'previous_close', None)
    if prev_close_native is not None:
        prev_close_native = prev_close_native / pence_factor

    return price, native_currency.upper(), timestamp, prev_close_native

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
    target_currency = sys.argv[2].upper() if len(sys.argv) > 2 else "USD"

    try:
        native_price, native_currency, timestamp, prev_close_native = get_current_price_and_native_currency(ticker)
        exchange_rate = get_exchange_rate(native_currency, target_currency)
        converted_price = native_price * exchange_rate
        prev_close = round(prev_close_native * exchange_rate, 2) if prev_close_native is not None else None

        response = {
            "ticker": ticker,
            "timestamp": timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
            "price": round(converted_price, 2),
            "currency": target_currency,
            "base_price_usd": round(native_price, 2),
            "exchange_rate": round(exchange_rate, 4),
            "previous_close": prev_close
        }

        print(json.dumps(response))
        sys.exit(0)

    except Exception as e:
        error_response = {"error": str(e)}
        print(json.dumps(error_response))
        sys.exit(1)

if __name__ == "__main__":
    main()