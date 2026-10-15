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