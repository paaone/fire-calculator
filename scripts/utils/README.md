# Fire Calculator Utilities

This directory contains utility scripts for the Fire Calculator project.

## decode_url.py

A comprehensive utility for decoding Fire Calculator URLs and extracting parameter values.

### Usage

#### Basic Usage (Human-readable output)
```bash
python decode_url.py "http://localhost:5173/?m=india&i=50000000&s=3000000..."
```

#### JSON Output
```bash
python decode_url.py --format json "http://localhost:5173/?m=india&i=50000000..."
```

#### Generate API Defaults Code
```bash
python decode_url.py --format api-defaults "http://localhost:5173/?m=india&i=50000000..."
```

### Features

- **Parameter Decoding**: Converts short URL parameters (m, i, s, y, etc.) to descriptive names
- **Currency Formatting**: Automatically formats amounts with appropriate currency symbols (₹ for India, $ for US)
- **Spending Categories**: Extracts and displays detailed spending breakdowns from the `x` parameter
- **Multiple Output Formats**: 
  - `human`: User-friendly formatted output (default)
  - `json`: Machine-readable JSON format
  - `api-defaults`: Python code for MarketDefaults configuration
- **Error Handling**: Gracefully handles malformed URLs and parameters

### Example Output

```
=== Fire Calculator URL Parameters ===

Basic Parameters:
  Market: india
  Initial Amount: ₹50,000,000
  Annual Spending: ₹3,000,000
  Years: 30
  Still Working: True
  Annual Contribution: ₹200,000
  Expected Real Return: 10.0%
  Start Delay: 5 years
  Current Age: 35
  Inflation: 6.0%
  Strategy: fixed
  Value Units: real

Spending Categories:
  - Housing & utilities: ₹900,000 (inflation: 3%)
  - Groceries & dining: ₹540,000 (inflation: 3%)
  - Transportation: ₹300,000 (inflation: 3%)
  - Healthcare: ₹360,000 (inflation: 6%)
  - Education & personal growth: ₹210,000 (inflation: 6%)
  - Travel & experiences: ₹300,000 (inflation: 3%)
  - Family & childcare: ₹240,000 (inflation: 3%)
  - Everything else: ₹150,000 (inflation: 3%)

Total Spending: ₹3,000,000
```

### Use Cases

1. **Configuration Analysis**: Extract parameter values from shared URLs
2. **Default Generation**: Generate API default configurations from user scenarios
3. **Testing**: Create test data from real user configurations
4. **Documentation**: Generate examples and use cases
5. **Debugging**: Analyze URL parameters during development