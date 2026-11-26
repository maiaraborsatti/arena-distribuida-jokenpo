// CONEXÃO
const socket = io();

// ELEMENTOS DO DOM
const telaLobby = document.getElementById("lobby");
const telaSala = document.getElementById("sala");
const cronometroEl = document.getElementById("cronometro");

const tipoJogador = document.getElementById("tipoJogador");
const statusPartida = document.getElementById("statusPartida");
const placarEl = document.getElementById("placar");
const resultadoEl = document.getElementById("resultado");
const log = document.getElementById("log");
const loglobby = document.getElementById("loglobby");
const botaoRevanche = document.getElementById("revanche");

const botoesJogada = {
    pedra: document.getElementById("pedra"),
    papel: document.getElementById("papel"),
    tesoura: document.getElementById("tesoura")
};

// CONSTANTES
const NOMES = { jogador1: "Jogador 1", jogador2: "Jogador 2" };
const EMOJIS = { pedra: "✊", papel: "✋", tesoura: "✌️" };
const MAX_LINHAS_LOG = 50;

const TEXTOS_STATUS = {
    AGUARDANDO_OPONENTE: "Aguardando outro jogador...",
    CARREGANDO_PARTIDA: "Partida começando...",
    EM_ANDAMENTO: "Partida em andamento!",
    ENCERRADA: "Partida encerrada"
};

// ESTADO
// Única fonte de verdade da interface. Guarda dados crus
// (não textos prontos): o texto é montado na renderização.
const estado = {
    emSala: false,
    codigo: null,
    papel: null,                         // "jogador1" | "jogador2" | "espectador"
    status: "AGUARDANDO_OPONENTE",
    rodada: 1,
    placar: { jogador1: 0, jogador2: 0 },
    jaJoguei: false,
    jogadaEscolhida: null,               // "pedra" | "papel" | "tesoura" | null
    ultimaRodada: null,                  // { rodada, jogadas, resultado, placar }
    vencedor: null,                      // "jogador1" | "jogador2" | null
    logs: [],
    erroLobby: "",
    fimCronometro: null
};

function souJogador() {
    return estado.papel === "jogador1" || estado.papel === "jogador2";
}

function registrarLog(mensagem) {
    estado.logs.push(mensagem);
    while (estado.logs.length > MAX_LINHAS_LOG) {
        estado.logs.shift();
    }
}

// TEXTOS (funções puras: leem dados e devolvem string)
function textoStatus() {
    if (estado.status === "EM_ANDAMENTO" && souJogador()) {
        return estado.jaJoguei ? "Aguardando o adversário jogar..." : "Faça sua jogada!";
    }
    return TEXTOS_STATUS[estado.status] || estado.status;
}

function textoRodada({ jogadas, resultado }) {
    // const confronto = `${EMOJIS[jogadas.jogador1]} x ${EMOJIS[jogadas.jogador2]}`;
    const jogada1 =
        jogadas.jogador1
            ? EMOJIS[jogadas.jogador1]
            : "⏰";

    const jogada2 =
        jogadas.jogador2
            ? EMOJIS[jogadas.jogador2]
            : "⏰";

    const confronto =
        `${jogada1} x ${jogada2}`;
    if (resultado === "empate") return `${confronto} — Empate! Jogue de novo.`;
    if (souJogador()) {
        return resultado === estado.papel
            ? `${confronto} — Você venceu a rodada!`
            : `${confronto} — Você perdeu a rodada.`;
    }
    return `${confronto} — ${NOMES[resultado]} venceu a rodada.`; // espectador
}

function textoFimPartida() {
    if (souJogador()) {
        return estado.vencedor === estado.papel
            ? "🏆 Você venceu a partida!"
            : "Você perdeu a partida.";
    }
    return `${NOMES[estado.vencedor]} venceu a partida!`;
}

function textoResultado() {
    const partes = [];
    if (estado.ultimaRodada) partes.push(textoRodada(estado.ultimaRodada));
    if (estado.vencedor) partes.push(textoFimPartida());
    return partes.join("\n");
}

// RENDERIZAÇÃO
// Só lê o estado e atualiza o DOM. Não altera estado e não emite eventos.

function atualizarCronometro() {
    if (!estado.emSala || estado.fimCronometro === null) {
        cronometroEl.textContent = "";
        return;
    }
    // Date.now() = horário atual em milissegundos
    const restante = Math.max(0, Math.ceil((estado.fimCronometro - Date.now()) / 1000));
    cronometroEl.textContent = `⏱️ ${restante}s`;
}

setInterval(atualizarCronometro, 250); // roda 4 vezes por segundo

function renderizar() {
    // Telas
    telaLobby.classList.toggle("hidden", estado.emSala);
    telaSala.classList.toggle("hidden", !estado.emSala);
    loglobby.textContent = estado.erroLobby;

    if (!estado.emSala) return;

    // Cabeçalho da sala
    tipoJogador.textContent = `Sala ${estado.codigo} — você é: ${estado.papel}`;
    statusPartida.textContent = textoStatus();
    placarEl.textContent =
        `Rodada ${estado.rodada} — Jogador 1: ${estado.placar.jogador1} | Jogador 2: ${estado.placar.jogador2}`;
    resultadoEl.textContent = textoResultado();

    atualizarCronometro();

    // Botões de jogada
    const podeJogar = souJogador() && estado.status === "EM_ANDAMENTO" && !estado.jaJoguei;
    Object.entries(botoesJogada).forEach(([nome, botao]) => {
        botao.disabled = !podeJogar;
        botao.classList.toggle("selecionado", estado.jogadaEscolhida === nome);
    });

    // Revanche
    botaoRevanche.classList.toggle("hidden", !(souJogador() && estado.status === "ENCERRADA"));

    // Log
    log.replaceChildren(...estado.logs.map((mensagem) => {
        const linha = document.createElement("p");
        linha.textContent = mensagem;
        return linha;
    }));
    log.scrollTop = log.scrollHeight;
}

// HANDLERS DOS EVENTOS DO SOCKET.IO
// Cada handler só altera o estado. A renderização roda depois.
const handlers = {
    sala_entrada({ codigo, papel, status, rodada, placar }) {
        Object.assign(estado, {
            emSala: true,
            codigo,
            papel,
            status,
            rodada,
            placar,
            jaJoguei: false,
            jogadaEscolhida: null,
            ultimaRodada: null,
            vencedor: null,
            erroLobby: "",
            fimCronometro: null
        });
    },

    status_partida({ status }) {
        const anterior = estado.status;
        estado.status = status;

        if (status === "AGUARDANDO_OPONENTE"  ||
            (anterior === "ENCERRADA" && status !== "ENCERRADA")) {
            estado.ultimaRodada = null;
            estado.vencedor = null;
            estado.jogadaEscolhida = null;
        }

        if (status !== "EM_ANDAMENTO") estado.jaJoguei = false;
        if (anterior === "ENCERRADA" && status === "EM_ANDAMENTO") estado.jaJoguei = false;
        if (status !== "EM_ANDAMENTO") estado.fimCronometro = null;
    },

    placar({ rodada, placar }) {
        estado.rodada = rodada;
        estado.placar = placar;
    },

    cronometro_iniciado({ duracao }) {
        estado.fimCronometro = Date.now() + duracao;
    },

    jogada_registrada({ jogada }) {
        estado.jaJoguei = true;
        estado.jogadaEscolhida = jogada;
    },

    resultado_rodada(dados) {
        estado.ultimaRodada = dados;
        estado.jaJoguei = false;
        estado.jogadaEscolhida = null;
        estado.fimCronometro = null;
        registrarLog(`Rodada ${dados.rodada}: ${textoRodada(dados)}`);
        if (dados.timeout) {
            registrarLog("⏰ Tempo esgotado.");
        }
    },

    fim_partida({ vencedor }) {
        estado.vencedor = vencedor;
        estado.fimCronometro = null;
        registrarLog(textoFimPartida());
    },

    login(mensagem) {
        registrarLog(mensagem);
    },

    logout(mensagem) {
        registrarLog(mensagem);
    },

    erro({ mensagem }) {
        if (estado.emSala) registrarLog(mensagem);
        else estado.erroLobby = mensagem;
    }
};

// Ponto único de entrada dos eventos do servidor:
// atualiza o estado e, em seguida, redesenha a tela.
Object.entries(handlers).forEach(([evento, handler]) => {
    socket.on(evento, (dados) => {
        handler(dados);
        renderizar();
    });
});

// AÇÕES DO USUÁRIO
// Só emitem eventos. Quem muda o estado é a resposta do servidor.
Object.entries(botoesJogada).forEach(([jogada, botao]) => {
    botao.addEventListener("click", () => {
        socket.emit("jogada", jogada);
    });
});

botaoRevanche.addEventListener("click", () => {
    socket.emit("revanche");
});

document.getElementById("criarSala").addEventListener("click", () => {
    estado.erroLobby = "";
    renderizar();
    socket.emit("criar_sala");
});

document.getElementById("entrarSala").addEventListener("click", () => {
    const codigo = document.getElementById("codigoSala").value.trim().toUpperCase();
    estado.erroLobby = "";
    renderizar();
    socket.emit("entrar_sala", { codigo });
});

// Desenho inicial
renderizar();