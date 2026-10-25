// Cada sala guarda seus próprios participantes e o estado da própria partida.

const salas = new Map(); // codigo -> sala
const CARACTERES = "0123456789";

// Gera um código de 4 caracteres que ainda não está em uso
function gerarCodigo() {
    let codigo;
    do {
        codigo = "";
        for (let i = 0; i < 4; i++) {
            codigo += CARACTERES[Math.floor(Math.random() * CARACTERES.length)];
        }
    } while (salas.has(codigo));
    return codigo;
}

// Cria uma sala nova, vazia, e devolve o objeto da sala
function criarSala() {
    const codigo = gerarCodigo();
    const sala = {
        codigo,
        status: "AGUARDANDO_OPONENTE",
        jogador1: null,
        jogador2: null,
        espectadores: [],
        rodada: 1,
        placarRodadas: { jogador1: 0, jogador2: 0 },
        placarSessao: { jogador1: 0, jogador2: 0 },
        versao: 0
    };
    salas.set(codigo, sala);
    return sala;
}

// Devolve a sala do código informado, ou null se não existir
function consultarSala(codigo) {
    return salas.get(codigo) || null;
}

// Remove a sala da memória; devolve true se ela existia
function liberarSala(codigo) {
    return salas.delete(codigo);
}

module.exports = { criarSala, consultarSala, liberarSala };