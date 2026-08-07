import fs from "node:fs";
import { parse } from "csv-parse/sync";

function escreverJson(caminhoArquivo) {
    try {
        const arq = fs.readFileSync(caminhoArquivo, "utf8");

        const dados = parse(arq, {
            columns: true,
            skip_empty_lines: true
        });

         fs.writeFileSync(
            "consulta.json", 
            JSON.stringify(dados, null ,2), 
            "utf8"
        );

        const jsonData = fs.readFileSync("consulta.json", "utf8");

        return JSON.parse(jsonData);

    } catch (err) {
        console.error("Não foi possível escrever o arquivo JSON:", err.message);
    }
}

async function buscarRegistroPorCep(cepBuscado) {
    try {
        
        let data = escreverJson("consulta.csv");

        let cep = data.find(
            item => item.cep.trim() == String(cepBuscado).trim()
        );
        
        if (!cep) {
            console.error("CEP não encontrado.");
            return;
        }

        let url = `https://viacep.com.br/ws/${cepBuscado}/json/`;

        return await fetch(url).then(resp => resp.json());

    } catch (err) {
        console.error("Não foi possível buscar o registro por CEP:", err.message);
    }
}

function makeSlug(text) {
    return text.normalize("NFD") //separa letras de acentos
        .replace(/[\u0300-\u036f]/g, "") //tira acentos
        .toLowerCase() 
        .trim()
        .replace(/\s+/g, "-") //substitui espaços por hífens
        .replace(/[^\w\-]+/g, "") //remove caracteres especiais
        .replace(/\-\-+/g, "-"); //remove hífens duplicados
}

async function criarJsonFinal(cepBuscado) {
    try {
        let dataJsonOriginal = escreverJson("consulta.csv");

        let getLogradouro = await buscarRegistroPorCep(cepBuscado).then(data => data.logradouro);

        console.log(getLogradouro);

        let getBairro = await buscarRegistroPorCep(cepBuscado).then(data => data.bairro);

        console.log(getBairro);

        const item = dataJsonOriginal.find(
            item => item.cep.trim() === String(cepBuscado).trim()
        );

        const serv = dataJsonOriginal.find(
            item => item.cep.trim() === String(cepBuscado).trim()
        ).servicos;
        
        item.slug = makeSlug(item.nome);

        item.endereco = {
            logradouro: getLogradouro,
            bairro: getBairro,
            cidade: item.cidade,
            uf: item.uf,
            cep: item.cep
        };

        delete item.cidade;
        delete item.uf;
        delete item.cep;

        const final = fs.writeFileSync(
            "posicionamento.json",
            JSON.stringify(dataJsonOriginal, null, 2),
            "utf8"
        );

        return JSON.parse(fs.readFileSync("posicionamento.json", "utf8"));

    } catch (err) {
        console.error("Não foi possível buscar o registro por logradouro e bairro:", err.message);
    }
}

async function main() {
    let cep = "49010-390";
    console.log(await criarJsonFinal(cep));
}

main();