import random
import csv
from datetime import datetime
import calendar

random.seed(42)
start_year = 1926
end_year = 2023
mean_monthly = 0.0067
std_monthly = 0.045

with open('data/sp500_monthly.csv','w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['date','real_return'])
    for year in range(start_year, end_year+1):
        for month in range(1,13):
            last_day = calendar.monthrange(year, month)[1]
            date = datetime(year, month, last_day)
            ret = random.gauss(mean_monthly, std_monthly)
            writer.writerow([date.strftime('%Y-%m-%d'), f'{ret:.5f}'])
