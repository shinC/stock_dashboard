import yfinance as yf
import pytz
from datetime import datetime

ticker = '^IXIC'
df = yf.download(ticker, period='7d', interval='1d', progress=False)
print("DF index:")
print(df.index)
print("DF tail:")
print(df.tail(3))

ny_tz = pytz.timezone('America/New_York')
now_ny = datetime.now(ny_tz)
print("NY time:", now_ny)
print("NY date:", now_ny.date())
print("NY hour:", now_ny.hour)
