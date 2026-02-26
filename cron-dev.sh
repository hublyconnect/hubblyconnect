#!/bin/bash

# Configurações
URL="http://localhost:3000/api/cron/process-queue"
SECRET="hublyconnect@" 

echo "🤖 INICIANDO O ROBÔ DE AGENDAMENTO (DEV MODE)"
echo "------------------------------------------------"
echo "Alvo: $URL"
echo "Intervalo: 60 segundos"
echo "------------------------------------------------"

while true; do
  echo "Wait..."
  # Tenta processar a fila
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $SECRET" "$URL")
  
  if [ "$STATUS" -eq 200 ]; then
     echo "[$(date +%T)] ✅ Cron rodou com sucesso (200 OK)"
  else
     echo "[$(date +%T)] ❌ Erro ao rodar Cron (Status: $STATUS)"
  fi

  echo "💤 Dormindo 60s..."
  sleep 60
done
