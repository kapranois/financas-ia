# banking_itau.py
import requests
import json
import base64
import hashlib
import time
from datetime import datetime, timedelta
import jwt
from cryptography.hazmat.primitives import serialization
import secrets

class ItauOpenBanking:
    def __init__(self, client_id, client_secret, certificate_path, private_key_path):
        self.client_id = client_id
        self.client_secret = client_secret
        self.certificate_path = certificate_path
        self.private_key_path = private_key_path
        self.base_url = "https://api.itau.com.br"
        self.auth_url = "https://sts.itau.com.br"
        self.access_token = None
        self.token_expires = None
        
    def generate_code_verifier(self):
        """Gera o code_verifier para PKCE"""
        token = secrets.token_urlsafe(32)
        return token
    
    def generate_code_challenge(self, code_verifier):
        """Gera o code_challenge para PKCE"""
        digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
        return base64.urlsafe_b64encode(digest).decode('utf-8').replace('=', '')
    
    def get_auth_url(self):
        """Gera URL de autorização para o usuário"""
        code_verifier = self.generate_code_verifier()
        code_challenge = self.generate_code_challenge(code_verifier)
        
        # Salva o code_verifier para uso posterior
        self.code_verifier = code_verifier
        
        auth_params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'scope': 'openid accounts transactions',
            'redirect_uri': 'http://localhost:5000/callback',
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
            'state': secrets.token_urlsafe(16)
        }
        
        query_string = '&'.join([f'{k}={v}' for k, v in auth_params.items()])
        return f"{self.auth_url}/authorize?{query_string}"
    
    def exchange_code_for_token(self, authorization_code):
        """Troca authorization code por access token"""
        token_url = f"{self.auth_url}/token"
        
        data = {
            'grant_type': 'authorization_code',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': authorization_code,
            'redirect_uri': 'http://localhost:5000/callback',
            'code_verifier': self.code_verifier
        }
        
        response = requests.post(token_url, data=data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.token_expires = datetime.now() + timedelta(seconds=token_data['expires_in'])
            return True
        else:
            print(f"❌ Erro na autenticação: {response.text}")
            return False
    
    def get_accounts(self):
        """Busca contas do usuário"""
        if not self.access_token or datetime.now() >= self.token_expires:
            print("❌ Token expirado ou não disponível")
            return None
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        accounts_url = f"{self.base_url}/open-banking/accounts/v1/accounts"
        response = requests.get(accounts_url, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Erro ao buscar contas: {response.text}")
            return None
    
    def get_transactions(self, account_id, from_date=None, to_date=None):
        """Busca transações de uma conta"""
        if not from_date:
            from_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not to_date:
            to_date = datetime.now().strftime('%Y-%m-%d')
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        transactions_url = f"{self.base_url}/open-banking/accounts/v1/accounts/{account_id}/transactions"
        params = {
            'fromBookingDate': from_date,
            'toBookingDate': to_date
        }
        
        response = requests.get(transactions_url, headers=headers, params=params)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Erro ao buscar transações: {response.text}")
            return None
