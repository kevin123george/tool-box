#!/usr/bin/env python3
import sys
import json
import yfinance as yf
from datetime import date, timedelta


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: stock_history_fetcher.py TICKER START_DATE [CURRENCY]"}))
        sys.exit(1)

    ticker_symbol = sys.argv[1].upper()
    start_date    = sys.argv[2]           # YYYY-MM-DD
    currency      = sys.argv[3].upper() if len(sys.argv) > 3 else "USD"

    try:
        end_date = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')

        # Fetch daily closes for the ticker
        ticker = yf.Ticker(ticker_symbol)
        hist   = ticker.history(start=start_date, end=end_date, interval="1d")

        if hist.empty:
            print(json.dumps([]))
            sys.exit(0)

        # Detect native currency (e.g. EUR for SAP.DE, GBp for VOD.L)
        info            = ticker.fast_info
        native_currency = (getattr(info, 'currency', None) or 'USD').upper()
        gbp_pence       = native_currency == 'GBP' and getattr(info, 'currency', '') == 'GBp'
        if native_currency == 'GBP' and getattr(info, 'currency', '') == 'GBp':
            gbp_pence = True  # prices need /100

        # Fetch historical FX rates: native → target currency
        fx_by_date = {}
        last_fx    = 1.0
        if native_currency != currency:
            fx_pair = f"{native_currency}{currency}=X"
            fx_data = yf.Ticker(fx_pair)
            fx_hist = fx_data.history(start=start_date, end=end_date, interval="1d")
            for idx, row in fx_hist.iterrows():
                fx_by_date[idx.strftime('%Y-%m-%d')] = float(row['Close'])

        results = []
        for idx, row in hist.iterrows():
            day_str      = idx.strftime('%Y-%m-%d')
            native_price = float(row['Close'])
            if gbp_pence:
                native_price /= 100.0

            if native_currency == currency:
                price = native_price
            else:
                # Use same-day rate; fall back to most recent previous rate
                if day_str in fx_by_date:
                    last_fx = fx_by_date[day_str]
                price = native_price * last_fx

            results.append({"date": day_str, "price": round(price, 2)})

        print(json.dumps(results))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
