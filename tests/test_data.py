import unittest
import sys
import os

# src 폴더를 패스에 추가하여 모듈 임포트 가능하도록 설정
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from data_fetcher import get_daily_summary, get_intraday_data, get_us_top_stocks
from theme_analyzer import get_leading_themes

class TestDataFetcher(unittest.TestCase):
    def test_get_daily_summary(self):
        summary = get_daily_summary("KOSPI")
        self.assertIsNotNone(summary, "KOSPI summary should not be None")
        self.assertIn('close', summary)
        self.assertIn('change_pct', summary)

    def test_get_intraday_data(self):
        data = get_intraday_data("S&P 500")
        self.assertIsNotNone(data, "S&P 500 intraday data should not be None")
        # 빈 Series가 아니어야 함
        self.assertFalse(data.empty, "S&P 500 intraday data is empty")

    def test_get_leading_themes(self):
        themes = get_leading_themes()
        self.assertIsNotNone(themes, "Themes dataframe should not be None")
        self.assertFalse(themes.empty, "Themes dataframe is empty")
        self.assertIn('테마명', themes.columns)

    def test_get_us_top_stocks(self):
        data = get_us_top_stocks(exchange='NASDAQ', sort_type='up')
        self.assertIsNotNone(data, "US top stocks data should not be None")
        self.assertIn('result', data)
        self.assertIn('stocks', data['result'])
        self.assertGreater(len(data['result']['stocks']), 0, "Stocks list should not be empty")

if __name__ == '__main__':
    unittest.main()
