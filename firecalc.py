import csv
import argparse

def load_returns(path):
    returns = []
    with open(path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            returns.append(float(row['real_return']))
    return returns

def run_simulation(initial_balance, annual_spending, years, returns):
    months = years * 12
    outcomes = []
    for start in range(len(returns) - months + 1):
        balance = initial_balance
        for m in range(months):
            balance *= 1 + returns[start + m]
            if (m + 1) % 12 == 0:
                balance -= annual_spending
            if balance <= 0:
                balance = 0
                break
        outcomes.append(balance)
    success = sum(1 for b in outcomes if b > 0) / len(outcomes) * 100
    return success, outcomes


def main():
    parser = argparse.ArgumentParser(description="Simple FIRE simulation using historical returns")
    parser.add_argument('--initial', type=float, default=1000000, help='Initial portfolio balance')
    parser.add_argument('--spend', type=float, default=40000, help='Annual spending')
    parser.add_argument('--years', type=int, default=30, help='Duration of retirement in years')
    parser.add_argument('--data', default='data/market_monthly_real.csv', help='CSV file with monthly real returns')
    args = parser.parse_args()

    returns = load_returns(args.data)
    success, outcomes = run_simulation(args.initial, args.spend, args.years, returns)

    print(f"Success rate: {success:.1f}% over {len(outcomes)} historical periods")

if __name__ == '__main__':
    main()
