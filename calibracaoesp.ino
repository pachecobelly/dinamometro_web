#include "driver/adc.h"
#include "esp_adc_cal.h"

// O pino GPIO 36 corresponde ao canal 0 do ADC1
#define CANAL_ADC ADC1_CHANNEL_0 
esp_adc_cal_characteristics_t adc_chars;

// Variáveis para garantir os 1000 Hz precisos sem usar delay()
unsigned long tempoAnterior = 0;
const unsigned long intervaloAmostragem = 1000; // 1000 microssegundos = 1 ms

void setup() {
  // ATENÇÃO: Esta é a exata velocidade configurada no seu Node.js e Python
  Serial.begin(921600); 
  
  // Configura a leitura (0 a 4095)
  adc1_config_width(ADC_WIDTH_BIT_12);
  adc1_config_channel_atten(CANAL_ADC, ADC_ATTEN_DB_11);
  
  // Aplica o seu Vref de 1121 mV extraído do eFuse
  esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1121, &adc_chars);
}

void loop() {
  unsigned long tempoAtual = micros();
  
  // Condição que trava a execução em exatos 1000 Hz
  if (tempoAtual - tempoAnterior >= intervaloAmostragem) {
    tempoAnterior = tempoAtual; 
    
    // Faz a leitura instantânea do sinal da célula de carga
    uint32_t leituraBruta = adc1_get_raw(CANAL_ADC);

    // Aplica a equação de calibração do TCC (R2 = 0.9894)
    float forcaKg = (leituraBruta - 2479.6) / 39.52;
    
    // Se por acaso a balança oscilar um pouco para baixo de 0kg, trava em 0
    if (forcaKg < 0) {
        forcaKg = 0;
    }
    
    // Imprime no formato que o Python e o Node.js esperam (Tempo,ADC,Forca)
    Serial.print(millis()); 
    Serial.print(",");
    Serial.print(leituraBruta);
    Serial.print(",");
    Serial.println(forcaKg, 2); // Envia a força com 2 casas decimais e quebra a linha
  }
}

