import serial
import csv
import time

# ATENÇÃO: Verifique a porta COM correta do seu ESP32
PORTA_SERIAL = 'COM6' 
BAUD_RATE = 115200
NOME_FICHEIRO = 'dados_dinamometro_esp32.csv'

try:
    # Inicializa a comunicação serial
    ser = serial.Serial(PORTA_SERIAL, BAUD_RATE, timeout=1)
    time.sleep(2) 
    
    print(f"Conectado ao ESP32 na porta {PORTA_SERIAL}.")
    print(f"Gravando dados no arquivo: {NOME_FICHEIRO}")
    print("Pressione Ctrl + C para parar a gravação.\n")

    # Abre o arquivo CSV configurado com separador ';'
    with open(NOME_FICHEIRO, mode='w', newline='') as ficheiro_csv:
        escritor = csv.writer(ficheiro_csv, delimiter=';')
        escritor.writerow(['Tempo(ms)', 'ADC_Bruto', 'Forca(kg)'])

        ser.reset_input_buffer()

        while True:
            if ser.in_waiting > 0:
                linha = ser.readline().decode('utf-8', errors='ignore').strip()
                
                if linha:
                    dados = linha.split(',')
                    
                    if len(dados) == 3:
                        # Substitui o ponto por vírgula na coluna de Força
                        dados[2] = dados[2].replace('.', ',')
                        
                        escritor.writerow(dados)
                        print(f"Tempo: {dados[0]}ms | ADC: {dados[1]} | Força: {dados[2]}kg")

except serial.SerialException:
    print(f"\nERRO: Não foi possível abrir a porta {PORTA_SERIAL}.")
    print("Verifique a conexão do ESP32 e se o Monitor Serial da IDE está fechado.")
except KeyboardInterrupt:
    print("\n\nGravação finalizada pelo usuário.")
finally:
    if 'ser' in locals() and ser.is_open:
        ser.close()
        print("Arquivo CSV salvo com sucesso!")