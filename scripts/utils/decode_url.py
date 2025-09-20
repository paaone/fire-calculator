#!/usr/bin/env python3
"""
URL Parameter Decoder Utility for Fire Calculator

This utility decodes Fire Calculator URLs and extracts parameter values for analysis,
testing, or configuration purposes.

Usage:
    python decode_url.py <url>
    python decode_url.py --help

Example:
    python decode_url.py "http://localhost:5173/?m=india&i=50000000&s=3000000..."
"""

import argparse
import urllib.parse
import json
import sys
from typing import Dict, Any, Optional


def decode_fire_calculator_url(url: str) -> Dict[str, Any]:
    """
    Decode a Fire Calculator URL and return structured parameter data.
    
    Args:
        url: The Fire Calculator URL to decode
        
    Returns:
        Dictionary containing decoded parameters and spending categories
    """
    try:
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        
        # Clean up the params (remove lists for single values)
        clean_params = {k: v[0] if len(v) == 1 else v for k, v in params.items()}
        
        # Map parameter names to friendly names
        param_mapping = {
            'm': 'market',
            'i': 'initial_amount',
            's': 'spending',
            'y': 'years',
            'sw': 'still_working',
            'ac': 'annual_contribution',
            'er': 'expected_real_return_pct',
            'sd': 'start_delay_years',
            'ia': 'income_amount',
            'isy': 'income_start_year',
            'idy': 'income_duration_years',
            'st': 'strategy_type',
            'inf': 'inflation_pct',
            'vu': 'value_units',
            'age': 'current_age',
            'np': 'num_paths',
            'bs': 'block_size'
        }
        
        result = {}
        
        # Decode basic parameters
        for short_name, long_name in param_mapping.items():
            if short_name in clean_params:
                value = clean_params[short_name]
                # Convert numeric values
                if short_name in ['i', 's', 'y', 'sw', 'ac', 'er', 'sd', 'ia', 'isy', 'idy', 'inf', 'age', 'np', 'bs']:
                    try:
                        if short_name == 'sw':  # Boolean conversion
                            value = bool(int(value))
                        elif short_name in ['er', 'inf']:  # Percentage values
                            value = float(value)
                        else:
                            value = int(value)
                    except ValueError:
                        pass  # Keep as string if conversion fails
                result[long_name] = value
        
        # Decode extended data (spending categories, etc.)
        if 'x' in clean_params:
            try:
                decoded_x = urllib.parse.unquote(clean_params['x'])
                x_data = json.loads(decoded_x)
                result['extended_data'] = x_data
                
                # Extract spending categories for easier access
                if 'spendingCategories' in x_data:
                    result['spending_categories'] = x_data['spendingCategories']
                    result['total_spending'] = sum(cat['amount'] for cat in x_data['spendingCategories'])
                
                if 'futureIncomes' in x_data:
                    result['future_incomes'] = x_data['futureIncomes']
                    
                if 'futureExpenses' in x_data:
                    result['future_expenses'] = x_data['futureExpenses']
                    
            except (json.JSONDecodeError, ValueError) as e:
                result['extended_data_error'] = str(e)
        
        return result
        
    except Exception as e:
        return {'error': f'Failed to decode URL: {str(e)}'}


def format_currency(amount: int, currency: str = 'INR') -> str:
    """Format currency amounts with appropriate symbols."""
    if currency == 'INR':
        return f'₹{amount:,}'
    elif currency == 'USD':
        return f'${amount:,}'
    else:
        return f'{amount:,}'


def print_decoded_params(data: Dict[str, Any]) -> None:
    """Print decoded parameters in a human-readable format."""
    if 'error' in data:
        print(f"Error: {data['error']}")
        return
    
    # Determine currency based on market
    currency = 'INR' if data.get('market') == 'india' else 'USD'
    
    print("=== Fire Calculator URL Parameters ===\n")
    
    # Basic parameters
    print("Basic Parameters:")
    print(f"  Market: {data.get('market', 'N/A')}")
    print(f"  Initial Amount: {format_currency(data.get('initial_amount', 0), currency)}")
    print(f"  Annual Spending: {format_currency(data.get('spending', 0), currency)}")
    print(f"  Years: {data.get('years', 'N/A')}")
    print(f"  Still Working: {data.get('still_working', 'N/A')}")
    print(f"  Annual Contribution: {format_currency(data.get('annual_contribution', 0), currency)}")
    print(f"  Expected Real Return: {data.get('expected_real_return_pct', 'N/A')}%")
    print(f"  Start Delay: {data.get('start_delay_years', 'N/A')} years")
    print(f"  Current Age: {data.get('current_age', 'N/A')}")
    print(f"  Inflation: {data.get('inflation_pct', 'N/A')}%")
    print(f"  Strategy: {data.get('strategy_type', 'N/A')}")
    print(f"  Value Units: {data.get('value_units', 'N/A')}")
    
    # Advanced parameters
    print(f"\nAdvanced Parameters:")
    print(f"  Monte Carlo Paths: {data.get('num_paths', 'N/A')}")
    print(f"  Block Size: {data.get('block_size', 'N/A')}")
    
    # Income parameters
    if data.get('income_amount', 0) > 0:
        print(f"\nFuture Income:")
        print(f"  Amount: {format_currency(data.get('income_amount', 0), currency)}")
        print(f"  Start Year: {data.get('income_start_year', 'N/A')}")
        print(f"  Duration: {data.get('income_duration_years', 'N/A')} years")
    
    # Spending categories
    if 'spending_categories' in data:
        print(f"\nSpending Categories:")
        for cat in data['spending_categories']:
            amount = cat['amount']
            print(f"  - {cat['label']}: {format_currency(amount, currency)} (inflation: {cat['inflation']}%)")
        print(f"\nTotal Spending: {format_currency(data.get('total_spending', 0), currency)}")
    
    # Future incomes and expenses
    if data.get('future_incomes'):
        print(f"\nFuture Incomes: {len(data['future_incomes'])} items")
    if data.get('future_expenses'):
        print(f"Future Expenses: {len(data['future_expenses'])} items")


def generate_api_defaults(data: Dict[str, Any]) -> str:
    """Generate Python code for API defaults based on decoded parameters."""
    if 'error' in data:
        return f"# Error: {data['error']}"
    
    currency = 'INR' if data.get('market') == 'india' else 'USD'
    market_name = data.get('market', 'unknown')
    
    code = f"""
# Generated defaults for {market_name} market
{market_name}_defaults = MarketDefaults(
    initial={data.get('initial_amount', 0)},
    spend={data.get('spending', 0)},
    years={data.get('years', 30)},
    inflation_pct={data.get('inflation_pct', 3.0)},
    expected_real_return_pct={data.get('expected_real_return_pct', 7.0)},
    still_working={data.get('still_working', False)},
    annual_contrib={data.get('annual_contribution', 0.0)},
    income_amount={data.get('income_amount', 0.0)},
    income_start_year={data.get('income_start_year', 0)},
    income_duration_years={data.get('income_duration_years', 0)},
    start_delay_years={data.get('start_delay_years', 0)},
)
"""
    return code.strip()


def main():
    parser = argparse.ArgumentParser(
        description="Decode Fire Calculator URLs and extract parameter values",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    parser.add_argument('url', help='Fire Calculator URL to decode')
    parser.add_argument('--format', choices=['human', 'json', 'api-defaults'], 
                       default='human', help='Output format (default: human)')
    parser.add_argument('--currency', help='Override currency symbol (INR, USD)')
    
    args = parser.parse_args()
    
    # Decode the URL
    data = decode_fire_calculator_url(args.url)
    
    # Output in requested format
    if args.format == 'json':
        print(json.dumps(data, indent=2))
    elif args.format == 'api-defaults':
        print(generate_api_defaults(data))
    else:  # human
        print_decoded_params(data)


if __name__ == "__main__":
    main()