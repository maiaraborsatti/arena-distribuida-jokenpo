const express = require("express");
const http = require("http");
const os = require('os');
const { Server } = require("socket.io");
const { criarSala, consultarSala, liberarSala, STATUS_PARTIDA } = require("./salas");
const { determinarResultado } = require("./jogo");

const ipv4 = Object.values(os.networkInterfaces()).flat().find(i => i.family === 'IPv4' && !i.internal)?.address
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

const TEMPO_CARREGAMENTO_MS = 5000;
const TEMPO_RODADA_MS = 10000;
const VITORIAS_PARA_GANHAR = 3; // Alterado de 2 para 3 Número de vitórias necessárias para encerrar a partida
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

function iniciarCronometroRodada(sala) {
    cancelarCronometroRodada(sala);
    io.to(sala.codigo).emit("cronometro_iniciado", { duracao: TEMPO_RODADA_MS });
    sala.aceitandoJogadas = true;
    sala.temporizadorRodada = setTimeout(() => {
    sala.temporizadorRodada = null;
    sala.aceitandoJogadas = false;
    // Evita executar duas vezes a mesma rodada

        if (
            sala.status !==
            STATUS_PARTIDA.EM_ANDAMENTO
        ) {
            return;
        }

        console.log(
            `Sala ${sala.codigo}: tempo da rodada esgotado!`
        );

        let resultado;

        // Apenas jogador 1 jogou

        if (
            sala.jogadas.jogador1 &&
            !sala.jogadas.jogador2
        ) {

            resultado = "jogador1";
        }

        // Apenas jogador 2 jogou

        else if (
            !sala.jogadas.jogador1 &&
            sala.jogadas.jogador2
        ) {

            resultado = "jogador2";
        }

        // Ninguém jogou

        else if (
            !sala.jogadas.jogador1 &&
            !sala.jogadas.jogador2
        ) {

            resultado = "empate";
        }

        // Ambos jogaram

        else {

            resultado =
                determinarResultado(
                    sala.jogadas.jogador1,
                    sala.jogadas.jogador2
                );
        }

        if (
            resultado === "jogador1"
        ) {

            sala.placarRodadas.jogador1++;
        }

        if (
            resultado === "jogador2"
        ) {

            sala.placarRodadas.jogador2++;
        }

        io.to(sala.codigo)
            .emit(
                "resultado_rodada",
                {
                    rodada: sala.rodada,

                    jogadas: {
                        ...sala.jogadas
                    },

                    resultado,

                    timeout: true,

                    placar: {
                        ...sala.placarRodadas
                    }
                }
            );

        sala.jogadas = {

            jogador1: null,
            jogador2: null

        };
        // ----------------------------------
        // Verifica se alguém venceu a partida
        // ----------------------------------

        const houveVencedor =

            resultado !== "empate"

            &&

            sala.placarRodadas[
            resultado
            ] >= VITORIAS_PARA_GANHAR;

        // ----------------------------------
        // Encerrar partida
        // ----------------------------------

        if (houveVencedor) {

            sala.status = STATUS_PARTIDA.ENCERRADA;

            emitirStatus(sala);

            io.to(sala.codigo).emit(
                "fim_partida",
                {
                    vencedor: resultado,
                    placar: {
                        ...sala.placarRodadas
                    }
                }
            );
        }

        // ----------------------------------
        // Próxima rodada
        // ----------------------------------

 else {

            if (
                resultado !== "empate"
            ) {

                sala.rodada++;
            }

            emitirPlacar(
                sala
            );

    sala.status =
        STATUS_PARTIDA.CARREGANDO;

    emitirStatus(
        sala
    );

    sala.temporizadorProximaRodada =
        setTimeout(() => { sala.temporizadorProximaRodada =null;

            if (sala.status !==STATUS_PARTIDA.CARREGANDO) 
                {return;
            }

            sala.status =STATUS_PARTIDA.EM_ANDAMENTO;  
            emitirStatus(sala);
            iniciarCronometroRodada(sala);
        }, 3000);
}
  
  }, TEMPO_RODADA_MS);

}

function cancelarCronometroRodada(sala) {
    if (sala.temporizadorRodada !== null) {
        clearTimeout(sala.temporizadorRodada);
        sala.temporizadorRodada = null;
    }
}

function reiniciarPartida(sala) {
    cancelarCronometroRodada(sala);
    if (
        sala.temporizadorProximaRodada
    ) {

        clearTimeout(
            sala.temporizadorProximaRodada
        );

        sala.temporizadorProximaRodada =null;
    }

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
    iniciarCronometroRodada(sala)
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
        if (!sala.aceitandoJogadas) {

    return socket.emit("erro",
        {
            mensagem:"A rodada já foi encerrada."
        }
    );
}
 // 
// ISSUE #18
// Bloqueia jogadas após o timeout

        if (
            sala.status !==
            STATUS_PARTIDA.EM_ANDAMENTO
        ) {

    return socket.emit(
        "erro",
        {
            mensagem:"A partida ainda não está em andamento."
        }
    );
}

if (
    sala.temporizadorRodada === null
) {

    return socket.emit(
        "erro",
        {
            mensagem:
                "O tempo da rodada acabou."
        }
    );
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
        if (sala.temporizadorRodada === null) {
            iniciarCronometroRodada(sala);
        }
        console.log(`${jogador} escolheu: ${jogada}`);

        socket.emit("jogada_registrada", { jogada });
        socket.to(sala.codigo).emit("login", `${nomeDoPapel(jogador)} já jogou!`);

        if (sala.jogadas.jogador1 === null || sala.jogadas.jogador2 === null) return;
        cancelarCronometroRodada(sala);
        sala.aceitandoJogadas =false;

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

    if (
        resultado !== "empate"
    ) {

        sala.rodada++;
    }

    emitirPlacar(
        sala
    );

    sala.status =
        STATUS_PARTIDA.CARREGANDO;

    emitirStatus(
        sala
    );

    sala.temporizadorProximaRodada =
        setTimeout(() => {

            sala.temporizadorProximaRodada =
                null;

            if (
                sala.status !==
                STATUS_PARTIDA.CARREGANDO
            ) {
                return;
            }

            sala.status =
                STATUS_PARTIDA.EM_ANDAMENTO;

            emitirStatus(
                sala
            );

            iniciarCronometroRodada(
                sala
            );

        }, 3000);
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
        iniciarCronometroRodada(sala)
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
    console.log(`Acesse: http://${ipv4}:${PORT}`);
});