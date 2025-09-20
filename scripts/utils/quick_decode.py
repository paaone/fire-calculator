#!/usr/bin/env python3
import urllib.parse

# Key changes I can see in the URL:
# ac=2000000 (annual contribution increased from 200000 to 2000000)

url = "http://localhost:5173/?m=india&i=50000000&s=3000000&y=30&sw=1&ac=2000000&er=10&sd=5&ia=0&isy=0&idy=0&st=fixed&inf=6&vu=real&age=35&np=1000&bs=12"

parsed = urllib.parse.urlparse(url)
params = urllib.parse.parse_qs(parsed.query)

print("New Baseline Parameters:")
print(f"Market: {params.get('m', [''])[0]}")
print(f"Initial Amount: ₹{int(params.get('i', ['0'])[0]):,}")
print(f"Spending: ₹{int(params.get('s', ['0'])[0]):,}")
print(f"Years: {params.get('y', [''])[0]}")
print(f"Still Working: {bool(int(params.get('sw', ['0'])[0]))}")
print(f"Annual Contribution: ₹{int(params.get('ac', ['0'])[0]):,}")  # This changed!
print(f"Expected Real Return: {params.get('er', [''])[0]}%")
print(f"Start Delay: {params.get('sd', [''])[0]} years")
print(f"Inflation: {params.get('inf', [''])[0]}%")