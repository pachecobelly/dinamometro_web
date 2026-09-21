import serial
import csv
import time

# Configurações da Porta Serial
PORTA = 'COM6' # Altere para a porta do seu hardware
BAUD_RATE = 921600

print(f"Iniciando conexão na porta {PORTA} a {BAUD_RATE} bps...")

try:
    esp32 = serial.Serial(PORTA, BAUD_RATE)
    
    # Gera um nome de arquivo único com data e hora
    nome_arquivo = f"experimento_dinamometro_{time.strftime('%Y%m%d_%H%M%S')}.csv"
    
    with open(nome_arquivo, mode='w', newline='') as arquivo_csv:
        escritor = csv.writer(arquivo_csv, delimiter=';')
        escritor.writerow(['Tempo_ms', 'ADC_Bruto', 'Forca_kg'])
        
        print(f"Gravando dados em: {nome_arquivo}")
        print("-" * 50)
        print("Pressione Ctrl+C para encerrar o experimento e salvar o arquivo.")
        print("-" * 50)
        
        contador_tela = 0
        
        while True:
            if esp32.in_waiting > 0:
                linha = esp32.readline().decode('utf-8').strip()
                
                if linha:
                    dados = linha.split(',')
                    
                    if len(dados) == 3:
                        tempo, adc, forca_ponto = dados
                        
                        # Converte o separador decimal para o CSV
                        forca_virgula = forca_ponto.replace('.', ',')
                        
                        # SALVA NO ARQUIVO (1000 vezes por segundo)
                        escritor.writerow([tempo, adc, forca_virgula])
                        
                        # MOSTRA NA TELA (Apenas 10 vezes por segundo para não travar)
                        contador_tela += 1
                        if contador_tela >= 100:
                            # Formata a saída no terminal para ficar fácil de ler
                            print(f"Tempo: {tempo.zfill(5)} ms | ADC: {adc} | Força: {float(forca_ponto):.2f} kg")
                            contador_tela = 0 # Reseta o contador
                        
except KeyboardInterrupt:
    print("\n" + "=" * 50)
    print("Experimento finalizado com sucesso!")
    print(f"Todos os dados foram salvos em: {nome_arquivo}")
    print("=" * 50)
except Exception as e:
    print(f"\nErro na aquisição: {e}")
finally:
    if 'esp32' in locals() and esp32.is_open:
        esp32.close()
        print("Porta serial liberada.")