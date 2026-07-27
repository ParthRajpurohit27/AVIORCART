#!/usr/bin/env python3
"""
Bulk-updates the WhatsApp phone number used in:
  - assets/layout.js (floating WhatsApp button, shown on every page)
  - every products/<handle>.html "💬 Order via WhatsApp" link

Usage:
  python3 update-whatsapp-number.py 91XXXXXXXXXX

The number must be in international format with no "+", spaces or dashes
(e.g. 919876543210 for an Indian number starting 98765 43210).
Run from the repo root.
"""
import re
import sys
import glob

OLD_NUMBER = "919425619133"

def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d{10,15}", sys.argv[1]):
        print("Usage: python3 update-whatsapp-number.py 91XXXXXXXXXX")
        print("(digits only, country code + number, no + or spaces)")
        sys.exit(1)

    new_number = sys.argv[1]
    files = ["assets/layout.js"] + sorted(glob.glob("products/*.html"))
    changed = 0

    for path in files:
        try:
            content = open(path, encoding="utf-8").read()
        except FileNotFoundError:
            continue
        if OLD_NUMBER not in content:
            continue
        content = content.replace(OLD_NUMBER, new_number)
        open(path, "w", encoding="utf-8").write(content)
        changed += 1

    print(f"Replaced {OLD_NUMBER} -> {new_number} in {changed} file(s).")
    print("Don't forget to also update the phone number shown in:")
    print("  - assets/layout.js footer contact block (📞 line)")
    print("  - contact.html")
    print("  - privacy-policy.html / terms-and-conditions.html / refund-policy.html / shipping-policy.html")
    print("(these show the number as text, not a wa.me link, so review MANUAL-CONTACT-DETAILS.md)")

if __name__ == "__main__":
    main()
