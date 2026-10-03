import serial
import csv
import time
import sys

# ATENÇÃO: Altere 'COM7' para a porta onde o seu Arduino está conectado
PORTA_SERIAL = 'COM7' 
BAUD_RATE = 115200
NOME_FICHEIRO = 'dados_dinamometro.csv'

try:
    # Inicializa a comunicação serial
    ser = serial.Serial(PORTA_SERIAL, BAUD_RATE, timeout=1)
    # Dá um breve tempo para o Arduino reiniciar após a conexão
    time.sleep(2) 
    
    print(f"Conectado ao Arduino na porta {PORTA_SERIAL}.")
    print(f"A gravar os dados no ficheiro: {NOME_FICHEIRO}")
    print("Pressione Ctrl + C no terminal para parar a gravação e fechar o ficheiro.\n")

    # Abre o ficheiro CSV em modo de escrita ('w')
    with open(NOME_FICHEIRO, mode='w', newline='') as ficheiro_csv:
        # Configura o separador de colunas do CSV para ';' (padrão do Excel no Brasil)
        escritor = csv.writer(ficheiro_csv, delimiter=';')
        
        # Escreve o cabeçalho das colunas no ficheiro
        escritor.writerow(['Tempo(ms)', 'ADC_Bruto', 'Forca(kg)'])

        # Limpa qualquer "lixo" que estivesse na memória da porta serial
        ser.reset_input_buffer()

        while True:
            if ser.in_waiting > 0:
                # Lê a linha, descodifica para texto e remove espaços ocultos (\r\n)
                linha = ser.readline().decode('utf-8', errors='ignore').strip()
                
                if linha:
                    # O Arduino envia os dados separados por vírgula
                    dados = linha.split(',')
                    
                    # Garante que recebeu exatamente as 3 variáveis antes de gravar
                    if len(dados) == 3:
                        # Substitui o ponto por vírgula na variável de Força para o padrão decimal PT-BR
                        dados[2] = dados[2].replace('.', ',')
                        
                        escritor.writerow(dados)
                        # Imprime no terminal para você acompanhar em tempo real
                        print(f"Gravado -> Tempo: {dados[0]}ms | ADC: {dados[1]} | Força: {dados[2]}kg")

except serial.SerialException:
    print(f"\nERRO: Não foi possível abrir a porta {PORTA_SERIAL}.")
    print("Verifique se o Arduino está ligado e se não tem o Monitor Serial da IDE aberto em simultâneo.")
except KeyboardInterrupt:
    print("\n\nGravação interrompida manualmente.")
finally:
    # Garante que a porta serial é fechada corretamente ao sair
    if 'ser' in locals() and ser.is_open:
        ser.close()
        print("Porta serial fechada em segurança. Ficheiro CSV guardado com sucesso!")