#!/usr/bin/env python3
import requests
import mysql.connector
import os
import sys

# Configurações
API_URL = 'https://api.sms24h.org/stubs/handler_api'
API_TOKEN = '5115b2c78832b7f8a5150084c81f8734'
API_ID = 2
MARKUP_PERCENTAGE = 100

# Conectar ao banco
db_url = os.environ.get('DATABASE_URL', '')
# Parse DATABASE_URL: mysql://user:pass@host:port/dbname
parts = db_url.replace('mysql://', '').split('@')
user_pass = parts[0].split(':')
host_db = parts[1].split('/')
host_port = host_db[0].split(':')

conn = mysql.connector.connect(
    host=host_port[0],
    port=int(host_port[1]) if len(host_port) > 1 else 3306,
    user=user_pass[0],
    password=user_pass[1],
    database=host_db[1].split('?')[0]
)
cursor = conn.cursor(dictionary=True)

print('🚀 Conectado ao banco de dados')
print('📡 Buscando preços da API 2...')

# Buscar preços
response = requests.get(f'{API_URL}?api_key={API_TOKEN}&action=getPrices&country=73')
prices_data = response.json()

imported = 0
updated = 0
services_created = 0

print('🔄 Processando serviços...\n')

# Buscar país Brasil
cursor.execute('SELECT * FROM countries WHERE smshubId = 73 LIMIT 1')
country = cursor.fetchone()

if not country:
    print('⚠️  País Brasil não encontrado')
    sys.exit(1)

country_id = country['id']

for country_code, country_data in prices_data.items():
    for service_code, service_info in country_data.items():
        # service_info é um dict com 'cost' e 'count'
        if not isinstance(service_info, dict) or 'cost' not in service_info:
            continue
        
        smshub_price = round(float(service_info['cost']) * 100)
        quantity = service_info['count']
        our_price = smshub_price + round(smshub_price * (MARKUP_PERCENTAGE / 100))
        
        # Buscar ou criar serviço
        cursor.execute('SELECT * FROM services WHERE smshubCode = %s LIMIT 1', (service_code,))
        service = cursor.fetchone()
        
        if not service:
            # Criar serviço
            cursor.execute('''
                INSERT INTO services (smshubCode, name, category, active, markupPercentage, markupFixed, createdAt)
                VALUES (%s, %s, %s, 1, 0, 0, NOW())
            ''', (service_code, f'Service {service_code}', 'Other'))
            conn.commit()
            
            cursor.execute('SELECT * FROM services WHERE smshubCode = %s LIMIT 1', (service_code,))
            service = cursor.fetchone()
            services_created += 1
        
        if not service:
            continue
        
        service_id = service['id']
        
        # Verificar se já existe
        cursor.execute('''
            SELECT id FROM prices 
            WHERE countryId = %s AND serviceId = %s AND apiId = %s
            LIMIT 1
        ''', (country_id, service_id, API_ID))
        
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute('''
                UPDATE prices 
                SET smshubPrice = %s, ourPrice = %s, quantityAvailable = %s, lastSync = NOW()
                WHERE id = %s
            ''', (smshub_price, our_price, quantity, existing['id']))
            updated += 1
        else:
            cursor.execute('''
                INSERT INTO prices (apiId, countryId, serviceId, smshubPrice, ourPrice, quantityAvailable, lastSync, createdAt)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
            ''', (API_ID, country_id, service_id, smshub_price, our_price, quantity))
            imported += 1
        
        conn.commit()

conn.close()

print('\n✅ Importação concluída!')
print(f'   - Preços importados: {imported}')
print(f'   - Preços atualizados: {updated}')
print(f'   - Serviços criados: {services_created}')
print(f'   - Total: {imported + updated}')
