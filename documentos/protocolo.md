# Protocolo de Mensagens — Jokenpô

Contrato de comunicação entre cliente (navegador) e servidor. A comunicação usa **Socket.IO** (WebSocket). O servidor é **autoritativo**: o cliente apenas envia intenções e exibe o estado recebido.

## 1. Convenções

- O **tipo** da mensagem é o **nome do evento** Socket.IO. O conteúdo é um objeto **JSON**.
- Nomes de eventos e de campos em `snake_case` ou minúsculas, exatamente como escritos neste documento.
- Valores fixos usados nos campos:

| Campo | Valores possíveis |
|---|---|
| `papel` | `"jogador1"`, `"jogador2"`, `"espectador"` |
| `status` | `"AGUARDANDO_OPONENTE"`, `"EM_RODADA"`, `"FIM_DE_PARTIDA"`, `"ENCERRADA"` |
| `escolha` | `"pedra"`, `"papel"`, `"tesoura"` |
| `vencedor` | `"jogador1"`, `"jogador2"`, `"empate"` |

- O papel é atribuído **ao entrar na sala**: o primeiro é `jogador1`, o segundo é `jogador2` e os demais são `espectador`.
- Toda mensagem do cliente que chega fora do formato é rejeitada com o evento `erro` (ver seção 5), sem derrubar o servidor.

## 2. Estados da sala e da partida

A sala e a partida formam **uma única máquina de estados**, representada pelo campo `status`.

| Estado | Descrição |
|---|---|
| `AGUARDANDO_OPONENTE` | Sala criada com apenas o Jogador 1. |
| `EM_RODADA` | Rodada aberta; os dois jogadores têm 10 s para escolher. |
| `FIM_DE_PARTIDA` | Um jogador chegou a 3 vitórias de rodada; aguarda revanche. |
| `ENCERRADA` | Um jogador desconectou; a sala é removida. |

| De | Para | Evento |
|---|---|---|
| `AGUARDANDO_OPONENTE` | `EM_RODADA` | O Jogador 2 entra na sala. |
| `EM_RODADA` | `EM_RODADA` | Ambos escolhem ou o tempo esgota; o servidor revela o resultado e abre a próxima rodada (ninguém tem 3 vitórias). |
| `EM_RODADA` | `FIM_DE_PARTIDA` | A rodada resolvida leva um jogador a 3 vitórias. |
| `FIM_DE_PARTIDA` | `EM_RODADA` | Os dois jogadores pedem revanche; as rodadas zeram e o placar da sessão é mantido. |
| Qualquer estado | `ENCERRADA` | Um jogador (não espectador) desconecta. |

A desconexão de um espectador não altera o estado da sala.

## 3. Cliente → Servidor

| Evento | Conteúdo | Função |
|---|---|---|
| `criar_sala` | `{ }` | Cria uma sala. Quem criou entra como `jogador1`. |
| `entrar_sala` | `{ "codigo": "ABC123" }` | Entra em uma sala existente pelo código. O servidor atribui o papel. |
| `jogada` | `{ "escolha": "pedra" }` | Registra a escolha do jogador na rodada atual. |
| `revanche` | `{ }` | Pede nova partida na mesma sala (somente em `FIM_DE_PARTIDA`). |

Exemplo (cliente):

```js
socket.emit("jogada", { escolha: "pedra" });
```

## 4. Servidor → Cliente

| Evento | Conteúdo | Destinatário |
|---|---|---|
| `sala_entrada` | `{ "codigo": "ABC123", "papel": "jogador1" }` | Somente quem entrou na sala. |
| `estado` | Ver abaixo. | Todos da sala, a cada mudança. |
| `resultado` | Ver abaixo. | Todos da sala, ao fim de cada rodada. |
| `oponente_desconectado` | `{ }` | Demais participantes da sala. |
| `erro` | `{ "codigo": "...", "mensagem": "..." }` | Somente o remetente da mensagem rejeitada. |

### 4.1 Evento `estado`

```json
{
  "versao": 7,
  "status": "EM_RODADA",
  "rodada": 3,
  "placarRodadas": { "jogador1": 1, "jogador2": 1 },
  "placarSessao": { "jogador1": 0, "jogador2": 0 },
  "jaEscolheu": { "jogador1": true, "jogador2": false },
  "revanchePedida": { "jogador1": false, "jogador2": false },
  "segundosRestantes": 6,
  "vencedorPartida": null
}
```

| Campo | Significado |
|---|---|
| `versao` | Número inteiro crescente por sala. O cliente ignora estados com versão menor ou igual à já exibida. |
| `status` | Estado da sala (seção 2). |
| `rodada` | Número da rodada atual, começando em 1. |
| `placarRodadas` | Vitórias de rodada de cada jogador na partida atual. |
| `placarSessao` | Partidas vencidas por cada jogador desde que a sala foi criada. |
| `jaEscolheu` | Indica **apenas se** cada jogador já escolheu na rodada, nunca qual foi a escolha. |
| `revanchePedida` | Indica se cada jogador já pediu revanche. |
| `segundosRestantes` | Segundos restantes da rodada, calculados pelo relógio do servidor; `null` fora de `EM_RODADA`. |
| `vencedorPartida` | `"jogador1"` ou `"jogador2"` em `FIM_DE_PARTIDA`; `null` nos demais estados. |

### 4.2 Evento `resultado`

```json
{
  "rodada": 3,
  "escolhas": { "jogador1": "pedra", "jogador2": "tesoura" },
  "vencedor": "jogador1"
}
```

- É a **única** mensagem que contém as escolhas, enviada a todos da sala ao mesmo tempo (sigilo da escolha).
- Se um jogador não escolheu no prazo, sua escolha vem como `null` e a rodada é vencida pelo outro jogador.
- Se nenhum dos dois escolheu no prazo, `vencedor` é `"empate"`.
- Ao enviar `resultado`, o servidor envia em seguida um novo `estado`.

## 5. Erros

Toda jogada ou mensagem rejeitada gera o evento `erro` enviado **somente ao remetente**, e a rejeição é registrada no log do servidor.

| `codigo` | `mensagem` | Quando ocorre |
|---|---|---|
| `MENSAGEM_INVALIDA` | "Mensagem inválida." | Conteúdo ausente, malformado ou com campos de tipo errado. |
| `SALA_INEXISTENTE` | "Sala não encontrada." | `entrar_sala` com código que não existe. |
| `JA_ESTA_EM_SALA` | "Você já está em uma sala." | `criar_sala` ou `entrar_sala` por quem já está em uma sala. |
| `SEM_SALA` | "Você não está em uma sala." | `jogada` ou `revanche` por quem não entrou em nenhuma sala. |
| `NAO_E_JOGADOR` | "Espectadores não podem jogar." | `jogada` ou `revanche` enviada por espectador. |
| `FORA_DE_RODADA` | "Não há rodada em andamento." | `jogada` enviada com a sala fora de `EM_RODADA`. |
| `ESCOLHA_INVALIDA` | "Escolha inválida. Use pedra, papel ou tesoura." | `escolha` diferente dos três valores permitidos. |
| `JA_ESCOLHEU` | "Você já escolheu nesta rodada." | Segunda `jogada` do mesmo jogador na mesma rodada. |
| `REVANCHE_INDISPONIVEL` | "A revanche só pode ser pedida ao fim da partida." | `revanche` enviada fora de `FIM_DE_PARTIDA`. |

## 6. Validações do servidor

Em cada `jogada`, o servidor verifica, nesta ordem:

1. A mensagem tem o formato esperado (`MENSAGEM_INVALIDA`).
2. O remetente está em uma sala (`SEM_SALA`).
3. O remetente é `jogador1` ou `jogador2` (`NAO_E_JOGADOR`).
4. A sala está em `EM_RODADA` (`FORA_DE_RODADA`).
5. A escolha é pedra, papel ou tesoura (`ESCOLHA_INVALIDA`).
6. O jogador ainda não escolheu nesta rodada (`JA_ESCOLHEU`).

O cronômetro de 10 s é controlado pelo servidor; o cliente apenas exibe `segundosRestantes`.

## 7. Fluxos principais

**Entrada na sala**

1. Cliente envia `criar_sala` (ou `entrar_sala` com o código).
2. Servidor responde ao remetente com `sala_entrada` e, em seguida, envia `estado` a todos da sala.
3. Quando o segundo jogador entra, o `estado` passa para `EM_RODADA`.

**Rodada**

1. Cada jogador envia `jogada`. A cada jogada aceita, o servidor envia `estado` (com `jaEscolheu` atualizado).
2. Quando os dois escolhem, ou o tempo esgota, o servidor envia `resultado` e depois `estado`.

**Fim de partida e revanche**

1. Ao chegar a 3 vitórias, o servidor envia `estado` com `status` `FIM_DE_PARTIDA` e `vencedorPartida`.
2. Cada jogador envia `revanche`; quando os dois pedem, o servidor envia `estado` com `status` `EM_RODADA` e as rodadas zeradas.

**Desconexão**

1. Se um jogador desconecta, o servidor envia `oponente_desconectado` aos demais e `estado` com `status` `ENCERRADA`, e remove a sala.

## 8. Status exibido na interface (RF06)

O cliente obtém o texto de status a partir do `estado` e do próprio `papel`:

| Texto exibido | Condição |
|---|---|
| Aguardando oponente | `status` é `AGUARDANDO_OPONENTE`. |
| Sua vez | `status` é `EM_RODADA` e o próprio jogador ainda não escolheu (`jaEscolheu`). |
| Vez do adversário | `status` é `EM_RODADA` e o próprio jogador já escolheu. |
| Vitória / Derrota | `status` é `FIM_DE_PARTIDA` e `vencedorPartida` é o próprio papel / o outro jogador. |
| Empate | `resultado` com `vencedor` igual a `"empate"` na rodada. |
| Oponente desconectado | Recebimento de `oponente_desconectado` ou `status` `ENCERRADA`. |

Espectadores veem os mesmos dados, sem os botões de jogada.
