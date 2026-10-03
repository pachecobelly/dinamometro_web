#include "driver/adc.h"
#include "esp_adc_cal.h"

// O pino GPIO 36 corresponde ao canal 0 do ADC1 no ESP32
#define CANAL_ADC ADC1_CHANNEL_0 
esp_adc_cal_characteristics_t adc_chars;

// Controle de tempo para amostragem rigorosa a 1000 Hz
unsigned long tempoAnterior = 0;
const unsigned long intervaloAmostragem = 1000; // microssegundos

// Variáveis e parâmetros do Filtro Passa-Baixa (EMA)
float forcaEMA = 0;
// ALFA: Ajuste a suavização. 
// 0.05 = Mais suave (corta mais vibração, mas fica um pouco mais lento)
// 0.10 ou 0.15 = Mais rápido (responde rápido, mas passa mais vibração da roldana)
const float alfa = 0.1; 

void setup() {
  // Baud rate em 115200 (configurado para corresponder ao script Python)
  Serial.begin(115200);
  
  // Configura a leitura (0 a 4095) e aplica o eFuse nativo do ESP32
  adc1_config_width(ADC_WIDTH_BIT_12);
  adc1_config_channel_atten(CANAL_ADC, ADC_ATTEN_DB_11);
  esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1121, &adc_chars);

  // Pausa para estabilização elétrica inicial do circuito
  delay(1000); 
}

void loop() {
  unsigned long tempoAtual = micros();
  
  if (tempoAtual - tempoAnterior >= intervaloAmostragem) {
    tempoAnterior = tempoAtual;
    
    // 1. Leitura instantânea do conversor analógico-digital
    uint32_t leituraBruta = adc1_get_raw(CANAL_ADC);
    
    // 2. Aplicação da Equação de Calibração (ESP32: R2 = 0.9894)
    float forcaBrutaKg = (leituraBruta - 2479.6) / 39.52;
    
    // Zera valores negativos causados por microflutuações da célula
    if (forcaBrutaKg < 0) {
      forcaBrutaKg = 0;
    }

    // 3. Aplicação do Filtro Passa-Baixa (EMA - Exponential Moving Average)
    forcaEMA = (alfa * forcaBrutaKg) + ((1.0 - alfa) * forcaEMA);

    // Evita valores residuais negativos na interface após a filtragem
    if (forcaEMA < 0) {
      forcaEMA = 0;
    }

    // 4. Envio dos dados pela porta serial (mantendo compatibilidade com o Python)
    Serial.print(millis());
    Serial.print(",");
    Serial.print(leituraBruta);
    Serial.print(",");
    Serial.println(forcaEMA, 2);
  }
}
