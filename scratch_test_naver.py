import requests
import json

exchange = 'NASDAQ'
sort_types = ['amount', 'priceTop', 'trade_volume', 'total_value', 'accumulatedTradingValue', 'value']

for st in sort_types:
    url = f"https://m.stock.naver.com/front-api/worldstock/exchange/stock/list?stockExchangeType={exchange}&stockPriceSortType={st}&page=1&pageSize=5"
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        res = requests.get(url, headers=headers)
        data = res.json()
        print(f"Sort Type: {st}")
        if data.get('result') and data['result'].get('stocks'):
            for stock in data['result']['stocks']:
                print(f"  {stock['symbolCode']}: {stock['name']} - Value: {stock.get('accumulatedTradingValue')}")
        else:
            print("  No data or error")
    except Exception as e:
        print(f"  Error: {e}")
    print("-" * 20)
