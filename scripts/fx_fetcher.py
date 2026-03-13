#!/usr/bin/env python3
import sys, json
import yfinance as yf

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: fx_fetcher.py FROM TO"}))
        sys.exit(1)

    from_cur = sys.argv[1].upper()
    to_cur = sys.argv[2].upper()

    try:
        if from_cur == to_cur:
            print(json.dumps({"from": from_cur, "to": to_cur, "rate": 1.0}))
            return

        pair = f"{from_cur}{to_cur}=X"
        ticker = yf.Ticker(pair)
        hist = ticker.history(period="1d")
        if hist.empty:
            hist = ticker.history(period="5d")
        if hist.empty:
            print(json.dumps({"error": f"No data for {pair}"}))
            sys.exit(1)

        rate = float(hist['Close'].iloc[-1])
        print(json.dumps({"from": from_cur, "to": to_cur, "rate": round(rate, 6)}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
