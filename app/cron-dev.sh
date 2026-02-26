#!/bin/bash

# Configurações
URL="http://localhost:3000/api/cron/process-queue"
SECRET="hublyconnect@" # Sua senha do .env.local

echo "🤖 INICIANDO O ROBÔ DE AGENDAMENTO (DEV MODE)"
echo "------------------------------------------------"
echo "URL Alvo: $URL"
echo "Intervalo: 60 segundos"
echo "------------------------------------------------"

while true; do
  echo "\n[$(date +%T)] ⏰ Verificando fila de posts..."
  
  # Dispara a requisição e mostra apenas o código HTTP e resposta
  response=$(curl -s -w "\nHTTP Status: %{http_code}" -H "Authorization: Bearer $SECRET" $URL)
  
  echo "Resposta: $response"
  echo "------------------------------------------------"
  echo "💤 Dormindo 60s..."
  sleep 60
done