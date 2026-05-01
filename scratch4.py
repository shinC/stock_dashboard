import requests
import json

def test_naver_autocomplete(query):
    url = f"https://m.stock.naver.com/front-api/search/autoComplete?query={query}&target=stock,index,marketindicator,coin,ipo,fund"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))

test_naver_autocomplete("애플")
test_naver_autocomplete("컴퍼스")
