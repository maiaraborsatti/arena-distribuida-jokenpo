// Cria uma conexão com o servidor Socket.IO
const socket = io();

// variáveis relacionadas as 2 telas do game
const telaLobby = document.getElementById("lobby");
const telaSala = document.getElementById("sala");

// variáveis relacionadas as ações dos jogadores (Input, textos que se alternam, etc)
const tipoJogador = document.getElementById("tipoJogador");
const statusPartida = document.getElementById("statusPartida");
const placarEl = document.getElementById("placar");
const resultadoEl = document.getElementById("resultado");
const log = document.getElementById("log");
const loglobby = document.getElementById("loglobby");
const botaoRevanche = document.getElementById("revanche");

// Mapa com os botões das jogadas
const botoesJogada = {
    pedra: document.getElementById("pedra"),
    papel: document.getElementById("papel"),
    tesoura: document.getElementById("tesoura")
};

let meuPapel = null;                  
let statusAtual = "AGUARDANDO_OPONENTE";
let jaJoguei = false;                

const NOMES = { jogador1: "Jogador 1", jogador2: "Jogador 2" };
const EMOJIS = { pedra: "✊", papel: "✋", tesoura: "✌️" };
const MAX_LINHAS_LOG = 50;

function souJogador() {
    return meuPapel === "jogador1" || meuPapel === "jogador2";
}

// Adiciona logs e empilha com o scroll
function adicionarLog(mensagem) {
    const linha = document.createElement("p");
    linha.textContent = mensagem;
    log.appendChild(linha);

    while (log.children.length > MAX_LINHAS_LOG) {
        log.removeChild(log.firstChild);
    }
    log.scrollTop = log.scrollHeight;
}

// Mostra somente a mensagem principal da ação
function mostrarMensagemLobby(mensagem) {
    loglobby.textContent = mensagem;
}

// Mapa com os Estados da sala de jogo
const TEXTOS_STATUS = {
    AGUARDANDO_OPONENTE: "Aguardando outro jogador...",
    CARREGANDO_PARTIDA: "Partida começando...",
    EM_ANDAMENTO: "Partida em andamento!",
    ENCERRADA: "Partida encerrada"
};

function mostrarStatus() {
    let texto = TEXTOS_STATUS[statusAtual] || statusAtual;
    if (statusAtual === "EM_ANDAMENTO" && souJogador()) {
        texto = jaJoguei ? "Aguardando o adversário jogar..." : "Faça sua jogada!";
    }
    statusPartida.textContent = texto;
}

function mostrarPlacar(rodada, placar) {
    placarEl.textContent =
        `Rodada ${rodada} — Jogador 1: ${placar.jogador1} | Jogador 2: ${placar.jogador2}`;
}

// Desativa a jogada se houver somente um jogador e se a jogada já foi feita
function atualizarBotoes() {
    const podeJogar = souJogador() && statusAtual === "EM_ANDAMENTO" && !jaJoguei;
    Object.values(botoesJogada).forEach((botao) => {
        botao.disabled = !podeJogar;
    });
    botaoRevanche.classList.toggle("hidden", !(souJogador() && statusAtual === "ENCERRADA"));
    mostrarStatus();
}

function limparMarcacaoBotoes() {
    Object.values(botoesJogada).forEach((b) => b.classList.remove("selecionado"));
}

function textoResultadoRodada({ jogadas, resultado }) {
    const confronto = `${EMOJIS[jogadas.jogador1]} x ${EMOJIS[jogadas.jogador2]}`;

    if (resultado === "empate") return `${confronto} — Empate! Jogue de novo.`;
    if (souJogador()) {
        return resultado === meuPapel
            ? `${confronto} — Você venceu a rodada!`
            : `${confronto} — Você perdeu a rodada.`;
    }
    return `${confronto} — ${NOMES[resultado]} venceu a rodada.`; // espectador
}

// Emite a jogada com o nome do botão e o tipo de jogada ao servidor
Object.entries(botoesJogada).forEach(([jogada, botao]) => {
    botao.addEventListener("click", () => {
        socket.emit("jogada", jogada);
    });
});

botaoRevanche.addEventListener("click", () => {
    socket.emit("revanche");
});

document.getElementById("criarSala").addEventListener("click", () => {
    socket.emit("criar_sala");
});

document.getElementById("entrarSala").addEventListener("click", () => {
    const codigo = document.getElementById("codigoSala").value.trim().toUpperCase();
    socket.emit("entrar_sala", { codigo });
});

// Resposta do servidor quando o jogador entra na partida, mudando o estado das telas
socket.on("sala_entrada", ({ codigo, papel, status, rodada, placar }) => {
    meuPapel = papel;
    statusAtual = status;
    jaJoguei = false;

    telaLobby.classList.add("hidden");
    telaSala.classList.remove("hidden");

    tipoJogador.textContent = `Sala ${codigo} — você é: ${papel}`;
    mostrarPlacar(rodada, placar);
    atualizarBotoes();
});

// Resposta do servidor aos status da tela da partida
socket.on("status_partida", ({ status }) => {
    const anterior = statusAtual;
    statusAtual = status;

    if (status === "AGUARDANDO_OPONENTE" || status === "CARREGANDO_PARTIDA" ||
        (anterior === "ENCERRADA" && status !== "ENCERRADA")) {
        resultadoEl.textContent = "";
        limparMarcacaoBotoes();
    }

    if (status !== "EM_ANDAMENTO") jaJoguei = false;
    if (anterior === "ENCERRADA" && status === "EM_ANDAMENTO") jaJoguei = false;

    atualizarBotoes();
});

// Resposta do servidor ao placar da partida
socket.on("placar", ({ rodada, placar }) => {
    mostrarPlacar(rodada, placar);
});

// resposta do servidor para jogada que foi efetuada
socket.on("jogada_registrada", ({ jogada }) => {
    jaJoguei = true;
    limparMarcacaoBotoes();
    botoesJogada[jogada].classList.add("selecionado");
    atualizarBotoes();
});

socket.on("resultado_rodada", (dados) => {
    resultadoEl.textContent = textoResultadoRodada(dados);
    adicionarLog(`Rodada ${dados.rodada}: ${resultadoEl.textContent}`);
    jaJoguei = false;
    limparMarcacaoBotoes();
    atualizarBotoes();
});

socket.on("fim_partida", ({ vencedor }) => {
    let texto;
    if (souJogador()) {
        texto = vencedor === meuPapel ? "🏆 Você venceu a partida!" : "Você perdeu a partida.";
    } else {
        texto = `${NOMES[vencedor]} venceu a partida!`;
    }
    resultadoEl.textContent += `\n${texto}`;
    adicionarLog(texto);
});

//Resposta do servidor à entrada e saída do jogador
socket.on("login", (mensagem) => adicionarLog(mensagem));
socket.on("logout", (mensagem) => adicionarLog(mensagem));

socket.on("erro", (dados) => {
    if (telaSala.classList.contains("hidden")) {
        mostrarMensagemLobby(dados.mensagem);
    } else {
        adicionarLog(dados.mensagem);
    }
});
