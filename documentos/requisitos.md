# Requisitos Funcionais

| ID | Requisito |
|---|---|
| **RF01** | O jogo deve ser acessado pelo navegador a partir de outro dispositivo da rede local (ex.: `http://192.168.0.15:3000`). |
| **RF02** | Ao conectar, o servidor atribui automaticamente o papel do usuário: **Jogador 1**, **Jogador 2** e, a partir do terceiro, **Espectador** ou fila de espera. O papel deve aparecer na tela. |
| **RF03** | Existe um lobby simples em que o usuário cria uma sala ou entra em uma sala existente (por código ou lista). O servidor deve suportar pelo menos duas partidas simultâneas e independentes. |
| **RF04** | Toda jogada é validada no servidor (vez correta, posição válida, partida em andamento). Jogadas inválidas são rejeitadas com mensagem de erro ao remetente. |
| **RF05** | Após cada jogada aceita, o servidor envia o novo estado a todos os participantes da sala, que atualizam a tela sem recarregar a página. |
| **RF06** | A interface exibe o status da partida: **Aguardando oponente**, **Sua vez**, **Vez do adversário**, **Vitória**, **Derrota**, **Empate**, **Oponente desconectado**. |
| **RF07** | Se um jogador desconectar, o servidor notifica os demais participantes e encerra ou pausa a partida, liberando a sala. |
| **RF08** | Ao final da partida, os jogadores podem pedir revanche sem sair da sala. O placar da sessão (vitórias de cada lado) é mantido em memória. |

# Requisitos Não Funcionais

| ID | Requisito |
|---|---|
| **RNF01** | A comunicação em tempo real deverá utilizar WebSocket ou tecnologia equivalente, como Socket.IO. Polling não poderá ser o mecanismo principal. |
| **RNF02** | A demonstração deverá utilizar pelo menos dois dispositivos físicos diferentes. |
| **RNF03** | Na rede local, a atualização da tela após uma jogada deverá ser percebida como imediata, com referência de aproximadamente 200 ms. |
| **RNF04** | O servidor deverá registrar no console os eventos principais: conexão, entrada em sala, jogadas aceitas ou rejeitadas e desconexão. |
| **RNF05** | O servidor não deverá encerrar por causa de mensagens malformadas enviadas por clientes. |
| **RNF06** | O projeto deverá utilizar Git, conter commits dos integrantes e apresentar um README com instruções de execução. |
| **RNF07** | A interface deverá ser utilizável em computadores e celulares, com layout responsivo básico. |

# Regras do Jokenpô

- **RJ01 — Escolhas:** cada jogador poderá escolher pedra, papel ou tesoura.
- **RJ02 — Sigilo:** a escolha de um jogador não poderá ser enviada ao adversário antes que ambos tenham escolhido. O servidor deverá revelar as duas escolhas simultaneamente.
- **RJ03 — Resultado:** pedra vence tesoura, tesoura vence papel e papel vence pedra. Escolhas iguais resultam em empate.
- **RJ04 — Tempo:** cada rodada terá limite de 10 segundos, controlado pelo servidor. Quem não escolher dentro do prazo perderá a rodada.
- **RJ05 — Melhor de cinco:** vencerá a partida quem alcançar três vitórias em rodadas primeiro. Empates não contam como vitória.
- **RJ06 — Espectadores:** espectadores poderão acompanhar a partida, mas não realizar jogadas como participantes daquela partida.