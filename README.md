# arena-distribuida-jokenpo

Jokenpô multiplayer em tempo real com Node.js, Express e Socket.IO, desenvolvido para o Projeto Integrador de Sistemas Distribuídos.

## Tecnologias

- Node.js
- Express
- Socket.IO
- HTML, CSS e JavaScript (cliente)

## Como executar o projeto na sua máquina

### Pré-requisitos

Antes de executar o projeto, é necessário ter o **Node.js** instalado na máquina.

### 1. Clonar o repositório

Primeiramente, clone o repositório para a sua máquina utilizando o comando:

```bash
git clone https://github.com/maiaraborsatti/arena-distribuida-jokenpo.git
```

Depois de clonar o repositório, entre na pasta do projeto:

```bash
cd arena-distribuida-jokenpo
```

### 2. Instalar as dependências

```bash
npm install
```

### 3. Iniciar o servidor

Após instalar as dependências, inicie o servidor utilizando:

```bash
node server.js
```

Ao iniciar, o terminal exibe a porta e o endereço IP da máquina na rede local.

### 4. Acessar o projeto

Com o servidor em execução, abra o navegador e acesse:

```
http://localhost:3000
```

## Acessar de outro dispositivo (rede local)

Para jogar com dois dispositivos, o computador que roda o servidor e o outro dispositivo (celular ou computador) precisam estar **na mesma rede**.

1. Inicie o servidor com `node server.js`.
2. Veja o endereço IP impresso no terminal ao iniciar o servidor. Se preferir descobrir manualmente:
   - Windows: execute `ipconfig` e procure o **Endereço IPv4**.
   - Linux: execute `ip a`.
   - macOS: execute `ifconfig`.
3. No outro dispositivo, abra o navegador e acesse `http://IP_DO_SERVIDOR:3000` (exemplo: `http://192.168.0.15:3000`).

Se a máquina tiver mais de uma interface de rede (Wi-Fi, Ethernet, VPN, Docker), use o IP que está na mesma faixa do outro dispositivo (por exemplo, `192.168.0.x` nos dois).

## Solução de problemas

Se `http://localhost:3000` abre no computador do servidor, mas `http://IP:3000` não abre em outro dispositivo, a causa mais provável é o **firewall** ou o **isolamento de clientes do Wi-Fi**.

### Firewall do Windows

- Na primeira execução, o Windows pergunta se o Node.js pode se comunicar em redes. Permita em **rede privada**.
- Se a pergunta não apareceu ou foi negada: *Firewall do Windows Defender → Configurações avançadas → Regras de Entrada → Nova Regra → Porta → TCP → 3000 → Permitir a conexão*.
- Confira se a rede está classificada como **privada**, e não pública.

### Firewall no Linux

Verifique o estado e libere a porta, se necessário:

```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

### Firewall no macOS

O sistema pergunta se o Node pode aceitar conexões de entrada. Permita.

### Outras causas

- Os dois dispositivos estão na mesma rede/Wi-Fi?
- A rede do laboratório ou da faculdade bloqueia a comunicação entre dispositivos (isolamento de clientes)? Nesse caso, use o hotspot de um celular.
- O servidor está rodando e a porta é a mesma (3000)?

## Integrantes

- _Adicionar nomes dos integrantes do grupo_