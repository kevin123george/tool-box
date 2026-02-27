#!/usr/bin/env python3
"""Fetches fundamental data for a stock using yfinance, converted to EUR.
Usage: python3 fundamentals_fetcher.py <SYMBOL> <COMMAND>
Commands: overview, income, balance_sheet, cash_flow, earnings, all
Returns JSON to stdout. All monetary values are converted to EUR.
"""
import sys
import json
import yfinance as yf
import pandas as pd
import math

TARGET_CURRENCY = "EUR"

# Fields that are monetary (need currency conversion)
OVERVIEW_MONETARY = {
    "marketCap", "eps", "forwardEps", "weekHigh52", "weekLow52",
    "analystTargetPrice", "revenuePerShare", "bookValue", "currentPrice",
    "freeCashflow", "operatingCashflow", "totalRevenue", "totalDebt",
    "totalCash", "ebitda", "dividendRate",
}

# Fields that are ratios/percentages/counts (no conversion)
# peRatio, pegRatio, pbRatio, psRatio, evToEbitda, roe, roa,
# profitMargin, operatingMargin, grossMargin, dividendYield, beta,
# debtToEquity, currentRatio, sharesOutstanding, revenueGrowth, earningsGrowth

# Financial statement fields that are monetary
STATEMENT_NON_MONETARY = {"fiscalDateEnding"}
# EPS fields
EPS_MONETARY = {"reportedEPS", "estimatedEPS", "surprise"}


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


def safe_val(v):
    """Convert numpy/pandas types to JSON-safe Python types."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if hasattr(v, 'item'):
        return v.item()
    if isinstance(v, pd.Timestamp):
        return v.strftime('%Y-%m-%d')
    return v


def convert(val, rate):
    """Convert a monetary value by exchange rate."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return round(val * rate, 2)
    return val


def get_overview(ticker, rate):
    info = ticker.info
    result = {
        "symbol": info.get("symbol"),
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "exchange": info.get("fullExchangeName") or info.get("exchange"),
        "currency": TARGET_CURRENCY,
        "marketCap": safe_val(info.get("marketCap")),
        "peRatio": safe_val(info.get("trailingPE")),
        "forwardPE": safe_val(info.get("forwardPE")),
        "pegRatio": safe_val(info.get("trailingPegRatio")),
        "pbRatio": safe_val(info.get("priceToBook")),
        "psRatio": safe_val(info.get("priceToSalesTrailing12Months")),
        "evToEbitda": safe_val(info.get("enterpriseToEbitda")),
        "eps": safe_val(info.get("trailingEps")),
        "forwardEps": safe_val(info.get("forwardEps")),
        "roe": safe_val(info.get("returnOnEquity")),
        "roa": safe_val(info.get("returnOnAssets")),
        "profitMargin": safe_val(info.get("profitMargins")),
        "operatingMargin": safe_val(info.get("operatingMargins")),
        "grossMargin": safe_val(info.get("grossMargins")),
        "dividendYield": safe_val(info.get("dividendYield")),
        "dividendRate": safe_val(info.get("dividendRate")),
        "beta": safe_val(info.get("beta")),
        "weekHigh52": safe_val(info.get("fiftyTwoWeekHigh")),
        "weekLow52": safe_val(info.get("fiftyTwoWeekLow")),
        "sharesOutstanding": safe_val(info.get("sharesOutstanding")),
        "analystTargetPrice": safe_val(info.get("targetMeanPrice")),
        "debtToEquity": safe_val(info.get("debtToEquity")),
        "currentRatio": safe_val(info.get("currentRatio")),
        "revenuePerShare": safe_val(info.get("revenuePerShare")),
        "bookValue": safe_val(info.get("bookValue")),
        "currentPrice": safe_val(info.get("currentPrice")),
        "revenueGrowth": safe_val(info.get("revenueGrowth")),
        "earningsGrowth": safe_val(info.get("earningsGrowth")),
        "freeCashflow": safe_val(info.get("freeCashflow")),
        "operatingCashflow": safe_val(info.get("operatingCashflow")),
        "totalRevenue": safe_val(info.get("totalRevenue")),
        "totalDebt": safe_val(info.get("totalDebt")),
        "totalCash": safe_val(info.get("totalCash")),
        "ebitda": safe_val(info.get("ebitda")),
    }
    # Convert monetary fields
    for key in OVERVIEW_MONETARY:
        if key in result and result[key] is not None:
            result[key] = convert(result[key], rate)
    return result


def df_to_list(df, rate):
    """Convert a pandas DataFrame (with dates as columns) to a list of dicts, converting to EUR."""
    if df is None or df.empty:
        return []
    results = []
    for col in df.columns:
        entry = {"fiscalDateEnding": col.strftime('%Y-%m-%d') if isinstance(col, pd.Timestamp) else str(col)}
        for idx in df.index:
            val = safe_val(df.loc[idx, col])
            # All financial statement line items are monetary except date
            if val is not None and isinstance(val, (int, float)):
                val = convert(val, rate)
            entry[idx] = val
        results.append(entry)
    return results


def get_income_statement(ticker, rate):
    annual = df_to_list(ticker.financials, rate)
    quarterly = df_to_list(ticker.quarterly_financials, rate)
    return {"annualReports": annual, "quarterlyReports": quarterly}


def get_balance_sheet(ticker, rate):
    annual = df_to_list(ticker.balance_sheet, rate)
    quarterly = df_to_list(ticker.quarterly_balance_sheet, rate)
    return {"annualReports": annual, "quarterlyReports": quarterly}


def get_cash_flow(ticker, rate):
    annual = df_to_list(ticker.cashflow, rate)
    quarterly = df_to_list(ticker.quarterly_cashflow, rate)
    return {"annualReports": annual, "quarterlyReports": quarterly}


def get_earnings(ticker, rate):
    result = {"annualEarnings": [], "quarterlyEarnings": []}

    # Quarterly earnings with estimates
    eh = ticker.earnings_history
    if eh is not None and not eh.empty:
        for idx, row in eh.iterrows():
            entry = {
                "fiscalDateEnding": idx.strftime('%Y-%m-%d') if isinstance(idx, pd.Timestamp) else str(idx),
                "reportedEPS": convert(safe_val(row.get("epsActual")), rate),
                "estimatedEPS": convert(safe_val(row.get("epsEstimate")), rate),
                "surprise": convert(safe_val(row.get("epsDifference")), rate),
                "surprisePercentage": safe_val(row.get("surprisePercent")),
            }
            result["quarterlyEarnings"].append(entry)

    # Annual EPS from income statement
    fin = ticker.financials
    if fin is not None and not fin.empty and "Diluted EPS" in fin.index:
        for col in fin.columns:
            entry = {
                "fiscalDateEnding": col.strftime('%Y-%m-%d') if isinstance(col, pd.Timestamp) else str(col),
                "reportedEPS": convert(safe_val(fin.loc["Diluted EPS", col]), rate),
            }
            result["annualEarnings"].append(entry)

    return result


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: fundamentals_fetcher.py <SYMBOL> <COMMAND>"}))
        sys.exit(1)

    symbol = sys.argv[1].upper()
    command = sys.argv[2].lower()

    try:
        ticker = yf.Ticker(symbol)

        # Determine source currency and get exchange rate to EUR
        info = ticker.info
        source_currency = info.get("financialCurrency") or info.get("currency") or "USD"
        rate = get_exchange_rate(source_currency, TARGET_CURRENCY)

        if command == "overview":
            result = get_overview(ticker, rate)
        elif command == "income":
            result = get_income_statement(ticker, rate)
        elif command == "balance_sheet":
            result = get_balance_sheet(ticker, rate)
        elif command == "cash_flow":
            result = get_cash_flow(ticker, rate)
        elif command == "earnings":
            result = get_earnings(ticker, rate)
        elif command == "all":
            result = {
                "overview": get_overview(ticker, rate),
                "income": get_income_statement(ticker, rate),
                "balance_sheet": get_balance_sheet(ticker, rate),
                "cash_flow": get_cash_flow(ticker, rate),
                "earnings": get_earnings(ticker, rate),
            }
        else:
            result = {"error": f"Unknown command: {command}"}
            print(json.dumps(result))
            sys.exit(1)

        # Include exchange rate info for transparency
        result["_exchangeRate"] = {"from": source_currency, "to": TARGET_CURRENCY, "rate": round(rate, 6)}

        print(json.dumps(result))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
