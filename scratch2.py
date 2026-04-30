import yfinance as yf
import pytz
from datetime import datetime, timedelta
import pandas as pd

ticker = '^IXIC'
df = yf.download(ticker, period='7d', interval='1d', progress=False)

ny_tz = pytz.timezone('America/New_York')
now_ny = datetime.now(ny_tz)

if now_ny.hour < 16:
    max_final_date = now_ny.date() - timedelta(days=1)
else:
    max_final_date = now_ny.date()

print("NY time:", now_ny)
print("max_final_date:", max_final_date)

# We want the dataframe up to max_final_date
# The index is naive, so we can compare with pd.Timestamp(max_final_date)
# or convert to date
# It's better to just compare dates
max_final_ts = pd.Timestamp(max_final_date)

# timezone aware check just in case
if df.index.tz is not None:
    max_final_ts = max_final_ts.tz_localize(df.index.tz)

df_filtered = df[df.index <= max_final_ts]

print("Filtered DF tail:")
print(df_filtered.tail(3))
