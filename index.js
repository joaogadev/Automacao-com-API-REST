import fs from "node:fs";
import { parse } from "csv-parse/sync";

const erros = [];

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

        erros.push({
            mensagem: err.message,
            metodo: "escreverJson"
        })

        throw err;
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
            throw new Error("CEP não encontrado.");
        }

        let url = await fetch(`https://viacep.com.br/ws/${cepBuscado}/json/`);

        if (!url.ok) {
            throw new Error(`Erro ao buscar o registro por CEP: ${url.status} - ${url.statusText}`);
        }

        const dadosCep = await url.json();

        if (dadosCep.erro === "true") {
            throw new Error("CEP inválido ou não encontrado na API.");
        }

        return dadosCep;

    } catch (err) {
        console.error("Não foi possível buscar o registro por CEP:", err.message);

        erros.push({
            cep: cepBuscado,
            mensagem: err.message,
            metodo: "buscarRegistroPorCep"
        })

        throw err;
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

async function objetoEnriquecido(cepBuscado) {
    try {
        let dataJsonOriginal = escreverJson("consulta.csv");
        let dadosBuscados = await buscarRegistroPorCep(cepBuscado);
        let getLogradouro = dadosBuscados.logradouro;

        console.log(getLogradouro);

        let getBairro = dadosBuscados.bairro;

        console.log(getBairro);

        const item = dataJsonOriginal.find(
            item => item.cep.trim() === String(cepBuscado).trim()
        );
   
        item.slug = makeSlug(item.nome);

        item.servicos = item.servicos.split(";");

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

        return item;

    } catch (err) {
        console.error("Não foi possível enriquecer o json", cepBuscado, err.message);

        throw err;
    }
}

async function criarJsonFinal() {
    try {
        const resultado = [];
        const item = await escreverJson("consulta.csv");
        for (const data of item) {
            try {
                const objeto = await objetoEnriquecido(data.cep);

                console.log(objeto);

                resultado.push(objeto);
            } catch (err) {
                console.error(`Erro ao processar o CEP ${data.cep}:`, err.message);

                erros.push({
                    cep: data.cep,
                    mensagem: err.message,
                    metodo: "for do criarJsonFinal"
                });

                continue;
            }
            
        }

        const final = fs.writeFileSync(
            "posicionamento.json",
            JSON.stringify(resultado, null, 2),
            "utf8"
        );

        return JSON.parse(fs.readFileSync("posicionamento.json", "utf8"));

    } catch (err) {
        console.error("Não foi possível criar o JSON final:", err.message);

        erros.push({
            mensagem: err.message,
            metodo: "criarJsonFinal"
        });
    }
}

async function main() {
    let cep = "49010-390";
    const resultado = await criarJsonFinal();
    console.log(resultado);
    fs.writeFileSync(
        "erros.json",
        JSON.stringify(erros, null, 2),
        "utf8"  
    );
    console.log("Erros encontrados:", erros);
}

main();