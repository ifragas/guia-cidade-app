# 🌿 Guia Turístico de Riozinho (Expo / React Native)

Aplicativo oficial de turismo ecológico e comercial do município de **Riozinho / RS**, desenvolvido com foco em alta performance, usabilidade moderna e resiliência offline. O app conecta visitantes e moradores a cascatas, trilhas, campings, acomodações e restaurantes locais com geolocalização e dados em tempo real.

---

## 🚀 Funcionalidades e Diferenciais Tecnológicos

1. **Modo Escuro (Dark Mode) Nativo Completo**
   - Suporte integrado em todas as telas, cabeçalhos, cartões, modais e barra de navegação com transição suave baseada no contexto do sistema/app.

2. **Resiliência Offline com Cache Local (`AsyncStorage`)**
   - Sistema inteligente de cache que armazena os dados das APIs locais. Se o visitante estiver numa zona sem sinal (como trilhas e cascatas profundas), o aplicativo carrega instantaneamente os dados salvos e exibe um banner indicativo de modo offline.

3. **Previsão do Meteorologia em Tempo Real (Open-Meteo API)**
   - Widget meteorológico integrado no topo da tela inicial que consome dados climáticos geolocalizados de Riozinho sem necessidade de chaves de API pagas.

4. **Filtro Avançado "Aberto Agora" & Validação de Horários**
   - Utilitário inteligente (`ScheduleHelper`) que interpreta dinamicamente as strings de horários da API e valida em tempo real se o estabelecimento está aberto ou fechado, exibindo badges dinâmicos e permitindo filtragem instantânea na listagem.

5. **Navegação Multimapas Direta**
   - Integração nativa com seletores de rotas: o utilizador pode escolher se deseja navegar até o destino utilizando o **Google Maps**, **Waze** ou **Apple Maps**.

6. **Geolocalização & Proximidade**
   - Cálculo automático da distância em quilómetros a partir da posição atual do utilizador e ordenação por proximidade (`Mais Próximos`).

7. **Sistema de Favoritos & Partilha Social**
   - Gestão local de favoritos e atalhos rápidos para partilha de locais via nativa do sistema operativo.

---

## 🛠️ Tecnologias e Bibliotecas Utilizadas

- **React Native** (`v0.78.0`)
- **Expo SDK** (`v57`)
- **Expo Router / React Navigation** (Navegação por Abas e Stacks)
- **AsyncStorage** (Cache local de dados offline)
- **Expo Image** (Otimização avançada de imagens e cache em disco/memória)
- **Expo Location** (Geolocalização via GPS)
- **i18next** (Suporte a internacionalização / múltiplos idiomas)
- **Open-Meteo API & APIs REST customizadas**

---

## 📱 Estrutura do Projeto

```text
guia-cidade-app/
│
├── assets/                  # Imagens, fontes e ícones locais
├── src/
│   ├── components/          # Componentes reutilizáveis
│   ├── screens/             # Ecrãs principais (Home, Detalhes, Restaurantes, Acomodacoes, Favoritos)
│   ├── services/            # Serviços de integração (WeatherService)
│   ├── utils/               # Helpers essenciais (CacheHelper, ScheduleHelper, MapHelper, LocationHelper, FavoritosHelper)
│   └── locales/             # Ficheiros de tradução i18n
│
├── App.js                   # Ponto de entrada e configuração de navegação/temas
├── app.json                 # Configurações do Expo
└── package.json             # Dependências do projeto
⚙️ Como Executar o Projeto Localmente
Pré-requisitos:

Ter o Node.js instalado.

Ter o aplicativo Expo Go instalado no seu telemóvel ou um emulador configurado.

Clonar o repositório:

Bash
git clone [https://github.com/SEU-UTILIZADOR/guia-turistico-riozinho.git](https://github.com/SEU-UTILIZADOR/guia-turistico-riozinho.git)
cd guia-turistico-riozinho
Instalar as dependências:

Bash
npm install
Iniciar o projeto:

Bash
npx expo start
Testar:

Leia o qrcode com o Expo Go (Android/iOS) ou pressione a para abrir no emulador Android / i para o simulador iOS.

🤝 Contribuição
Contribuições, correções de bugs e novas sugestões de melhoria para o turismo de Riozinho são sempre bem-vindas! Sinta-se à vontade para abrir uma Pull Request ou Issue.

📄 Licença
Este projeto está licenciado sob a licença MIT.