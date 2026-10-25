
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const PORT = 3000;


app.use(express.static("public"));

let jogador1 = null;
let jogador2 = null;


io.on("connection", (socket) => {
    console.log("Um jogador entrou!");
    

     if (jogador1 === null) {
        jogador1 = socket;
        console.log("Jogador 1 conectado");
        io.emit("login","Jogador 1 entrou!");
        socket.emit("tipoJogador","Você é o Jogador 1");
    }

    else if (jogador2 === null) {
    jogador2 = socket;
    console.log("Jogador 2 conectado!");
    io.emit("login", "Jogador 2 entrou!");
    socket.emit("tipoJogador","Você é o Jogador 2");
    }

    else {
    console.log("Espectador conectado!");
    io.emit("login", "Um Espectador entrou!");
    socket.emit("tipoJogador","Você é um espectador");
    
            }

    
    socket.on("disconnect", () => {
        console.log("Um jogador saiu!");
        io.emit("logout", "Um jogador saiu!");
    });
});

//Inicia o servidor
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});