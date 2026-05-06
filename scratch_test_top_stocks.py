import requests
import json

def test_url(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    try:
        res = requests.get(url, headers=headers, timeout=5)
        print(f"URL: {url}")
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            if 'result' in data:
                result = data['result']
                if isinstance(result, dict):
                    print(f"Market Status: {result.get('marketStatus')}")
                    stocks = result.get('stocks', [])
                    print(f"Stocks count: {len(stocks)}")
                    if stocks:
                        print(f"First stock: {stocks[0].get('name')} ({stocks[0].get('symbolCode')})")
                else:
                    print(f"Items count: {len(result)}")
        print("-" * 20)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_url("https://m.stock.naver.com/front-api/worldstock/exchange/stock/list?stockExchangeType=NASDAQ&stockPriceSortType=up&page=1&pageSize=50")
