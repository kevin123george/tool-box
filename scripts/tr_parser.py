#!/usr/bin/env python3
"""
Trade Republic PDF statement parser.
Usage: tr_parser.py <path_to_pdf>
Output: JSON with trades, income, and card expenses.
"""
import sys
import json
import re
import pdfplumber

GERMAN_MONTHS = {
    'Jan.': 1, 'Feb.': 2, 'März.': 3, 'Apr.': 4, 'Mai.': 5, 'Jun.': 6,
    'Jul.': 7, 'Aug.': 8, 'Sept.': 9, 'Okt.': 10, 'Nov.': 11, 'Dez.': 12,
}

DATE_LINE_RE = re.compile(
    r'^(\d{1,2})\s+(Jan\.|Feb\.|März\.|Apr\.|Mai\.|Jun\.|Jul\.|Aug\.|Sept\.|Okt\.|Nov\.|Dez\.)'
)

ISIN_RE = re.compile(r'([A-Z]{2}[A-Z0-9]{9}[0-9])')
QTY_RE = re.compile(r'quantity:\s*([\d]+(?:\.[\d]+)?)\b')
QTY_YEAR_RE = re.compile(r'\b20\d{2}\b\s+([\d]+(?:\.[\d]+)?)(?!\s*[,€])')
AMOUNT_RE = re.compile(r'([\d.]+,\d{2})\s*€')
YEAR_RE = re.compile(r'^\d{4}$')

PERIOD_RE = re.compile(
    r'DATUM\s+(\d{1,2})\s+(Jan\.|Feb\.|März\.|Apr\.|Mai\.|Jun\.|Jul\.|Aug\.|Sept\.|Okt\.|Nov\.|Dez\.)\s+(\d{4})\s*[-–]\s*(\d{1,2})\s+(Jan\.|Feb\.|März\.|Apr\.|Mai\.|Jun\.|Jul\.|Aug\.|Sept\.|Okt\.|Nov\.|Dez\.)\s+(\d{4})'
)

CASH_RE = re.compile(
    r'Cashkonto\s+([\d.]+,\d{2})\s*€\s+([\d.]+,\d{2})\s*€\s+([\d.]+,\d{2})\s*€\s+([\d.]+,\d{2})\s*€'
)

TYPE_RE = re.compile(r'(Zinsen|Handel|Kartentransaktion|Überweisung|Steuern|Ertrag)')

SKIP_PAGES = ('BARMITTELÜBERSICHT', 'HINWEISE')


def parse_german_amount(s):
    """Convert German formatted number to float: '4.141,82' -> 4141.82"""
    s = s.replace('.', '').replace(',', '.')
    return float(s)


def month_to_num(m):
    return GERMAN_MONTHS.get(m, 1)


def make_date(day, month_str, year):
    m = month_to_num(month_str)
    return f"{year}-{m:02d}-{int(day):02d}"


def parse_period(all_text):
    m = PERIOD_RE.search(all_text)
    if m:
        d1, mon1, y1, d2, mon2, y2 = m.groups()
        return make_date(d1, mon1, y1), make_date(d2, mon2, y2)
    return None, None


def parse_cash_balance(all_text):
    m = CASH_RE.search(all_text)
    if m:
        return parse_german_amount(m.group(4))
    return 0.0


def extract_all_lines(pdf):
    """Extract lines from all pages, skipping BARMITTELÜBERSICHT and HINWEISE pages."""
    lines = []
    for page in pdf.pages:
        text = page.extract_text() or ''
        # Skip summary/disclaimer pages
        skip = any(kw in text for kw in SKIP_PAGES)
        if skip:
            continue
        for line in text.split('\n'):
            line = line.strip()
            if line:
                lines.append(line)
    return lines


def find_umsatz_start(lines):
    for i, line in enumerate(lines):
        if 'UMSATZÜBERSICHT' in line:
            return i
    return 0


def group_blocks(lines, umsatz_start):
    """
    Group lines into transaction blocks. Each block starts with a line
    matching DATE_LINE_RE.
    """
    blocks = []
    current = []
    in_umsatz = False

    for i, line in enumerate(lines):
        if i <= umsatz_start:
            if 'UMSATZÜBERSICHT' in line:
                in_umsatz = True
            continue

        if not in_umsatz:
            continue

        if DATE_LINE_RE.match(line):
            if current:
                blocks.append(current)
            current = [line]
        else:
            if current:
                current.append(line)

    if current:
        blocks.append(current)

    return blocks


def parse_block(block):
    """Parse a single transaction block into a structured dict or None."""
    combined = ' '.join(block)

    # Find type keyword
    type_match = TYPE_RE.search(combined)
    if not type_match:
        return None
    tx_type = type_match.group(1)

    # Skip internal transfers and taxes (credits handled separately if needed)
    if tx_type == 'Überweisung':
        return None
    if tx_type == 'Steuern':
        return None

    # Extract date: day and month from first line, year from a line that is just 4 digits
    first_line = block[0]
    date_match = DATE_LINE_RE.match(first_line)
    if not date_match:
        return None
    day = date_match.group(1)
    month_str = date_match.group(2)

    year = None
    for line in block:
        # Year can appear alone or at start of a line like "2025 rest of desc"
        parts = line.strip().split()
        if parts:
            candidate = parts[0]
            if YEAR_RE.match(candidate):
                year = candidate
                break
            # Also check last word
            candidate = parts[-1]
            if YEAR_RE.match(candidate):
                year = candidate
                break

    if not year:
        # Try any 4-digit year in the combined text
        ym = re.search(r'\b(20\d{2})\b', combined)
        if ym:
            year = ym.group(1)
        else:
            return None

    date_iso = make_date(day, month_str, year)

    # Extract amounts
    amounts = AMOUNT_RE.findall(combined)
    # Last amount is typically the balance/saldo; second-to-last is the transaction amount
    if len(amounts) >= 2:
        tx_amount = parse_german_amount(amounts[-2])
    elif len(amounts) == 1:
        tx_amount = parse_german_amount(amounts[0])
    else:
        tx_amount = 0.0

    if tx_type == 'Handel':
        return parse_handel(combined, date_iso, tx_amount)
    elif tx_type == 'Zinsen':
        return {
            '__type': 'income',
            'date': date_iso,
            'type': 'INTEREST',
            'description': 'Interest payment',
            'isin': None,
            'amountEur': tx_amount,
        }
    elif tx_type == 'Ertrag':
        isin = None
        im = ISIN_RE.search(combined)
        if im:
            isin = im.group(1)
        return {
            '__type': 'income',
            'date': date_iso,
            'type': 'DIVIDEND',
            'description': f'Cash Dividend for ISIN {isin}' if isin else 'Dividend',
            'isin': isin,
            'amountEur': tx_amount,
        }
    elif tx_type == 'Kartentransaktion':
        # Merchant is what comes after "Kartentransaktion" (possibly merged without space)
        merchant_match = re.search(r'Kartentransaktion\s*(.*?)(?:\s+[\d.]+,\d{2}\s*€)', combined)
        if merchant_match:
            merchant = merchant_match.group(1).strip()
        else:
            merchant = combined.replace('Kartentransaktion', '').strip()[:60]
        return {
            '__type': 'expense',
            'date': date_iso,
            'description': merchant,
            'amountEur': tx_amount,
        }

    return None


def parse_handel(combined, date_iso, tx_amount):
    """Parse a Handel (trade) block."""
    isin_match = ISIN_RE.search(combined)
    if not isin_match:
        return None
    isin = isin_match.group(1)

    qty_match = QTY_RE.search(combined)
    if qty_match:
        quantity = float(qty_match.group(1))
    else:
        # quantity: was at line-end; number appears after the year on the next line
        qty_match2 = QTY_YEAR_RE.search(combined)
        quantity = float(qty_match2.group(1)) if qty_match2 else 0.0

    # Determine action
    if re.search(r'\bBuy trade\b', combined, re.IGNORECASE):
        action = 'BUY'
    elif re.search(r'\bSell trade\b', combined, re.IGNORECASE):
        action = 'SELL'
    else:
        action = 'BUY'

    # Extract name: text between ISIN and ", quantity:"
    name = ''
    after_isin = combined[isin_match.end():]
    # .+? allows commas inside name (e.g. "DL-,001"), stops at first ", quantity:"
    name_match = re.match(r'\s*(.+?)(?:,\s*quantity:)', after_isin)
    if name_match:
        raw_name = name_match.group(1).strip()
    else:
        # Fallback: cut at first amount (stops before prices)
        amt_pos = re.search(r'[\d.]+,\d{2}\s*€', after_isin)
        chunk = after_isin[:amt_pos.start()] if amt_pos else after_isin[:40]
        # Strip trailing type keyword (e.g. " Handel")
        chunk = re.sub(r'\s+(Handel|Zinsen|Steuern|Ertrag|Kartentransaktion)\s*$', '', chunk)
        raw_name = chunk.strip().rstrip(',')
    # Strip exchange-specific suffixes like " DL-,001" " EO-,20" " NAM. EO-,20"
    raw_name = re.sub(r'\s+[A-Z]{1,3}[-,.]\S+$', '', raw_name).strip().rstrip('.,')
    name = raw_name[:35]

    price_per_share = (tx_amount / quantity) if quantity > 0 else 0.0

    return {
        '__type': 'trade',
        'date': date_iso,
        'action': action,
        'isin': isin,
        'name': name,
        'quantity': quantity,
        'totalEur': tx_amount,
        'pricePerShare': round(price_per_share, 4),
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: tr_parser.py <pdf_path>'}))
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract all text for header parsing
            all_text = ' '.join(
                (page.extract_text() or '') for page in pdf.pages
            )

            period_from, period_to = parse_period(all_text)
            cash_balance = parse_cash_balance(all_text)

            lines = extract_all_lines(pdf)

        umsatz_start = find_umsatz_start(lines)
        blocks = group_blocks(lines, umsatz_start)

        trades = []
        income = []
        expenses = []

        for block in blocks:
            parsed = parse_block(block)
            if parsed is None:
                continue

            t = parsed.pop('__type')
            if t == 'trade':
                trades.append(parsed)
            elif t == 'income':
                income.append(parsed)
            elif t == 'expense':
                expenses.append(parsed)

        result = {
            'period': {'from': period_from, 'to': period_to},
            'cashBalance': cash_balance,
            'trades': trades,
            'income': income,
            'expenses': expenses,
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
