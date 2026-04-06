import asyncio
import httpx
from main import app
from app.models.models import Dataset, User
import uuid
import sys
from httpx import ASGITransport

async def run():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
        rand = uuid.uuid4().hex[:8]
        email = f'test_{rand}@example.com'
        res = await client.post('/api/v1/auth/register', json={'email': email, 'password': 'password', 'full_name': 'Test'})
        if res.status_code != 201: return print('Register failed', res.text)
        
        res = await client.post('/api/v1/auth/login', json={'email': email, 'password': 'password'})
        token = res.json()['access_token']
        
        try:
            res = await client.post('/api/v1/data/upload', files={'file': ('mock.csv', b'col1,col2\n1,2\n', 'text/csv')}, headers={'Authorization': f'Bearer {token}'})
            print(res.status_code, res.text)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(run())
