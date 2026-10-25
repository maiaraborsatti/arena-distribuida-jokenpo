# C1 – Documento de Design: Jokenpô

**Arena Distribuída – Projeto Integrador de Sistemas Distribuídos (5º semestre)**

Grupo: [nomes dos integrantes]
Repositório: https://github.com/maiaraborsatti/arena-distribuida-jokenpo

## 1. Visão geral

O jogo escolhido é o **Jokenpô** (pedra, papel e tesoura), acessado pelo navegador a partir de dispositivos diferentes na rede local. Duas pessoas jogam uma partida e as demais acompanham como espectadoras.

O servidor é feito em **Node.js com Express e Socket.IO** e é **autoritativo**: o cliente apenas envia a intenção ("escolhi pedra") e exibe o estado recebido. Toda validação, o cronômetro e o resultado ficam no servidor. Não há banco de dados nem cadastro; tudo é mantido em memória e os participantes são identificados apenas pelo papel (Jogador 1, Jogador 2 ou Espectador). Os requisitos completos estão em `documentos/requisitos.md`.

## 2. Regras do jogo

- **Escolhas:** pedra, papel ou tesoura.
- **Sigilo:** a escolha de um jogador não é enviada ao adversário antes de ambos escolherem; o servidor revela as duas ao mesmo tempo.
- **Resultado da rodada:** pedra vence tesoura, tesoura vence papel e papel vence pedra. Escolhas iguais resultam em empate.
- **Tempo:** cada rodada tem 10 segundos, controlados pelo servidor. Quem não escolher no prazo perde a rodada.
- **Melhor de cinco:** vence a partida quem alcançar três vitórias em rodadas primeiro. Empates não contam como vitória.
- **Espectadores:** acompanham a partida, mas não fazem jogadas.
- **Revanche e placar:** ao final, os jogadores podem pedir revanche sem sair da sala. O placar da sessão (partidas vencidas por cada lado) é mantido em memória.

## 3. Salas e papéis

- No **lobby**, o usuário cria uma sala (o servidor gera um código) ou entra em uma sala existente informando o código.
- Em cada sala, o primeiro a entrar é o **Jogador 1**, o segundo é o **Jogador 2** e os demais são **Espectadores**. O papel aparece na tela.
- O servidor suporta várias salas ao mesmo tempo. Cada sala tem seu próprio estado, e as mensagens são enviadas somente aos participantes daquela sala.

## 4. Máquina de estados da sala

| Estado | Descrição |
|---|---|
| `AGUARDANDO_OPONENTE` | Sala criada com apenas o Jogador 1. |
| `EM_RODADA` | Rodada aberta, com 10 s para os dois jogadores escolherem. |
| `FIM_DE_PARTIDA` | Um jogador chegou a 3 vitórias; aguarda revanche. |
| `ENCERRADA` | Um jogador desconectou; a sala é removida. |

| De | Para | Evento |
|---|---|---|
| `AGUARDANDO_OPONENTE` | `EM_RODADA` | O Jogador 2 entra na sala. |
| `EM_RODADA` | `EM_RODADA` | Ambos escolhem ou o tempo esgota; o servidor revela o resultado e abre a próxima rodada (ninguém tem 3 vitórias). |
| `EM_RODADA` | `FIM_DE_PARTIDA` | A rodada resolvida leva um jogador a 3 vitórias. |
| `FIM_DE_PARTIDA` | `EM_RODADA` | Os dois jogadores pedem revanche; as rodadas zeram e o placar da sessão é mantido. |
| Qualquer estado | `ENCERRADA` | Um jogador desconecta; o servidor notifica os demais participantes. |

A desconexão de um espectador não altera o estado da sala.

## 5. Protocolo de mensagens

A comunicação usa **Socket.IO** (WebSocket). Cada mensagem tem um tipo, que corresponde ao nome do evento, e um conteúdo em JSON. O protocolo completo (campos, valores, exemplos, erros e validações) está em `documentos/protocolo.md`; abaixo está o resumo.

**Cliente → Servidor**

| Evento | Conteúdo | Função |
|---|---|---|
| `criar_sala` | `{ }` | Cria uma sala; quem criou entra como Jogador 1. |
| `entrar_sala` | `{ codigo }` | Entra em uma sala existente; o servidor atribui o papel. |
| `jogada` | `{ escolha }` | Registra a escolha (`pedra`, `papel` ou `tesoura`) na rodada atual. |
| `revanche` | `{ }` | Pede nova partida na mesma sala. |

**Servidor → Cliente**

| Evento | Destinatário | Função |
|---|---|---|
| `sala_entrada` | Quem entrou na sala | Informa o código da sala e o papel atribuído. |
| `estado` | Todos da sala | Novo estado, com número de `versao` crescente. |
| `resultado` | Todos da sala | Revela as duas escolhas e o vencedor da rodada, ao mesmo tempo. |
| `oponente_desconectado` | Demais participantes | Avisa que um jogador saiu. |
| `erro` | Somente o remetente | Informa por que uma mensagem foi rejeitada. |

**Pontos do protocolo**

- **Versão do estado:** cada mensagem `estado` carrega um número `versao` crescente; o cliente ignora versões antigas.
- **Sigilo:** durante a rodada, `estado` informa apenas se cada jogador já escolheu. As escolhas só trafegam na mensagem `resultado`, enviada a todos ao mesmo tempo.
- **Tempo:** o cronômetro roda no servidor; o cliente só exibe `segundosRestantes`.
- **Validação:** o servidor rejeita jogadas de espectadores, fora da rodada, com escolha inválida ou repetidas, e mensagens malformadas, sempre sem derrubar o servidor.

## 6. Esboço das telas

**Tela 1 – Lobby**

- Título "Jokenpô".
- Botão **Criar sala**.
- Campo para o código da sala e botão **Entrar**.
- Área de mensagens de erro (por exemplo, sala inexistente).

**Tela 2 – Sala / Jogo**

- Código da sala e papel do usuário (Jogador 1, Jogador 2 ou Espectador).
- Status da partida: Aguardando oponente, Sua vez, Vez do adversário, Vitória, Derrota, Empate ou Oponente desconectado.
- Contagem regressiva da rodada (10 s).
- Placar da rodada atual e placar da sessão.
- Três botões: **Pedra**, **Papel** e **Tesoura** (desabilitados para Espectador).
- Área que mostra as duas escolhas reveladas ao final de cada rodada.
- Botão **Revanche**, visível ao fim da partida.

O layout é responsivo, para uso em computador e celular.

## 7. Decisões de design

- O papel é atribuído ao entrar na sala, não ao conectar ao servidor, porque o servidor suporta várias salas.
- Se **nenhum** dos dois escolher no prazo, a rodada é tratada como empate.
- Quando um jogador desconecta, a partida é **encerrada** e a sala é removida, em vez de pausada.
- A revanche só começa quando **os dois** jogadores a pedem.
- Entrada em sala **somente por código**, sem lista de salas.
