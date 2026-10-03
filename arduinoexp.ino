#include "driver/adc.h"
#include "esp_adc_cal.h"

// O pino GPIO 36 corresponde ao canal 0 do ADC1
#define CANAL_ADC ADC1_CHANNEL_0 
esp_adc_cal_characteristics_t adc_chars;

// Variáveis para garantir os 1000 Hz precisos
unsigned long tempoAnterior = 0;,
const unsigned long intervaloAmostragem = 1000; // 1000 microssegundos = 1 ms

void setup() {
  Serial.begin(921600); 
  
  adc1_config_width(ADC_WIDTH_BIT_12);
  adc1_config_channel_atten(CANAL_ADC, ADC_ATTEN_DB_11);
  esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1121, &adc_chars);
}

void loop() {
  unsigned long tempoAtual = micros();
  
  if (tempoAtual - tempoAnterior >= intervaloAmostragem) {
    tempoAnterior = tempoAtual; 
    
    // 1. Leitura do sinal bruto
    uint32_t leituraBruta = adc1_get_raw(CANAL_ADC);
    
    // 2. Aplicação da Equação de Calibração (x = (y - 2483.2) / 39.52)
    float forcaKg = (leituraBruta - 2483.2) / 39.52;
    
    // 3. Filtro de ruído no repouso: evita valores negativos se o ADC oscilar abaixo de 2483
    if (forcaKg < 0.0) {
      forcaKg = 0.0;
    }
    
    // 4. Envio dos dados via Serial (Formato: tempo_ms,adc_bruto,forca_kg)
    Serial.print(millis()); 
    Serial.print(",");
    Serial.print(leituraBruta);
    Serial.print(",");
    Serial.println(forcaKg, 2); // Envia com 2 casas decimais
  }
}
