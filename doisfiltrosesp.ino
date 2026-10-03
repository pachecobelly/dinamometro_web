#include "driver/adc.h"
#include "esp_adc_cal.h"

// O pino GPIO 36 corresponde ao canal 0 do ADC1 no ESP32
#define CANAL_ADC ADC1_CHANNEL_0 
esp_adc_cal_characteristics_t adc_chars;

// Controlo de tempo para amostragem rigorosa a 1000 Hz
unsigned long tempoAnterior = 0;
const unsigned long intervaloAmostragem = 1000; // microssegundos

// Variáveis de memória para o Filtro Notch (60 Hz)
float ent_x1 = 0, ent_x2 = 0;
float sai_y1 = 0, sai_y2 = 0;

// Variáveis e parâmetros para o Filtro Passa-Baixa (EMA)
float forcaEMA = 0;
const float alfa = 0.05; // Ajuste entre 0.05 (mais suave) e 0.15 (mais rápido)

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

    // 3. PASSO 1 DA FILTRAGEM: Filtro Notch (60 Hz)
    float forcaNotch = (0.9939 * forcaBrutaKg) 
                     - (1.8482 * ent_x1) 
                     + (0.9939 * ent_x2) 
                     - (-1.8482 * sai_y1) 
                     - (0.9878 * sai_y2);

    // Atualiza a memória do filtro Notch
    ent_x2 = ent_x1;
    ent_x1 = forcaBrutaKg;
    sai_y2 = sai_y1;
    sai_y1 = forcaNotch;

    if (forcaNotch < 0) {
      forcaNotch = 0;
    }

    // 4. PASSO 2 DA FILTRAGEM: Filtro Passa-Baixa (EMA)
    // O sinal que entra no EMA é o sinal que acabou de sair do Notch
    forcaEMA = (alfa * forcaNotch) + ((1.0 - alfa) * forcaEMA);

    if (forcaEMA < 0) {
      forcaEMA = 0;
    }

    // 5. Envio dos dados pela porta serial (Tempo, ADC_Bruto, Forca_Final)
    Serial.print(millis());
    Serial.print(",");
    Serial.print(leituraBruta);
    Serial.print(",");
    Serial.println(forcaEMA, 2);
  }
}
