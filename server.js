const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { criarSala, consultarSala, liberarSala, STATUS_PARTIDA } = require("./salas");
const { determinarResultado } = require("./jogo");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

const TEMPO_CARREGAMENTO_MS = 5000;
const VITORIAS_PARA_GANHAR = 2; 
const JOGADAS_VALIDAS = ["pedra", "papel", "tesoura"];

app.use(express.static("public"));

function nomeDoPapel(papel) {
    return papel === "jogador1" ? "Jogador 1" : "Jogador 2";
}

function papelDoSocket(sala, socket) {
    if (sala.jogador1 === socket) return "jogador1";
    if (sala.jogador2 === socket) return "jogador2";
    return null;
}

function emitirStatus(sala) {
    io.to(sala.codigo).emit("status_partida", { status: sala.status });
}

function emitirPlacar(sala) {
    io.to(sala.codigo).emit("placar", {
        rodada: sala.rodada,
        placar: { ...sala.placarRodadas }
    });
}

function reiniciarPartida(sala) {
    if (sala.temporizador) {
        clearTimeout(sala.temporizador);
        sala.temporizador = null;
    }
    sala.rodada = 1;
    sala.placarRodadas = { jogador1: 0, jogador2: 0 };
    sala.jogadas = { jogador1: null, jogador2: null };
}

function iniciarCarregamento(sala) {
    reiniciarPartida(sala);
    sala.status = STATUS_PARTIDA.CARREGANDO;
    console.log(`Sala ${sala.codigo}: ${sala.status}`);
    emitirStatus(sala);
    emitirPlacar(sala);

    sala.temporizador = setTimeout(() => {
        sala.temporizador = null;
        sala.status = STATUS_PARTIDA.EM_ANDAMENTO;
        console.log(`Sala ${sala.codigo}: ${sala.status}`);
        emitirStatus(sala);
    }, TEMPO_CARREGAMENTO_MS);
}

function entrarNaSala(socket, sala) {
    let papel;
    if (sala.jogador1 === null) {
        sala.jogador1 = socket;
        papel = "jogador1";
    } else if (sala.jogador2 === null) {
        sala.jogador2 = socket;
        papel = "jogador2";
    } else {
        sala.espectadores.push(socket);
        papel = "espectador";
    }
    console.log(`${papel} conectado na sala ${sala.codigo}`);

    socket.join(sala.codigo);
    socket.data.codigo = sala.codigo;

    socket.emit("sala_entrada", {
        codigo: sala.codigo,
        papel,
        status: sala.status,
        rodada: sala.rodada,
        placar: { ...sala.placarRodadas }
    });
    io.to(sala.codigo).emit("login", `${papel === "espectador" ? "Um espectador" : nomeDoPapel(papel)} entrou na sala.`);

    if (papel !== "espectador" && sala.jogador1 && sala.jogador2) {
        iniciarCarregamento(sala);
    }
}


io.on("connection", (socket) => {
    console.log("Um jogador entrou!");

    socket.on("criar_sala", () => {
        if (socket.data.codigo) {
            return socket.emit("erro", { codigo: "JA_ESTA_EM_SALA", mensagem: "Você já está em uma sala." });
        }
        entrarNaSala(socket, criarSala());
    });

    socket.on("entrar_sala", (dados) => {
        if (socket.data.codigo) {
            return socket.emit("erro", { codigo: "JA_ESTA_EM_SALA", mensagem: "Você já está em uma sala." });
        }
        const sala = consultarSala(dados && dados.codigo);
        if (!sala) {
            return socket.emit("erro", { codigo: "SALA_INEXISTENTE", mensagem: "Sala não encontrada." });
        }
        entrarNaSala(socket, sala);
    });

    socket.on("jogada", (jogada) => {
        const sala = consultarSala(socket.data.codigo);
        if (!sala) return;

        if (sala.status !== STATUS_PARTIDA.EM_ANDAMENTO) {
            return socket.emit("erro", { mensagem: "A partida ainda não está em andamento." });
        }

        const jogador = papelDoSocket(sala, socket);
        if (!jogador) {
            return socket.emit("erro", { mensagem: "Espectadores não podem realizar jogadas." });
        }

        if (!JOGADAS_VALIDAS.includes(jogada)) {
            return socket.emit("erro", { mensagem: "Jogada inválida." });
        }

        if (sala.jogadas[jogador] !== null) {
            return socket.emit("erro", { mensagem: "Você já realizou sua jogada nesta rodada." });
        }

        sala.jogadas[jogador] = jogada;
        console.log(`${jogador} escolheu: ${jogada}`);

        socket.emit("jogada_registrada", { jogada });
        socket.to(sala.codigo).emit("login", `${nomeDoPapel(jogador)} já jogou!`);

        if (sala.jogadas.jogador1 === null || sala.jogadas.jogador2 === null) return;

        const jogadas = { ...sala.jogadas };
        const resultado = determinarResultado(jogadas.jogador1, jogadas.jogador2);
        console.log(`Resultado da rodada ${sala.rodada}: ${resultado}`);

        if (resultado === "jogador1" || resultado === "jogador2") {
            sala.placarRodadas[resultado]++;
        }

        io.to(sala.codigo).emit("resultado_rodada", {
            rodada: sala.rodada,
            jogadas,
            resultado, 
            placar: { ...sala.placarRodadas }
        });

        sala.jogadas = { jogador1: null, jogador2: null };

        const houveVencedor = resultado !== "empate" && sala.placarRodadas[resultado] >= VITORIAS_PARA_GANHAR;

        if (houveVencedor) {
            sala.status = STATUS_PARTIDA.ENCERRADA;
            emitirStatus(sala);
            io.to(sala.codigo).emit("fim_partida", {
                vencedor: resultado,
                placar: { ...sala.placarRodadas }
            });
        } else {
            if (resultado !== "empate") sala.rodada++;
            emitirPlacar(sala);
        }
    });

    socket.on("revanche", () => {
        const sala = consultarSala(socket.data.codigo);
        if (!sala) return;
        if (sala.status !== STATUS_PARTIDA.ENCERRADA) return;
        if (!papelDoSocket(sala, socket)) return; // espectador não pede revanche

        reiniciarPartida(sala);
        sala.status = STATUS_PARTIDA.EM_ANDAMENTO;
        emitirStatus(sala);
        emitirPlacar(sala);
        io.to(sala.codigo).emit("login", "Nova partida iniciada!");
    });

    socket.on("disconnect", () => {
        console.log("Um jogador saiu!");

        const sala = consultarSala(socket.data.codigo);
        if (!sala) return;

        const papel = papelDoSocket(sala, socket);

        if (papel) {
            sala[papel] = null; 
            reiniciarPartida(sala); 
            sala.status = STATUS_PARTIDA.AGUARDANDO;
            emitirStatus(sala);
            emitirPlacar(sala);
            io.to(sala.codigo).emit("logout", `${nomeDoPapel(papel)} saiu. Aguardando novo jogador...`);
        } else {
            sala.espectadores = sala.espectadores.filter((s) => s !== socket);
            io.to(sala.codigo).emit("logout", "Um espectador saiu.");
        }

        if (!sala.jogador1 && !sala.jogador2 && sala.espectadores.length === 0) {
            liberarSala(sala.codigo);
            console.log(`Sala ${sala.codigo} removida.`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});