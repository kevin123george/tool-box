#!/usr/bin/env python3
"""
Persistent price daemon — reads JSON requests from stdin, writes JSON responses to stdout.
One JSON object per line; runs until stdin closes (process is killed or parent exits).
No Python startup overhead on each request.
"""
import sys
import json
import yfinance as yf


def get_exchange_rate(from_currency, to_currency):
    if from_currency == to_currency:
        return 1.0
    fx_pair = f"{from_currency}{to_currency}=X"
    fx_data = yf.Ticker(fx_pair)
    fx_hist = fx_data.history(period="1d")
    if fx_hist.empty:
        raise ValueError(f"No FX rate data for {fx_pair}")
    return fx_hist['Close'].iloc[-1]


def fetch_price(ticker_symbol, target_currency):
    ticker = yf.Ticker(ticker_symbol)
    hist = ticker.history(period="1d", interval="1m")
    if hist.empty:
        raise ValueError("No data found. Market may be closed.")

    last_row = hist.iloc[-1]
    price = last_row['Close']
    timestamp = hist.index[-1]

    info = ticker.fast_info
    native_currency = getattr(info, 'currency', None) or 'USD'

    pence_factor = 1.0
    if native_currency == 'GBp':
        price /= 100.0
        native_currency = 'GBP'
        pence_factor = 100.0

    prev_close_native = getattr(info, 'previous_close', None)
    if prev_close_native is not None:
        prev_close_native /= pence_factor

    exchange_rate = get_exchange_rate(native_currency, target_currency.upper())
    converted_price = price * exchange_rate
    prev_close = round(prev_close_native * exchange_rate, 2) if prev_close_native is not None else None

    return {
        "ticker": ticker_symbol.upper(),
        "timestamp": timestamp.strftime('%Y-%m-%d %H:%M:%S UTC'),
        "price": round(converted_price, 2),
        "currency": target_currency.upper(),
        "base_price_usd": round(price, 2),
        "exchange_rate": round(exchange_rate, 4),
        "previous_close": prev_close,
    }


def main():
    # Line-buffer stdout so responses reach Java immediately even without explicit flush
    sys.stdout.reconfigure(line_buffering=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            ticker = req.get('ticker', '').upper()
            currency = req.get('currency', 'USD').upper()
            result = fetch_price(ticker, currency)
            print(json.dumps(result), flush=True)
        except BaseException as e:
            # Catch BaseException so SystemExit / KeyboardInterrupt are also reported
            # rather than killing the daemon silently
            print(json.dumps({"error": type(e).__name__ + ": " + str(e)}), flush=True)


if __name__ == '__main__':
    main()
