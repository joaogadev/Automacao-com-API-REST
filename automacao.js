import fs from "node:fs";
import { parse } from "csv-parse/sync";

const urlWebHook = "https://webhooktest.net/webhook/019fdcad-3086-7298-b233-8a6c79eb12db";

const erros = [];
let objetosTotais = 0;
let objetosComErro = 0;

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
        console.error("Não foi possível escrever o arquivo JSON:", err.message + "\n");

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
            objetosComErro++
            console.error("CEP não encontrado.", cepBuscado + "\n");
            throw new Error("CEP não encontrado.");
        }

        let url = await fetch(`https://viacep.com.br/ws/${cepBuscado}/json/`);

        if (!url.ok) {
            objetosComErro++;
            throw new Error(`Erro ao buscar o registro por CEP: ${url.status} - ${url.statusText}`);
        }

        const dadosCep = await url.json();

        if (dadosCep.erro === "true") {
            objetosComErro++;
            throw new Error("CEP inválido ou não encontrado na API.");
        }

        return dadosCep;

    } catch (err) {
        console.error("Não foi possível buscar o registro por CEP:", cepBuscado, err.message + "\n");

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
        let getBairro = dadosBuscados.bairro;

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
        console.error("Não foi possível enriquecer o json", cepBuscado, err.message + "\n");

        throw err;
    }
}

async function criarJsonFinal() {
    try {
        const resultado = [];
        const item = await escreverJson("consulta.csv");
        for (const data of item) {
            objetosTotais++;
            try {
                const objeto = await objetoEnriquecido(data.cep);

                //console.log(objeto);

                resultado.push(objeto);
            } catch (err) {
                console.error(`Erro ao processar o CEP ${data.cep}:`, err.message + "\n");

                erros.push({
                    cep: data.cep,
                    mensagem: err.message,
                    metodo: "For do criarJsonFinal"
                });

                continue;
            }
            
        }

        const final = fs.writeFileSync(
            "provisionamento.json",
            JSON.stringify(resultado, null, 2),
            "utf8"
        );

        return JSON.parse(fs.readFileSync("provisionamento.json", "utf8"));

    } catch (err) {
        console.error("Não foi possível criar o JSON final:", err.message + "\n");

        erros.push({
            mensagem: err.message,
            metodo: "criarJsonFinal"
        });
    }
}

async function enviarWebHook(resultado) {
    const data = {
        evento: "processamento_concluido",
        resumo: {
            objetosTotais: objetosTotais,
            objetosComSucesso: objetosTotais - objetosComErro,
            erros: erros
        },

        resultado,
        erros,
        dataProcessamento: new Date().toISOString()
    };

    const resposta = await fetch(urlWebHook, {
        method: "POST",

        header: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(data)
    });

    if (!resposta.ok) {
        throw new Error(`Erro ao enviar o webhook: ${resposta.status} - ${resposta.statusText} \n`);
    }
}

async function main() {
    try {
        objetosTotais = 0;
        objetosComErro = 0;
        erros.length = 0;
        const resultado = await criarJsonFinal();
        fs.writeFileSync(
            "erros.json",
            JSON.stringify(erros, null, 2),
            "utf8"  
        );
        await enviarWebHook(resultado);
        console.log("Total de objetos processados com sucesso:", objetosTotais - objetosComErro + "\n");
        console.log("Total de objetos com erro:", objetosComErro + "\n");
        console.log("Erros encontrados:", erros);
    }
    catch (err) {
        console.error("Erro no processamento:", err.message + "\n");
    }
}

async function iniciarAutomacao() {
    await main();
}

iniciarAutomacao();
setInterval(iniciarAutomacao, 60 * 1000); // Executa a cada 1 minuto