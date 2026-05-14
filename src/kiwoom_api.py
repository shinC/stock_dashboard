import os
import requests
import json
import time
from dotenv import load_dotenv

load_dotenv()

class KiwoomAPI:
    def __init__(self):
        self.app_key = os.getenv("KIWOOM_APP_KEY")
        self.secret_key = os.getenv("KIWOOM_SECRET_KEY")
        self.account_no = os.getenv("KIWOOM_ACCOUNT_NO")
        # 운영 환경 도메인
        self.base_url = "https://api.kiwoom.com"
        self.access_token = None
        self.token_expiry = 0

    def get_access_token(self):
        """OAuth2 토큰을 발급받거나 기존 토큰을 반환합니다."""
        if self.access_token and time.time() < self.token_expiry:
            return self.access_token

        # 토큰 발급 엔드포인트: /oauth2/token
        url = f"{self.base_url}/oauth2/token"
        data = {
            "grant_type": "client_credentials",
            "appkey": self.app_key,
            "secretkey": self.secret_key
        }
        
        try:
            res = requests.post(url, json=data, timeout=5)
            if res.status_code == 200:
                result = res.json()
                # 가이드에 따르면 필드명이 'token'임
                self.access_token = result.get("token")
                if not self.access_token:
                    # 혹시 몰라 'access_token'도 확인
                    self.access_token = result.get("access_token")
                
                if not self.access_token:
                    return None
                
                # expires_in은 보통 초 단위
                expires_in = int(result.get("expires_in", 86400))
                self.token_expiry = time.time() + expires_in - 60
                return self.access_token
            else:
                return None
        except Exception as e:
            return None

    def get_stock_info(self, ticker):
        """
        ka10001 (주식기본정보요청)을 사용하여 종목의 상세 정보를 가져옵니다.
        """
        return self._request_tr("ka10001", {"stk_cd": ticker})

    def _request_tr(self, tr_id, input_data):
        """ka10001 전용 엔드포인트 시도"""
        token = self.get_access_token()
        if not token:
            return None

        # 가이드상 ka10001의 엔드포인트는 /api/dostk/stkinfo 일 수 있음
        url = f"{self.base_url}/api/dostk/stkinfo"
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": f"Bearer {token}",
            "api-id": tr_id
        }
        
        # Body는 단순 종목코드 포함
        body = input_data

        try:
            res = requests.post(url, headers=headers, json=body, timeout=5)
            if res.status_code == 200:
                data = res.json()
                # 응답에서 'output' 필드 추출
                return data.get("output")
            else:
                # 404 등이 나면 범용 엔드포인트 /v1/request로 fallback
                return self._fallback_request_tr(tr_id, input_data)
        except Exception as e:
            return self._fallback_request_tr(tr_id, input_data)

    def _fallback_request_tr(self, tr_id, input_data):
        """범용 엔드포인트 /v1/request 시도"""
        token = self.get_access_token()
        url = f"{self.base_url}/v1/request"
        headers = {
            "Content-Type": "application/json;charset=UTF-8",
            "Authorization": f"Bearer {token}",
            "api-id": tr_id
        }
        body = {
            "header": {"tr_id": tr_id, "cust_id": "", "cust_type": "P"},
            "input": input_data
        }
        try:
            res = requests.post(url, headers=headers, json=body, timeout=5)
            if res.status_code == 200:
                return res.json().get("output")
            return None
        except:
            return None

if __name__ == "__main__":
    api = KiwoomAPI()
    info = api.get_stock_info("005930") # 삼성전자
    print(json.dumps(info, indent=2, ensure_ascii=False))
