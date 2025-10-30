// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicação...');

    // Configurar event listeners dos botões principais
    document.getElementById('btn_add_entrada').addEventListener('click', adicionarEntrada);
    document.getElementById('btn_add_gasto').addEventListener('click', adicionarGasto);
    document.getElementById('btn_add_divida').addEventListener('click', adicionarDivida);
    document.getElementById('btn_salvar_fixas').addEventListener('click', salvarFixas);
    document.getElementById('btn_consultar').addEventListener('click', atualizarResumo);
    document.getElementById('btn_enviar_chat').addEventListener('click', enviarMensagem);

        // Carregar dados iniciais
    setTimeout(() => {
        atualizarListas();
        atualizarResumo();
        carregarFixas();
    }, 1000);


// Chat - VERSÃO MELHORADA COM ATUALIZAÇÃO AUTOMÁTICA
async function enviarMensagem() {
    const input = document.getElementById('chat_msg');
    const msg = input.value.trim();

    if (!msg) return;

    const chatBox = document.getElementById('chat_box');
    chatBox.innerHTML += `<div class="user_msg">👤 Você: ${msg}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    input.value = '';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({msg})
        });

        const data = await response.json();
        chatBox.innerHTML += `<div class="bot_msg">🤖 Assistente: ${data.resposta}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

        // 🔄 ATUALIZAR TUDO SE A MENSAGEM FOR DELEÇÃO OU REGISTRO
        if (data.resposta.includes('✅') || data.resposta.includes('delet') || data.resposta.includes('remove') || data.resposta.includes('registrada')) {
            console.log('🔄 Atualizando interface após ação...');

            // Pequeno delay para garantir que o banco foi atualizado
            setTimeout(async () => {
                await atualizarListas();
                await atualizarResumo();
                await atualizarGrafico();
                console.log('✅ Interface atualizada!');
            }, 800);
        }

    } catch (error) {
        console.error('❌ Erro no chat:', error);
        chatBox.innerHTML += `<div class="bot_msg error">❌ Erro: ${error.message}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

    // Carregar dados iniciais
    setTimeout(() => {
        atualizarListas();
        atualizarResumo();
        carregarFixas();
    }, 1000);
});

// Funções principais
async function adicionarEntrada() {
    const desc = document.getElementById('entrada_desc').value.trim();
    const val = parseFloat(document.getElementById('entrada_val').value);

    if (!desc || isNaN(val)) {
        alert('Preencha descrição e valor!');
        return;
    }

    try {
        const response = await fetch('/add_entrada', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({descricao: desc, valor: val})
        });

        const data = await response.json();

        if (data.ok) {
            document.getElementById('entrada_desc').value = '';
            document.getElementById('entrada_val').value = '';
            atualizarListas();
            atualizarResumo();
            alert('✅ Entrada adicionada!');
        } else {
            alert('❌ Erro: ' + data.error);
        }
    } catch (error) {
        alert('❌ Erro de conexão');
    }
}

async function adicionarGasto() {
    const desc = document.getElementById('gasto_desc').value.trim();
    const cat = document.getElementById('gasto_cat').value.trim() || 'outros';
    const val = parseFloat(document.getElementById('gasto_val').value);

    if (!desc || isNaN(val)) {
        alert('Preencha descrição e valor!');
        return;
    }

    try {
        const response = await fetch('/add_gasto', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                descricao: desc,
                categoria: cat,
                valor: val
            })
        });

        const data = await response.json();

        if (data.ok) {
            document.getElementById('gasto_desc').value = '';
            document.getElementById('gasto_cat').value = '';
            document.getElementById('gasto_val').value = '';
            atualizarListas();
            atualizarResumo();
            alert('✅ Gasto adicionado!');
        } else {
            alert('❌ Erro: ' + data.error);
        }
    } catch (error) {
        alert('❌ Erro de conexão');
    }
}

async function adicionarDivida() {
    const desc = document.getElementById('div_desc').value.trim();
    const val = parseFloat(document.getElementById('div_val').value);
    const venc = document.getElementById('div_venc').value;

    if (!desc || isNaN(val) || !venc) {
        alert('Preencha todos os campos!');
        return;
    }

    try {
        const response = await fetch('/add_divida', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                descricao: desc,
                valor: val,
                vencimento: venc
            })
        });

        const data = await response.json();

        if (data.ok) {
            document.getElementById('div_desc').value = '';
            document.getElementById('div_val').value = '';
            document.getElementById('div_venc').value = '';
            atualizarListas();
            atualizarResumo();
            alert('✅ Dívida adicionada!');
        } else {
            alert('❌ Erro: ' + data.error);
        }
    } catch (error) {
        alert('❌ Erro de conexão');
    }
}

async function salvarFixas() {
    const fixas = {
        'Internet': parseFloat(document.getElementById('fixa_internet').value || 0),
        'Energia': parseFloat(document.getElementById('fixa_energia').value || 0),
        'Apartamento': parseFloat(document.getElementById('fixa_apartamento').value || 0),
        'Gás': parseFloat(document.getElementById('fixa_gas').value || 0),
        'Pensão': parseFloat(document.getElementById('fixa_pensao').value || 0)
    };

    try {
        for (const [nome, valor] of Object.entries(fixas)) {
            if (valor > 0) {
                await fetch('/fixas', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({nome, valor})
                });
            }
        }

        alert('✅ Despesas fixas salvas!');
        atualizarResumo();
    } catch (error) {
        alert('❌ Erro ao salvar fixas');
    }
}

// Funções de atualização
async function atualizarListas() {
    try {
        const response = await fetch('/list_all');
        const data = await response.json();

        // Entradas - COM DATA
        const listaEntradas = document.getElementById('lista_entradas');
        listaEntradas.innerHTML = data.entradas.map(e =>
            `<div class="item_lista">
                <strong>${e.descricao}</strong>
                <span>R$ ${e.valor.toFixed(2)}</span>
                <small>${e.data || 'Data não informada'}</small>
            </div>`
        ).join('');

        // Gastos - COM DATA
        const listaGastos = document.getElementById('lista_gastos');
        listaGastos.innerHTML = data.gastos.map(g =>
            `<div class="item_lista">
                <strong>${g.descricao}</strong>
                <span>R$ ${g.valor.toFixed(2)}</span>
                <small>${g.categoria} - ${g.data || 'Data não informada'}</small>
            </div>`
        ).join('');

        // Dívidas - COM DATA
        const listaDividas = document.getElementById('lista_dividas');
        listaDividas.innerHTML = data.dividas.map(d =>
            `<div class="item_lista">
                <strong>${d.descricao}</strong>
                <span>R$ ${d.valor.toFixed(2)}</span>
                <small>Venc: ${d.vencimento || 'Não informado'} - ${d.data || 'Data não informada'}</small>
            </div>`
        ).join('');

    } catch (error) {
        console.error('Erro ao atualizar listas:', error);
    }
}
async function atualizarResumo() {
    try {
        const response = await fetch('/consultar');
        const data = await response.json();

        const resumo = document.getElementById('resumo');
        resumo.innerHTML = `
            <div class="resumo_item ${data.saldo >= 0 ? 'positivo' : 'negativo'}">
                💰 Saldo: R$ ${data.saldo.toFixed(2)}
            </div>
            <div class="resumo_item">📥 Entradas: R$ ${data.entradas.toFixed(2)}</div>
            <div class="resumo_item">📤 Gastos: R$ ${data.gastos.toFixed(2)}</div>
            <div class="resumo_item">🏠 Fixas: R$ ${data.fixas.toFixed(2)}</div>
            <div class="resumo_item">📋 Dívidas: R$ ${data.dividas.toFixed(2)}</div>
        `;

        const dicas = document.getElementById('dicas');
        dicas.innerHTML = data.dicas.map(dica =>
            `<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px;">💡 ${dica}</div>`
        ).join('');

        await atualizarGrafico();

    } catch (error) {
        console.error('Erro ao atualizar resumo:', error);
    }
}

// ---- Gráfico de Pizza Dinâmico ----
async function atualizarGrafico() {
    try {
        const response = await fetch('/grafico_dados');
        const data = await response.json();

        const ctx = document.getElementById('graficoGastos').getContext('2d');

        // Destruir gráfico anterior se existir
        if (window.grafico) {
            window.grafico.destroy();
        }

        // Calcular totais e porcentagens
        const totalGastos = data.valores.reduce((sum, valor) => sum + valor, 0);
        const porcentagens = data.valores.map(valor =>
            totalGastos > 0 ? ((valor / totalGastos) * 100).toFixed(1) : 0
        );

        // Criar labels com valores e porcentagens
        const labelsComValores = data.labels.map((label, index) => {
            const valor = data.valores[index];
            const porcentagem = porcentagens[index];
            return `${label}\nR$ ${valor.toFixed(2)} (${porcentagem}%)`;
        });

        // Cores vibrantes para o gráfico
        const cores = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
            '#7CFFB2', '#F465C4', '#8AE1FC', '#FFD93D'
        ];

        // Criar novo gráfico de pizza
        window.grafico = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labelsComValores,
                datasets: [{
                    data: data.valores,
                    backgroundColor: cores,
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: window.innerWidth < 768 ? 10 : 12
                            },
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i];
                                        const percentage = totalGastos > 0 ?
                                            ((value / totalGastos) * 100).toFixed(1) : 0;

                                        return {
                                            text: `${label.split('\n')[0]} - R$ ${value.toFixed(2)} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            strokeStyle: data.datasets[0].borderColor,
                                            lineWidth: data.datasets[0].borderWidth,
                                            hidden: isNaN(value) || value === 0,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const percentage = totalGastos > 0 ?
                                    ((value / totalGastos) * 100).toFixed(1) : 0;
                                return `${label.split('\n')[0]}: R$ ${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    },
                    // Título do gráfico
                    title: {
                        display: true,
                        text: `Distribuição de Gastos - Total: R$ ${totalGastos.toFixed(2)}`,
                        font: {
                            size: window.innerWidth < 768 ? 14 : 16,
                            weight: 'bold'
                        },
                        padding: 20
                    }
                },
                // Animação suave
                animation: {
                    animateScale: true,
                    animateRotate: true
                },
                // Interatividade
                onClick: function(evt, elements) {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const categoria = data.labels[index];
                        const valor = data.valores[index];
                        const porcentagem = porcentagens[index];

                        // Mostrar detalhes da categoria clicada
                        alert(`📊 ${categoria}\n💵 Valor: R$ ${valor.toFixed(2)}\n📈 Porcentagem: ${porcentagem}%`);
                    }
                }
            }
        });

        // Atualizar informações adicionais se houver elemento
        const infoGrafico = document.getElementById('infoGrafico');
        if (infoGrafico) {
            infoGrafico.innerHTML = `
                <div style="text-align: center; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                    <strong>📊 Resumo dos Gastos</strong><br>
                    <small>Total: R$ ${totalGastos.toFixed(2)}</small><br>
                    <small>Categorias: ${data.labels.length}</small>
                </div>
            `;
        }

    } catch (error) {
        console.error('❌ Erro ao atualizar gráfico:', error);

        // Fallback - mensagem de erro
        const ctx = document.getElementById('graficoGastos').getContext('2d');
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('📊 Gráfico indisponível', ctx.canvas.width / 2, ctx.canvas.height / 2);
    }
}

async function carregarFixas() {
    try {
        const response = await fetch('/fixas');
        const data = await response.json();

        document.getElementById('fixa_internet').value = data.Internet || '';
        document.getElementById('fixa_energia').value = data.Energia || '';
        document.getElementById('fixa_apartamento').value = data.Apartamento || '';
        document.getElementById('fixa_gas').value = data['Gás'] || '';
        document.getElementById('fixa_pensao').value = data.Pensão || '';

    } catch (error) {
        console.error('Erro ao carregar fixas:', error);
    }
}

// Chat
async function enviarMensagem() {
    const input = document.getElementById('chat_msg');
    const msg = input.value.trim();

    if (!msg) return;

    const chatBox = document.getElementById('chat_box');
    chatBox.innerHTML += `<div class="user_msg">Você: ${msg}</div>`;
    input.value = '';

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({msg})
        });

        const data = await response.json();
        chatBox.innerHTML += `<div class="bot_msg">Assistente: ${data.resposta}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (error) {
        chatBox.innerHTML += `<div class="bot_msg">Erro: Não foi possível conectar</div>`;
    }
}

// =============================================
// FUNÇÕES DO MODAL DE RELATÓRIOS (CORRIGIDAS)
// =============================================

// Variáveis globais para o modal
let tipoRelatorioAtual = '';

// Funções do Modal de Relatórios
function abrirRelatorio(tipo) {
    console.log('📊 Abrindo relatório:', tipo);
    tipoRelatorioAtual = tipo;
    const modal = document.getElementById('modalRelatorio');
    const titulo = document.getElementById('modalTitulo');

    // Definir título baseado no tipo
    const titulos = {
        'entradas': '📥 Relatório de Entradas',
        'gastos': '📤 Relatório de Gastos',
        'dividas': '📋 Relatório de Dívidas',
        'fixas': '🏠 Relatório de Despesas Fixas',
        'geral': '📊 Relatório Geral'
    };

    titulo.textContent = titulos[tipo] || 'Relatório';
    modal.style.display = 'block';

    // Limpar conteúdo anterior
    document.getElementById('relatorioConteudo').innerHTML = '<p>Selecione o mês e ano para gerar o relatório.</p>';

    // Preencher ano atual como padrão
    const anoAtual = new Date().getFullYear();
    document.getElementById('selectAno').value = anoAtual;

    // Preencher mês atual como padrão
    const mesAtual = (new Date().getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('selectMes').value = mesAtual;
}

function fecharModal() {
    console.log('❌ Fechando modal');
    document.getElementById('modalRelatorio').style.display = 'none';
}

async function gerarRelatorio() {
    const mes = document.getElementById('selectMes').value;
    const ano = document.getElementById('selectAno').value;

    console.log('🎯 Gerando relatório:', { tipo: tipoRelatorioAtual, mes, ano });

    if (!mes || !ano) {
        alert('Selecione o mês e o ano!');
        return;
    }

    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-31`;

    try {
        const relatorioConteudo = document.getElementById('relatorioConteudo');
        relatorioConteudo.innerHTML = '<p>⏳ Gerando relatório...</p>';

        switch(tipoRelatorioAtual) {
            case 'entradas':
                await gerarRelatorioEntradas(dataInicio, dataFim, mes, ano);
                break;
            case 'gastos':
                await gerarRelatorioGastos(dataInicio, dataFim, mes, ano);
                break;
            case 'dividas':
                await gerarRelatorioDividas(dataInicio, dataFim, mes, ano);
                break;
            case 'fixas':
                await gerarRelatorioFixas();
                break;
            case 'geral':
                await gerarRelatorioGeral(dataInicio, dataFim, mes, ano);
                break;
            default:
                relatorioConteudo.innerHTML = '<div style="color: red;">❌ Tipo de relatório não reconhecido</div>';
        }
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        document.getElementById('relatorioConteudo').innerHTML =
            '<div style="color: red;">❌ Erro ao gerar relatório: ' + error.message + '</div>';
    }
}

// Relatório de Entradas
async function gerarRelatorioEntradas(dataInicio, dataFim, mes, ano) {
    const response = await fetch(`/list_all?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    const data = await response.json();

    const entradas = data.entradas || [];
    const total = entradas.reduce((sum, item) => sum + item.valor, 0);

    const conteudo = `
        <div class="relatorio-detalhes">
            <h3>📥 Entradas - ${mes}/${ano}</h3>
            ${entradas.length === 0 ?
                '<p>Nenhuma entrada encontrada para este período.</p>' :
                entradas.map(entrada => `
                    <div class="relatorio-item">
                        <strong>${entrada.descricao}</strong><br>
                        <span>R$ ${entrada.valor.toFixed(2)}</span> -
                        <small>${entrada.data}</small>
                    </div>
                `).join('')
            }
            <div class="relatorio-total">
                💰 Total: R$ ${total.toFixed(2)}
            </div>
        </div>
    `;

    document.getElementById('relatorioConteudo').innerHTML = conteudo;
}

// Relatório de Gastos
async function gerarRelatorioGastos(dataInicio, dataFim, mes, ano) {
    const response = await fetch(`/list_all?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    const data = await response.json();

    const gastos = data.gastos || [];
    const total = gastos.reduce((sum, item) => sum + item.valor, 0);

    // Agrupar por categoria
    const gastosPorCategoria = {};
    gastos.forEach(gasto => {
        if (!gastosPorCategoria[gasto.categoria]) {
            gastosPorCategoria[gasto.categoria] = [];
        }
        gastosPorCategoria[gasto.categoria].push(gasto);
    });

    const conteudo = `
        <div class="relatorio-detalhes">
            <h3>📤 Gastos - ${mes}/${ano}</h3>
            ${gastos.length === 0 ?
                '<p>Nenhum gasto encontrado para este período.</p>' :
                Object.entries(gastosPorCategoria).map(([categoria, itens]) => {
                    const totalCategoria = itens.reduce((sum, item) => sum + item.valor, 0);
                    return `
                        <div style="margin-bottom: 15px;">
                            <h4>${categoria} - R$ ${totalCategoria.toFixed(2)}</h4>
                            ${itens.map(gasto => `
                                <div class="relatorio-item">
                                    <strong>${gasto.descricao}</strong><br>
                                    <span>R$ ${gasto.valor.toFixed(2)}</span> -
                                    <small>${gasto.data}</small>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')
            }
            <div class="relatorio-total">
                💸 Total: R$ ${total.toFixed(2)}
            </div>
        </div>
    `;

    document.getElementById('relatorioConteudo').innerHTML = conteudo;
}

// Relatório de Dívidas
async function gerarRelatorioDividas(dataInicio, dataFim, mes, ano) {
    const response = await fetch(`/list_all?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    const data = await response.json();

    const dividas = data.dividas || [];
    const total = dividas.reduce((sum, item) => sum + item.valor, 0);

    const conteudo = `
        <div class="relatorio-detalhes">
            <h3>📋 Dívidas - ${mes}/${ano}</h3>
            ${dividas.length === 0 ?
                '<p>Nenhuma dívida encontrada para este período.</p>' :
                dividas.map(divida => `
                    <div class="relatorio-item">
                        <strong>${divida.descricao}</strong><br>
                        <span>R$ ${divida.valor.toFixed(2)}</span><br>
                        <small>Vencimento: ${divida.vencimento || 'Não informado'}</small>
                    </div>
                `).join('')
            }
            <div class="relatorio-total">
                📋 Total: R$ ${total.toFixed(2)}
            </div>
        </div>
    `;

    document.getElementById('relatorioConteudo').innerHTML = conteudo;
}

// Relatório de Despesas Fixas
async function gerarRelatorioFixas() {
    const response = await fetch('/fixas');
    const fixas = await response.json();

    const total = Object.values(fixas).reduce((sum, valor) => sum + valor, 0);

    const conteudo = `
        <div class="relatorio-detalhes">
            <h3>🏠 Despesas Fixas</h3>
            ${Object.keys(fixas).length === 0 ?
                '<p>Nenhuma despesa fixa cadastrada.</p>' :
                Object.entries(fixas).map(([nome, valor]) => `
                    <div class="relatorio-item">
                        <strong>${nome}</strong><br>
                        <span>R$ ${valor.toFixed(2)}</span>
                    </div>
                `).join('')
            }
            <div class="relatorio-total">
                🏠 Total Mensal: R$ ${total.toFixed(2)}
            </div>
        </div>
    `;

    document.getElementById('relatorioConteudo').innerHTML = conteudo;
}

// Relatório Geral
async function gerarRelatorioGeral(dataInicio, dataFim, mes, ano) {
    const response = await fetch(`/consultar?data_inicio=${dataInicio}&data_fim=${dataFim}`);
    const data = await response.json();

    const conteudo = `
        <div class="relatorio-detalhes">
            <h3>📊 Relatório Geral - ${mes}/${ano}</h3>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <div style="background: #d4edda; padding: 10px; border-radius: 5px;">
                    <strong>💰 Entradas</strong><br>
                    R$ ${data.entradas.toFixed(2)}
                </div>
                <div style="background: #f8d7da; padding: 10px; border-radius: 5px;">
                    <strong>💸 Gastos</strong><br>
                    R$ ${data.gastos.toFixed(2)}
                </div>
                <div style="background: #fff3cd; padding: 10px; border-radius: 5px;">
                    <strong>🏠 Fixas</strong><br>
                    R$ ${data.fixas.toFixed(2)}
                </div>
                <div style="background: #d1ecf1; padding: 10px; border-radius: 5px;">
                    <strong>📋 Dívidas</strong><br>
                    R$ ${data.dividas.toFixed(2)}
                </div>
            </div>

            <div class="relatorio-total" style="background: ${data.saldo >= 0 ? '#d4edda' : '#f8d7da'};">
                ${data.saldo >= 0 ? '✅' : '❌'} <strong>Saldo Final: R$ ${data.saldo.toFixed(2)}</strong>
            </div>

            ${data.dicas.map(dica => `
                <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px;">
                    💡 ${dica}
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('relatorioConteudo').innerHTML = conteudo;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalRelatorio');
    if (event.target == modal) {
        fecharModal();
    }
}

// Teste rápido - verifique se as funções estão carregadas
console.log('✅ Funções do modal carregadas:', {
    abrirRelatorio: typeof abrirRelatorio,
    fecharModal: typeof fecharModal,
    gerarRelatorio: typeof gerarRelatorio
});

// Função para exportar em PDF (simples)
function exportarPDF() {
    // Criar um elemento temporário para o relatório
    const relatorioConteudo = document.getElementById('relatorioConteudo');
    const titulo = document.getElementById('modalTitulo').textContent;
    const mes = document.getElementById('selectMes').value;
    const ano = document.getElementById('selectAno').value;

    if (!relatorioConteudo.innerHTML.includes('relatorio-detalhes')) {
        alert('Gere um relatório primeiro antes de exportar!');
        return;
    }

    // Criar uma nova janela para impressão
    const janelaImpressao = window.open('', '_blank');
    const dataAtual = new Date().toLocaleDateString();

    janelaImpressao.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório Financeiro</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .header h1 {
                    color: #2c3e50;
                    margin: 0;
                }
                .info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .relatorio-item {
                    margin-bottom: 10px;
                    padding: 8px;
                    border-bottom: 1px solid #ddd;
                }
                .total {
                    background: #f8f9fa;
                    padding: 15px;
                    text-align: center;
                    font-weight: bold;
                    margin-top: 20px;
                    border-radius: 5px;
                }
                .categoria {
                    background: #e9ecef;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 5px;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>💰 Relatório Financeiro</h1>
                <h2>${titulo}</h2>
                <p>Período: ${mes}/${ano} | Gerado em: ${dataAtual}</p>
            </div>
            ${relatorioConteudo.innerHTML}
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🖨️ Imprimir / Salvar como PDF
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                    Fechar
                </button>
            </div>
        </body>
        </html>
    `);

    janelaImpressao.document.close();
}

// Adicionar botão de PDF no modal - ATUALIZE a função abrirRelatorio:
function abrirRelatorio(tipo) {
    console.log('📊 Abrindo relatório:', tipo);
    tipoRelatorioAtual = tipo;
    const modal = document.getElementById('modalRelatorio');
    const titulo = document.getElementById('modalTitulo');

    // Definir título baseado no tipo
    const titulos = {
        'entradas': '📥 Relatório de Entradas',
        'gastos': '📤 Relatório de Gastos',
        'dividas': '📋 Relatório de Dívidas',
        'fixas': '🏠 Relatório de Despesas Fixas',
        'geral': '📊 Relatório Geral'
    };

    titulo.textContent = titulos[tipo] || 'Relatório';
    modal.style.display = 'block';

    // Limpar conteúdo anterior
    document.getElementById('relatorioConteudo').innerHTML = '<p>Selecione o mês e ano para gerar o relatório.</p>';

    // Preencher ano atual como padrão
    const anoAtual = new Date().getFullYear();
    document.getElementById('selectAno').value = anoAtual;

    // Preencher mês atual como padrão
    const mesAtual = (new Date().getMonth() + 1).toString().padStart(2, '0');
    document.getElementById('selectMes').value = mesAtual;
}

// Melhorias para mobile
function melhoriasMobile() {
    // Prevenir zoom em inputs no iOS
    document.addEventListener('touchstart', function() {}, {passive: true});

    // Melhorar feedback tátil
    const botoes = document.querySelectorAll('button');
    botoes.forEach(botao => {
        botao.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.98)';
        });

        botao.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// Inicializar melhorias mobile
document.addEventListener('DOMContentLoaded', function() {
    melhoriasMobile();

    // Resto do seu código de inicialização...
    console.log('🚀 Iniciando aplicação mobile...');

    // Configurar event listeners
    document.getElementById('btn_add_entrada').addEventListener('click', adicionarEntrada);
    document.getElementById('btn_add_gasto').addEventListener('click', adicionarGasto);
    document.getElementById('btn_add_divida').addEventListener('click', adicionarDivida);
    document.getElementById('btn_salvar_fixas').addEventListener('click', salvarFixas);
    document.getElementById('btn_consultar').addEventListener('click', atualizarResumo);
    document.getElementById('btn_enviar_chat').addEventListener('click', enviarMensagem);

    // Carregar dados iniciais
    setTimeout(() => {
        atualizarListas();
        atualizarResumo();
        carregarFixas();
    }, 1000);
});
// =============================================
// FUNÇÕES DOS COMPROVANTES
// =============================================

let tipoComprovanteAtual = '';

function validarArquivo(input) {
    const arquivo = input.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (arquivo && arquivo.size > maxSize) {
        alert('❌ Arquivo muito grande! Máximo: 10MB');
        input.value = '';
    }
}
function abrirModalComprovantes(tipo) {
    console.log('📎 Abrindo modal de comprovantes:', tipo);
    tipoComprovanteAtual = tipo;
    const modal = document.getElementById('modalComprovantes');
    const titulo = document.getElementById('modalComprovantesTitulo');

    titulo.textContent = tipo === 'fixa' ? '📎 Comprovantes - Despesas Fixas' : '📎 Comprovantes - Dívidas';
    modal.style.display = 'block';

    // Limpar campos
    document.getElementById('comprovante_desc').value = '';
    document.getElementById('comprovante_mes').value = '';
    document.getElementById('comprovante_ano').value = '';
    document.getElementById('comprovante_arquivo').value = '';

    // Carregar comprovantes
    carregarComprovantes();
}

function fecharModalComprovantes() {
    console.log('❌ Fechando modal de comprovantes');
    document.getElementById('modalComprovantes').style.display = 'none';
}

async function uploadComprovante() {
    const descricao = document.getElementById('comprovante_desc').value.trim();
    const mes = document.getElementById('comprovante_mes').value;
    const ano = document.getElementById('comprovante_ano').value;
    const arquivoInput = document.getElementById('comprovante_arquivo');
    const arquivo = arquivoInput.files[0];


    if (!descricao || !mes || !ano || !arquivo) {
        alert('Preencha todos os campos e selecione um arquivo!');
        return;
    }

    const mesAno = `${mes}/${ano}`;
    const btn = document.querySelector('button[onclick="uploadComprovante()"]');
    const originalText = btn.textContent;
      // Desabilita o botão e mostra loading
    btn.disabled = true;
    btn.innerHTML = '⏳ Enviando...';
    btn.style.background = '#6c757d';

    try {
        // Ler arquivo como base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const arquivoBase64 = e.target.result;

            const response = await fetch('/upload_comprovante', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    tipo: tipoComprovanteAtual,
                    descricao: descricao,
                    mes_ano: mesAno,
                    arquivo_nome: arquivo.name,
                    arquivo_dados: arquivoBase64
                })
            });

            const data = await response.json();

            if (data.ok) {
                alert('✅ Comprovante salvo com sucesso!');
                // Limpar campos
                document.getElementById('comprovante_desc').value = '';
                document.getElementById('comprovante_mes').value = '';
                document.getElementById('comprovante_ano').value = '';
                document.getElementById('comprovante_arquivo').value = '';

                // Recarregar lista
                carregarComprovantes();
            } else {
                alert('❌ Erro: ' + data.error);
            }
        };
        reader.readAsDataURL(arquivo);

    } catch (error) {
        console.error('❌ Erro no upload:', error);
        alert('❌ Erro ao fazer upload do comprovante');
    }
    finally {
        // Reabilita o botão independente do resultado
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.background = '#28a745';
    }
}

async function carregarComprovantes() {
    try {
        const mes = document.getElementById('filtro_mes').value;
        const ano = document.getElementById('filtro_ano').value;
        const mesAno = mes && ano ? `${mes}/${ano}` : '';

        const url = mesAno ? `/listar_comprovantes/${mesAno}` : '/listar_comprovantes/todos';
        const response = await fetch(url);
        const data = await response.json();

        const listaComprovantes = document.getElementById('lista_comprovantes');

        if (data.comprovantes && data.comprovantes.length > 0) {
            listaComprovantes.innerHTML = data.comprovantes.map(comp => `
                <div class="comprovante-item">
                    <div class="comprovante-info">
                        <strong>${comp.descricao}</strong><br>
                        <small>Tipo: ${comp.tipo === 'fixa' ? 'Despesa Fixa' : 'Dívida'}</small><br>
                        <small>Mês/Ano: ${comp.mes_ano}</small><br>
                        <small>Arquivo: ${comp.arquivo_nome}</small><br>
                        <small>Upload: ${comp.data_upload}</small>
                    </div>
                    <div class="comprovante-actions">
                        <button class="btn-small" onclick="downloadComprovante(${comp.id})"
                                style="background: #17a2b8; width: auto;">
                            📥 Download
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            listaComprovantes.innerHTML = '<p>Nenhum comprovante encontrado para o período selecionado.</p>';
        }

    } catch (error) {
        console.error('❌ Erro ao carregar comprovantes:', error);
        document.getElementById('lista_comprovantes').innerHTML = '<p>Erro ao carregar comprovantes.</p>';
    }
}

async function downloadComprovante(comprovanteId) {
    try {
        // Abrir em nova aba para download
        window.open(`/download_comprovante/${comprovanteId}`, '_blank');
    } catch (error) {
        console.error('❌ Erro ao baixar comprovante:', error);
        alert('❌ Erro ao baixar comprovante');
    }
}

function filtrarComprovantes() {
    carregarComprovantes();
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modalRelatorio = document.getElementById('modalRelatorio');
    const modalComprovantes = document.getElementById('modalComprovantes');

    if (event.target == modalRelatorio) {
        fecharModal();
    }
    if (event.target == modalComprovantes) {
        fecharModalComprovantes();
    }
}

// Adicionar event listeners para os novos botões
document.addEventListener('DOMContentLoaded', function() {
    // Seus event listeners existentes...

    // Novos botões já estão com onclick no HTML
    console.log('✅ Sistema de comprovantes carregado');
});

// =============================================
// FUNÇÕES DOS CONTRACHEQUES (CORRIGIDAS)
// =============================================

function validarPDF(input) {
    const arquivo = input.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (arquivo && arquivo.type !== 'application/pdf') {
        alert('❌ Por favor, selecione apenas arquivos PDF!');
        input.value = '';
        return false;
    }

    if (arquivo && arquivo.size > maxSize) {
        alert('❌ Arquivo muito grande! Máximo: 10MB');
        input.value = '';
        return false;
    }

    return true;
}

async function uploadContracheque() {
    const mes = document.getElementById('contracheque_mes').value.trim();
    const arquivoInput = document.getElementById('contracheque_arquivo');
    const arquivo = arquivoInput.files[0];
    const btn = document.querySelector('button[onclick="uploadContracheque()"]');
    const originalText = btn.textContent;

    if (!mes || !arquivo) {
        alert('Preencha o mês e selecione um arquivo PDF!');
        return;
    }

    // Desabilita o botão e mostra loading
    btn.disabled = true;
    btn.innerHTML = '⏳ Enviando...';
    btn.style.background = '#6c757d';

    try {
        // Ler arquivo como base64
        const reader = new FileReader();
        reader.onload = async function(e) {
            const arquivoBase64 = e.target.result;

            const response = await fetch('/upload_contracheque', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    mes: mes,
                    arquivo_nome: arquivo.name,
                    arquivo_dados: arquivoBase64
                })
            });

            const data = await response.json();

            if (data.ok) {
                alert('✅ Contracheque salvo com sucesso!');

                // 🆕 MOSTRAR ANÁLISE AUTOMÁTICA
                if (data.analise) {
                    console.log('📊 Análise automática:', data.analise);

                    let mensagemAnalise = '📊 Análise Automática:\n';
                    if (data.analise.data_detectada) {
                        mensagemAnalise += `📅 Data: ${data.analise.data_detectada}\n`;
                    }
                    if (data.analise.valor_liquido) {
                        mensagemAnalise += `💰 Líquido: R$ ${data.analise.valor_liquido.toFixed(2)}\n`;
                    }
                    if (data.analise.valor_bruto) {
                        mensagemAnalise += `💵 Bruto: R$ ${data.analise.valor_bruto.toFixed(2)}\n`;
                    }
                    if (data.analise.erros && data.analise.erros.length > 0) {
                        mensagemAnalise += `⚠️ Observações: ${data.analise.erros.join(', ')}\n`;
                    }

                    alert(mensagemAnalise);
                }

                // Limpar campos
                document.getElementById('contracheque_mes').value = '';
                document.getElementById('contracheque_arquivo').value = '';

                // Recarregar lista
                carregarTodosContracheques();
            } else {
                alert('❌ Erro: ' + data.error);
            }
        };

        // 🔥 ESTA LINHA ESTAVA NO LUGAR ERRADO - mover para dentro do try
        reader.readAsDataURL(arquivo);

    } catch (error) {
        console.error('❌ Erro no upload:', error);
        alert('❌ Erro ao fazer upload do contracheque');
    }
    finally {
        // Reabilita o botão
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.background = '#28a745';
    }
}

async function carregarTodosContracheques() {
    try {
        const response = await fetch('/listar_contracheques/todos');
        const data = await response.json();

        const listaCompleta = document.getElementById('lista_completa_contracheques');

        if (data.contracheques && data.contracheques.length > 0) {
            listaCompleta.innerHTML = data.contracheques.map(contracheque => `
                <div class="comprovante-item">
                    <div class="comprovante-info">
                        <strong>${contracheque.mes}</strong><br>
                        <small>Arquivo: ${contracheque.arquivo_nome}</small><br>
                        <small>Upload: ${contracheque.data_upload}</small>
                    </div>
                    <div class="comprovante-actions">
                        <button class="btn-small" onclick="downloadContracheque(${contracheque.id})"
                                style="background: #17a2b8; width: auto;">
                            📥 Download
                        </button>
                        <button class="btn-small" onclick="visualizarContracheque(${contracheque.id})"
                                style="background: #28a745; width: auto;">
                            👁️ Visualizar
                        </button>
                        <button class="btn-small" onclick="deletarContracheque(${contracheque.id})"
                                style="background: #dc3545; width: auto;">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            listaCompleta.innerHTML = '<p style="text-align: center; color: #666;">Nenhum contracheque cadastrado</p>';
        }

    } catch (error) {
        console.error('❌ Erro ao carregar contracheques:', error);
        document.getElementById('lista_completa_contracheques').innerHTML = '<p>Erro ao carregar contracheques.</p>';
    }
}

function abrirModalContracheques() {
    const modal = document.getElementById('modalContracheques');
    modal.style.display = 'block';
    carregarTodosContracheques();
}

function fecharModalContracheques() {
    document.getElementById('modalContracheques').style.display = 'none';
}

async function downloadContracheque(contrachequeId) {
    try {
        window.open(`/download_contracheque/${contrachequeId}`, '_blank');
    } catch (error) {
        console.error('❌ Erro ao baixar contracheque:', error);
        alert('❌ Erro ao baixar contracheque');
    }
}

async function visualizarContracheque(contrachequeId) {
    try {
        // Abre em nova aba para visualização
        const novaAba = window.open(`/visualizar_contracheque/${contrachequeId}`, '_blank');

        // Opcional: Mostrar mensagem de carregamento
        if (novaAba) {
            novaAba.focus();
        } else {
            alert('⚠️ Permitir pop-ups para visualizar o PDF');
        }
    } catch (error) {
        console.error('❌ Erro ao visualizar contracheque:', error);
        alert('❌ Erro ao visualizar contracheque');
    }
}

async function deletarContracheque(contrachequeId) {
    if (!confirm('Tem certeza que deseja excluir este contracheque?')) {
        return;
    }

    try {
        const response = await fetch(`/deletar_contracheque/${contrachequeId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.ok) {
            alert('✅ Contracheque excluído com sucesso!');
            carregarTodosContracheques();
        } else {
            alert('❌ Erro: ' + data.error);
        }
    } catch (error) {
        console.error('❌ Erro ao excluir contracheque:', error);
        alert('❌ Erro ao excluir contracheque');
    }
}

function filtrarContracheques() {
    const filtroAno = document.getElementById('filtro_ano_contracheque').value.toLowerCase();
    const itens = document.querySelectorAll('#lista_completa_contracheques .comprovante-item');

    itens.forEach(item => {
        const texto = item.textContent.toLowerCase();
        if (texto.includes(filtroAno) || !filtroAno) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function limparFiltrosContracheques() {
    document.getElementById('filtro_ano_contracheque').value = '';
    filtrarContracheques();
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modalContracheques = document.getElementById('modalContracheques');
    if (event.target == modalContracheques) {
        fecharModalContracheques();
    }
}