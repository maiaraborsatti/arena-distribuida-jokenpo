const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const PORT = 3000;
const { criarSala, consultarSala, STATUS_PARTIDA } = require("./salas");

app.use(express.static("public"));


io.on("connection", (socket) => {
    console.log("Um jogador entrou!");

    //Atribui o papel dentro da sala (mesma lógica de antes, agora por sala)
    function entrarNaSala(sala) {
        let papel;
        if (sala.jogador1 === null) {
            sala.jogador1 = socket;
            papel = "jogador1";
            console.log(`Jogador 1 conectado na sala ${sala.codigo}`);


        } else if (sala.jogador2 === null) {
            sala.jogador2 = socket;
            papel = "jogador2";
            console.log(`Jogador 2 conectado na sala ${sala.codigo}`);
        } else {
            sala.espectadores.push(socket);
            papel = "espectador";
            console.log(`Espectador conectado na sala ${sala.codigo}`);
        }

        if (sala.jogador1 !== null && sala.jogador2 !== null) 
        {
        sala.status = STATUS_PARTIDA.CARREGANDO;//Verifica se os dois jogadores estão na sala, prepara para a issue 10
        console.log(`Sala ${sala.codigo}: ${sala.status}`);

        io.to(sala.codigo).emit("status_partida", {
        status: sala.status
             });

            sala.temporizador = setTimeout(() => {
            sala.status = STATUS_PARTIDA.EM_ANDAMENTO;
            console.log(`Sala ${sala.codigo}: ${sala.status}`);
            sala.temporizador = null;

            io.to(sala.codigo).emit("status_partida", {
            status: sala.status
            });

            }, 5000);



        }

        

        socket.join(sala.codigo);
        socket.data.codigo = sala.codigo;
        socket.emit("sala_entrada", { codigo: sala.codigo, papel });
        io.to(sala.codigo).emit("login", `Entrou na sala: ${papel}`);
    }

    socket.on("criar_sala", () => {
        if (socket.data.codigo) {
            return socket.emit("erro", { codigo: "JA_ESTA_EM_SALA", mensagem: "Você já está em uma sala." });
        }
        entrarNaSala(criarSala());
    });

    socket.on("entrar_sala", (dados) => {
        if (socket.data.codigo) {
            return socket.emit("erro", { codigo: "JA_ESTA_EM_SALA", mensagem: "Você já está em uma sala." });
        }
        const sala = consultarSala(dados && dados.codigo);
        if (!sala) {
            return socket.emit("erro", { codigo: "SALA_INEXISTENTE", mensagem: "Sala não encontrada." });
        }
        entrarNaSala(sala);
    });

    socket.on("clique", () => {
        const sala = consultarSala(socket.data.codigo);
        if (!sala) return;

        //Verifica se quem clicou é o Jogador 1
        if (socket === sala.jogador1) {
            io.to(sala.codigo).emit("login", "Jogador 1 clicou!");
        }

        //Verifica se quem clicou é o Jogador 2
        else if (socket === sala.jogador2) {
            io.to(sala.codigo).emit("login", "Jogador 2 clicou!");
        }
    });


    socket.on("disconnect", () => {
        console.log("Um jogador saiu!");
        if (socket.data.codigo) {
            io.to(socket.data.codigo).emit("logout", "Um jogador saiu!");
        }
    });
});

//Inicia o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});