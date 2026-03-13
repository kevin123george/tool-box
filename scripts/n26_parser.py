#!/usr/bin/env python3
"""
N26 PDF statement parser.
Usage: n26_parser.py <path_to_pdf>
Output: JSON array of transactions
"""
import sys, json, re
import pdfplumber

# N26 category → our ExpenseCategory/IncomeCategory mapping
EXPENSE_CATEGORY_MAP = {
    'bars': 'DINING_OUT',
    'restaurant': 'DINING_OUT',
    'lebensmittel': 'GROCERIES',
    'drogerie': 'GROCERIES',
    'supermarkt': 'GROCERIES',
    'transport': 'TRANSPORT',
    'verkehr': 'TRANSPORT',
    'shopping': 'OTHER',
    'bekleidung': 'CLOTHING',
    'freizeit': 'ENTERTAINMENT',
    'unterhaltung': 'ENTERTAINMENT',
    'gesundheit': 'PERSONAL_CARE',
    'medizin': 'PERSONAL_CARE',
    'reise': 'TRAVEL',
    'hotel': 'TRAVEL',
    'flug': 'TRAVEL',
    'miete': 'RENT',
    'wohnen': 'RENT',
    'strom': 'UTILITIES',
    'gas': 'UTILITIES',
    'internet': 'INTERNET',
    'telefon': 'INTERNET',
    'gym': 'GYM',
    'fitness': 'GYM',
    'sport': 'GYM',
    'kraftstoff': 'FUEL',
    'tanken': 'FUEL',
    'bildung': 'EDUCATION',
    'schule': 'EDUCATION',
    'spende': 'GIFTS',
    'geschenk': 'GIFTS',
    'abonnement': 'SUBSCRIPTIONS',
    'streaming': 'SUBSCRIPTIONS',
    'spotify': 'SUBSCRIPTIONS',
    'netflix': 'SUBSCRIPTIONS',
}

INCOME_KEYWORDS = ['gutschrift', 'eingang', 'gehalt', 'lohn', 'rückerstattung', 'erstattung', 'zinsen']

def parse_amount(amount_str):
    """Parse German format amount like '-55,00€' or '+1.234,56€'"""
    s = amount_str.replace('€', '').replace(' ', '').strip()
    negative = s.startswith('-')
    s = s.lstrip('+-')
    # Remove thousands separator (dot), replace decimal comma with dot
    s = s.replace('.', '').replace(',', '.')
    try:
        val = float(s)
        return -val if negative else val
    except:
        return None

def guess_category(category_line, payee, amount):
    """Map N26 category line to our enum."""
    text = (category_line + ' ' + payee).lower()

    if amount > 0:
        # Income
        for kw in INCOME_KEYWORDS:
            if kw in text:
                return 'INCOME', 'SALARY'
        return 'INCOME', 'OTHER'

    # Expense — check category keywords
    for kw, cat in EXPENSE_CATEGORY_MAP.items():
        if kw in text:
            return 'EXPENSE', cat

    # Default
    return 'EXPENSE', 'OTHER'

def parse_pdf(path):
    TRANSACTION_RE = re.compile(
        r'^(.+?)\s+(\d{2}\.\d{2}\.\d{4})\s+([+\-][\d.,]+€)$'
    )

    transactions = []

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue

            # Skip summary/disclaimer pages
            if 'Dein alter Kontostand' in text or 'Anmerkung' in text:
                continue

            lines = text.split('\n')
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                m = TRANSACTION_RE.match(line)
                if m:
                    payee = m.group(1).strip()
                    date_str = m.group(2)  # DD.MM.YYYY
                    amount_str = m.group(3)

                    amount = parse_amount(amount_str)
                    if amount is None:
                        i += 1
                        continue

                    # Look at next line for category
                    category_line = ''
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip()
                        # Category lines don't look like transaction lines
                        if not TRANSACTION_RE.match(next_line) and not next_line.startswith('IBAN') and not next_line.startswith('Wertstellung'):
                            category_line = next_line

                    tx_type, category = guess_category(category_line, payee, amount)

                    # Convert DD.MM.YYYY to ISO
                    parts = date_str.split('.')
                    iso_date = f"{parts[2]}-{parts[1]}-{parts[0]}"

                    transactions.append({
                        'payee': payee,
                        'date': iso_date,
                        'amount': abs(amount),
                        'type': tx_type,
                        'category': category,
                        'rawCategory': category_line,
                        'originalAmount': amount,
                    })
                i += 1

    return transactions

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: n26_parser.py <pdf_path>'}))
        sys.exit(1)

    try:
        transactions = parse_pdf(sys.argv[1])
        print(json.dumps({'transactions': transactions}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
