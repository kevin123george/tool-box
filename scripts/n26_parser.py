#!/usr/bin/env python3
"""
N26 PDF statement parser.
Usage: n26_parser.py <path_to_pdf>
Output: JSON { transactions: [...] }

N26 transaction block structure (one block per transaction):
  {Payee} {DD.MM.YYYY} {±amount}€        ← transaction line (payee may wrap to next line)
  Mastercard • {category}                 ← OR: Lastschriften / Gutschriften / Belastungen / Round-up
  [optional IBAN, reference, other lines]
  Wertstellung {DD.MM.YYYY}
"""
import sys
import json
import re
import pdfplumber

# Matches a transaction line: anything + date + signed amount€
TX_RE = re.compile(r'^(.+?)\s+(\d{2}\.\d{2}\.\d{4})\s+([+\-]\d[\d.]*,\d{2})€\s*$')

# Page lines to skip unconditionally
SKIP_PREFIXES = (
    'Vorläufiger Kontoauszug', 'Kontoauszug',
    'Zusammenfassung', 'Beschreibung Verbuchungsdatum',
    'Dein alter Kontostand', 'Ausgehende Transaktionen',
    'Einkommende Transaktionen', 'Dein neuer Kontostand',
    'KEVIN GEORGE', 'Erstellt am', 'Anmerkung',
    'Es kann zu', 'Dein Guthaben', 'Dein N26',
    'entschädigungsfähig', 'Wertstellung',
    'IBAN:', 'BIC:',
)
PAGE_NUM_RE = re.compile(r'^\d+ / \d+$')
DATE_RANGE_RE = re.compile(r'^\d{2}\.\d{2}\.\d{4} bis \d{2}\.\d{2}\.\d{4}$')

# N26 Mastercard categories → our enum
MASTERCARD_CAT_MAP = {
    'Wohnen & Energie':       'UTILITIES',
    'Lebensmittel':           'GROCERIES',
    'Bars & Restaurants':     'DINING_OUT',
    'Shopping':               'CLOTHING',
    'Gesundheit & Drogerien': 'PERSONAL_CARE',
    'Transport & Auto':       'TRANSPORT',
    'Freizeit':               'ENTERTAINMENT',
    'Reisen':                 'TRAVEL',
    'Bildung':                'EDUCATION',
    'Tanken':                 'FUEL',
    'Abonnements':            'SUBSCRIPTIONS',
}

# Payee keyword → override category (case-insensitive)
PAYEE_OVERRIDES = {
    'miete':   'RENT',
    'miet':    'RENT',
    'rent':    'RENT',
    'gym':     'GYM',
    'fitness': 'GYM',
    'spotify': 'SUBSCRIPTIONS',
    'netflix': 'SUBSCRIPTIONS',
    'db ':     'TRANSPORT',
    'bahn':    'TRANSPORT',
    'mvv':     'TRANSPORT',
    'mvg':     'TRANSPORT',
}


def is_skip(line):
    if not line:
        return True
    if PAGE_NUM_RE.match(line) or DATE_RANGE_RE.match(line):
        return True
    for p in SKIP_PREFIXES:
        if line.startswith(p):
            return True
    return False


def is_category_line(line):
    return (
        line.startswith('Mastercard •') or
        line in ('Lastschriften', 'Gutschriften', 'Belastungen', 'Round-up')
    )


def parse_amount(s):
    """'+1.234,56' or '-3,50' → float"""
    return float(s.replace('.', '').replace(',', '.'))


def parse_date(s):
    """'DD.MM.YYYY' → 'YYYY-MM-DD'"""
    d, m, y = s.split('.')
    return f'{y}-{m}-{d}'


def map_category(raw_cat, payee, tx_type):
    if tx_type == 'INCOME':
        lp = payee.lower()
        if any(k in lp for k in ('gehalt', 'lohn', 'salary')):
            return 'SALARY'
        if any(k in lp for k in ('divid', 'zinsen', 'interest')):
            return 'DIVIDEND'
        return 'OTHER'

    # Mastercard category
    if raw_cat.startswith('Mastercard •'):
        n26_cat = raw_cat[len('Mastercard • '):]
        if n26_cat in MASTERCARD_CAT_MAP:
            return MASTERCARD_CAT_MAP[n26_cat]

    # Lastschriften / Belastungen — check payee for hints
    lp = payee.lower()
    for kw, cat in PAYEE_OVERRIDES.items():
        if kw in lp:
            return cat

    return 'OTHER'


def extract_lines(pdf_path):
    """Extract all lines from pages that contain transactions (skip summary pages)."""
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if not text:
                continue
            # Pages 5+ are summary/disclaimer — no transactions
            if 'Dein alter Kontostand' in text or 'Anmerkung' in text:
                continue
            lines.extend(text.split('\n'))
    return lines


def parse_pdf(pdf_path):
    lines = extract_lines(pdf_path)
    transactions = []
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        m = TX_RE.match(line)
        if not m:
            i += 1
            continue

        payee = m.group(1).strip()
        date_str = m.group(2)
        amount_str = m.group(3)
        i += 1

        # Check for wrapped payee continuation (e.g. "AMERICAN EXPRESS... (Germany" + "branch)")
        if i < len(lines):
            nxt = lines[i].strip()
            if nxt and not TX_RE.match(nxt) and not is_skip(nxt) and not is_category_line(nxt):
                payee = payee + ' ' + nxt
                i += 1

        # Read category line
        raw_cat = ''
        if i < len(lines) and is_category_line(lines[i].strip()):
            raw_cat = lines[i].strip()
            i += 1

        amount = parse_amount(amount_str)

        # Determine type from sign
        if amount_str.startswith('+') or raw_cat == 'Gutschriften':
            tx_type = 'INCOME'
        else:
            tx_type = 'EXPENSE'

        category = map_category(raw_cat, payee, tx_type)

        transactions.append({
            'payee': payee,
            'date': parse_date(date_str),
            'amount': abs(amount),
            'originalAmount': amount,
            'type': tx_type,
            'category': category,
            'rawCategory': raw_cat,
        })

    return transactions


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: n26_parser.py <pdf_path>'}))
        sys.exit(1)

    try:
        txs = parse_pdf(sys.argv[1])
        print(json.dumps({'transactions': txs}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
