
let saldoCarteira = 0;
let dividas = [];
let dividasPagas = [];
let historicoCarteira = [];
let arquivoMensal = {};
let historicoRetificacoes = [];

function salvarDados() {
    const dados = {
        saldoCarteira,
        dividas,
        dividasPagas,
        historicoCarteira,
        arquivoMensal,
        historicoRetificacoes,
        ultimaAtualizacao: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('gestorFinanceiro', JSON.stringify(dados));
        localStorage.setItem('gestorFinanceiroBackup', JSON.stringify(dados));
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

function carregarDados() {
    try {
        const dadosSalvos = localStorage.getItem('gestorFinanceiro');
        
        if (!dadosSalvos) {
            const backup = localStorage.getItem('gestorFinanceiroBackup');
            if (backup) {
                carregarDadosSalvos(JSON.parse(backup));
                console.log('Dados restaurados do backup');
                return;
            }
            return;
        }
        
        carregarDadosSalvos(JSON.parse(dadosSalvos));
        atualizarEstatisticas();
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        const backup = localStorage.getItem('gestorFinanceiroBackup');
        if (backup) {
            try {
                carregarDadosSalvos(JSON.parse(backup));
                console.log('Dados restaurados do backup após erro');
            } catch (e) {
                console.error('Erro ao carregar backup:', e);
            }
        }
    }
}

function carregarDadosSalvos(dados) {
    if (!dados) return;
    
    saldoCarteira = dados.saldoCarteira || 0;
    dividas = dados.dividas || [];
    dividasPagas = dados.dividasPagas || [];
    historicoCarteira = dados.historicoCarteira || [];
    arquivoMensal = dados.arquivoMensal || {};
    historicoRetificacoes = dados.historicoRetificacoes || [];
    
    historicoCarteira = historicoCarteira.map(h => ({
        ...h,
        data: new Date(h.data)
    }));
    
    dividasPagas = dividasPagas.map(d => ({
        ...d,
        dataPagamento: new Date(d.dataPagamento),
        historioPagamentos: d.historioPagamentos.map(p => ({
            ...p,
            data: new Date(p.data)
        }))
    }));
    
    document.getElementById('saldo').textContent = saldoCarteira.toFixed(2);
    atualizarHistoricoCarteira();
    atualizarListaDividas();
    atualizarListaDividasPagas();
    atualizarFiltroCredores();
}

document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
});

window.addEventListener('beforeunload', function() {
    salvarDados();
});

setInterval(salvarDados, 30000);

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        salvarDados();
    }
});

function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}

function isNumberOrDot(event) {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode === 46) {
        return !event.target.value.includes('.');
    }
    return charCode >= 48 && charCode <= 57;
}

function adicionarSaldo() {
    const valor = parseFloat(document.getElementById('valor-carteira').value);
    if (isNaN(valor) || valor <= 0) {
        alert('Por favor, insira um valor válido!');
        return;
    }
    saldoCarteira += valor;
    
    const data = new Date();
    historicoCarteira.push({
        valor: valor,
        data: data,
        tipo: 'entrada'
    });
    
    atualizarHistoricoCarteira();
    document.getElementById('saldo').textContent = saldoCarteira.toFixed(2);
    document.getElementById('valor-carteira').value = '';
    salvarDados();
}

function atualizarHistoricoCarteira() {
    const historico = document.getElementById('historico-carteira');
    historico.innerHTML = '';
    
    historicoCarteira.slice().reverse().forEach(transacao => {
        const div = document.createElement('div');
        div.className = 'carteira-history-item';
        const dataFormatada = formatarData(transacao.data);
        
        let styleClass = '';
        let icon = '';
        
        if (transacao.tipo === 'estorno') {
            styleClass = 'estorno-entry';
            icon = `<span class="tooltip">
                <i class="fas fa-info-circle info-icon"></i>
                <span class="tooltip-text">
                    Motivo: ${transacao.motivo}<br>
                    Descrição: ${transacao.descricao}
                </span>
            </span>`;
        }
        
        div.innerHTML = `
            <span class="${styleClass}">
                ${dataFormatada} - 
                R$ ${transacao.valor.toFixed(2)} 
                (${transacao.tipo === 'entrada' ? 'Entrada' : 
                   transacao.tipo === 'estorno' ? 'Estorno' : 'Saída'})
                ${icon}
            </span>
        `;
        historico.appendChild(div);
    });
}

function toggleParcelas() {
    const tipoPagamento = document.getElementById('tipo-pagamento').value;
    document.getElementById('parcelas-group').style.display = 
        tipoPagamento === 'parcelado' ? 'block' : 'none';
}

function capitalize(text) {
    if (!text) return '';
    return text.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function cadastrarDivida() {
    const credor = capitalize(document.getElementById('credor').value);
    const motivo = capitalize(document.getElementById('motivo').value);
    const formaPagamento = document.getElementById('forma-pagamento').value;
    const tipoPagamento = document.getElementById('tipo-pagamento').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const vencimento = document.getElementById('vencimento').value;
    const numParcelas = tipoPagamento === 'parcelado' ? 
        parseInt(document.getElementById('num-parcelas').value) : 1;

    if (!credor || !valor || !vencimento) {
        alert('Preencha todos os campos obrigatórios!');
        return;
    }

    const divida = {
        id: Date.now(),
        credor,
        motivo,
        formaPagamento,
        tipoPagamento,
        valorTotal: valor,
        valorRestante: valor,
        vencimento,
        numParcelas,
        parcelasRestantes: numParcelas,
        valorParcela: tipoPagamento === 'parcelado' ? valor / numParcelas : valor,
        proximaParcelaValor: tipoPagamento === 'parcelado' ? valor / numParcelas : valor,
        historioPagamentos: []
    };

    dividas.push(divida);
    atualizarListaDividas();
    atualizarFiltroCredores();
    atualizarEstatisticas();
    limparFormulario();
    salvarDados();
}

function mostrarCelebracao() {
    const div = document.createElement('div');
    div.className = 'celebration';
    div.innerHTML = `
        <h2>🎉 Parabéns! 🎉</h2>
        <p>Você quitou mais uma dívida!</p>
        <p style="font-size: 3em; margin: 15px 0;">🏆</p>
        <p style="font-size: 0.9em; opacity: 0.8;">Continue assim!</p>
    `;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1500);
}

function moverParaDividasPagas(divida) {
    divida.dataPagamento = new Date();
    divida.historioPagamentos.sort((a, b) => a.data - b.data);
    dividasPagas.push(divida);
    dividas = dividas.filter(d => d.id !== divida.id);
    atualizarListaDividasPagas();
}

function abaterDivida(id) {
    const divida = dividas.find(d => d.id === id);
    const valorAbate = parseFloat(prompt('Quanto deseja abater desta dívida?'));

    if (isNaN(valorAbate) || valorAbate <= 0) {
        alert('Por favor, insira um valor válido!');
        return;
    }

    if (valorAbate > saldoCarteira) {
        alert('Saldo insuficiente na carteira!');
        return;
    }

    if (valorAbate > divida.valorRestante) {
        alert('Valor de abatimento maior que a dívida restante!');
        return;
    }

    const pagamento = {
        data: new Date(),
        valor: valorAbate,
        dividaId: divida.id,
        dividaCredor: divida.credor
    };

    divida.historioPagamentos.push(pagamento);
    
    if (divida.valorRestante - valorAbate <= 0) {
        saldoCarteira -= divida.valorRestante;
        mostrarCelebracao();
        moverParaDividasPagas(divida);
    } else {
        saldoCarteira -= valorAbate;
        divida.valorRestante -= valorAbate;

        if (divida.tipoPagamento === 'parcelado') {
            const parcelasInteiras = Math.floor(valorAbate / divida.valorParcela);
            const valorRestanteAbate = valorAbate % divida.valorParcela;
            
            divida.parcelasRestantes = Math.max(0, divida.parcelasRestantes - parcelasInteiras);
            
            if (parcelasInteiras > 0) {
                const currentDate = new Date(divida.vencimento);
                currentDate.setMonth(currentDate.getMonth() + parcelasInteiras);
                divida.vencimento = currentDate.toISOString().split('T')[0];
            }
            
            if (valorRestanteAbate > 0) {
                divida.proximaParcelaValor = divida.valorParcela - valorRestanteAbate;
            } else {
                divida.proximaParcelaValor = divida.valorParcela;
            }
            
            if (divida.valorRestante < divida.valorParcela) {
                divida.proximaParcelaValor = divida.valorRestante;
            }
        }
    }

    document.getElementById('saldo').textContent = saldoCarteira.toFixed(2);
    atualizarHistoricoCarteira();
    atualizarListaDividas();
    atualizarEstatisticas();
}

function atualizarListaDividas() {
    const lista = document.getElementById('lista-dividas');
    lista.innerHTML = '';

    const filtroCredor = document.getElementById('filtro-credor').value;
    
    let dividasFiltradas = dividas;
    if (filtroCredor) {
        dividasFiltradas = dividas.filter(d => d.credor === filtroCredor);
    }
    
    const dividasOrdenadas = dividasFiltradas.sort((a, b) => new Date(a.vencimento) - new Date(b.vencimento));
    
    dividasOrdenadas.forEach(divida => {
        const proximoPagamento = divida.tipoPagamento === 'parcelado' ? 
            (divida.proximaParcelaValor || divida.valorParcela) : 
            divida.valorRestante;

        const hoje = new Date();
        const vencimento = new Date(divida.vencimento);
        const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
        
        const isPriority = diasRestantes <= 5 && diasRestantes >= 0;
        const isOverdue = diasRestantes < 0;
        
        const priorityStyle = isPriority ? 
            'border-left: 4px solid #ff5e62; background: rgba(255,94,98,0.05);' : 
            isOverdue ? 
            'border-left: 4px solid #e74c3c; background: rgba(231,76,60,0.05);' : '';

        const alertBadge = (isPriority || isOverdue) ? `
            <div style="
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                font-weight: 500;
                margin-left: 10px;
                background: ${isOverdue ? '#e74c3c' : '#ff5e62'};
                color: white;
            ">
                ${isOverdue ? 'ATRASADA' : 'PRÓXIMA DO VENCIMENTO'}
            </div>
        ` : '';

        const div = document.createElement('div');
        div.className = 'divida-item';
        div.style = priorityStyle;
        div.innerHTML = `
            <div class="divida-info">
                <strong style="font-size: 1.2em; color: #2d3748;">
                    ${divida.credor}
                    ${alertBadge}
                </strong>
                ${divida.motivo ? `
                    <span class="tooltip">
                        <i class="fas fa-info-circle motivo-icon" title="Mostrar motivo"></i>
                        <span class="tooltip-text">${divida.motivo}</span>
                    </span>
                ` : ''}<br>
                <span style="color: #718096;">Forma: ${divida.formaPagamento}</span><br>
                <span style="color: #718096;">Tipo: ${divida.tipoPagamento}</span><br>
                ${divida.tipoPagamento === 'parcelado' ? 
                    `<span style="color: #718096;">Parcelas: ${divida.parcelasRestantes}/${divida.numParcelas}</span><br>` : ''}
                <span style="color: #2d3748; font-weight: 500;">Valor Restante: R$ ${divida.valorRestante.toFixed(2)}</span><br>
                <span style="color: ${isOverdue ? '#e74c3c' : '#718096'};">
                    Vencimento: ${formatarData(divida.vencimento)}
                    ${diasRestantes >= 0 ? `(em ${diasRestantes} dias)` : `(atrasada há ${Math.abs(diasRestantes)} dias)`}
                </span>
                <div class="valor-parcela">
                    Próximo pagamento: R$ ${proximoPagamento.toFixed(2)}
                </div>
            </div>
            <div class="divida-buttons">
                <button onclick="abaterDivida(${divida.id})">
                    <i class="fas fa-hand-holding-usd"></i>
                    Abater
                </button>
                ${divida.historioPagamentos.length > 0 ? `
                    <button onclick="retificarPagamento(${divida.id}, false)" class="retificar-btn">
                        <i class="fas fa-undo"></i>
                        Retificar
                    </button>
                ` : ''}
                <button onclick="removerDivida(${divida.id})" class="remove-btn">
                    <i class="fas fa-trash"></i>
                    Remover
                </button>
            </div>
        `;
        lista.appendChild(div);
    });
}

function atualizarListaDividasPagas(dividasFiltradas = dividasPagas) {
    const lista = document.getElementById('lista-dividas-pagas');
    lista.innerHTML = '';

    dividasFiltradas.forEach(divida => {
        const div = document.createElement('div');
        div.className = 'divida-paga-item';
        
        div.innerHTML = `
            <div class="divida-paga-header">
                <div class="divida-paga-summary">
                    <strong>${divida.credor}</strong>
                    <span class="divida-valor">R$ ${divida.valorTotal.toFixed(2)}</span>
                    <span class="divida-data">${formatarData(divida.dataPagamento)}</span>
                </div>
                <button class="details-toggle" onclick="toggleDividaDetails('${divida.id}')">
                    <i class="fas fa-chevron-down"></i>
                    Detalhes
                </button>
            </div>
            <div class="divida-paga-details" id="details-${divida.id}">
                <div class="details-content">
                    <p><strong>Forma:</strong> ${divida.formaPagamento}</p>
                    <p><strong>Tipo:</strong> ${divida.tipoPagamento}</p>
                    ${divida.motivo ? `
                        <div class="motivo-section">
                            <strong>Motivo:</strong> ${divida.motivo}
                        </div>
                    ` : ''}
                    <div class="historico-pagamento">
                        <strong>Histórico de Pagamentos:</strong>
                        ${divida.historioPagamentos.map(pag => `
                            <div class="pagamento-item">
                                ${formatarData(pag.data)} - R$ ${pag.valor.toFixed(2)}
                                <button onclick="retificarPagamento('${String(divida.id)}', true)"><i class="fas fa-pencil-alt"></i> Retificar</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        lista.appendChild(div);
    });
}

function toggleDividaDetails(id) {
    const detailsElement = document.getElementById(`details-${id}`);
    const button = detailsElement.previousElementSibling.querySelector('.details-toggle i');
    
    if (detailsElement.classList.contains('active')) {
        detailsElement.classList.remove('active');
        button.classList.remove('fa-chevron-up');
        button.classList.add('fa-chevron-down');
    } else {
        detailsElement.classList.add('active');
        button.classList.remove('fa-chevron-down');
        button.classList.add('fa-chevron-up');
    }
}

function filtrarDividasPagas() {
    const filtroCredor = document.getElementById('filtro-credor').value.toLowerCase();
    const filtroData = document.getElementById('filtro-data').value;
    
    const dividasFiltradas = dividasPagas.filter(divida => {
        const matchCredor = divida.credor.toLowerCase().includes(filtroCredor);
        
        if (filtroData) {
            const dataFiltro = new Date(filtroData);
            const dataPagamento = new Date(divida.dataPagamento);
            const matchData = dataFiltro.toDateString() === dataPagamento.toDateString();
            return matchCredor && matchData;
        }
        
        return matchCredor;
    });
    
    atualizarListaDividasPagas(dividasFiltradas);
}

function atualizarFiltroCredores() {
    const filtroSelect = document.getElementById('filtro-credor');
    const credoresUnicos = [...new Set(dividas.map(d => d.credor))];
    
    filtroSelect.innerHTML = `
        <option value="">Todos os credores</option>
        ${credoresUnicos.sort().map(credor => `
            <option value="${credor}">${credor}</option>
        `).join('')}
    `;
}

function toggleMotivo(id) {
    const motivoElement = document.getElementById(`motivo-${id}`);
    if (motivoElement.classList.contains('show')) {
        motivoElement.classList.remove('show');
    } else {
        motivoElement.classList.add('show');
    }
}

function limparFormulario() {
    document.getElementById('credor').value = '';
    document.getElementById('motivo').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('vencimento').value = '';
    document.getElementById('num-parcelas').value = '2';
}

function exportarXLSX() {
    const dividasAtivas = dividas.map(d => ({
        Status: 'Ativa',
        Credor: d.credor,
        Motivo: d.motivo || '',
        'Forma de Pagamento': d.formaPagamento,
        'Tipo de Pagamento': d.tipoPagamento,
        'Valor Total': d.valorTotal,
        'Valor Restante': d.valorRestante,
        Vencimento: d.vencimento,
        'Número de Parcelas': d.numParcelas,
        'Parcelas Restantes': d.parcelasRestantes,
        'Próxima Parcela': d.proximaParcelaValor || d.valorParcela,
        'Valor Parcela': d.valorParcela
    }));

    const dividasPagasData = dividasPagas.map(d => ({
        Status: 'Paga',
        Credor: d.credor,
        Motivo: d.motivo || '',
        'Forma de Pagamento': d.formaPagamento,
        'Tipo de Pagamento': d.tipoPagamento,
        'Valor Total': d.valorTotal,
        'Valor Restante': 0,
        Vencimento: d.vencimento,
        'Número de Parcelas': d.numParcelas,
        'Parcelas Restantes': 0,
        'Data Pagamento': formatarData(d.dataPagamento),
        'Histórico Pagamentos': JSON.stringify(d.historioPagamentos)
    }));

    const historicoData = historicoCarteira.map(h => ({
        Data: formatarData(h.data),
        Valor: h.valor,
        Tipo: h.tipo,
        Motivo: h.motivo || '',
        Descrição: h.descricao || '',
        'Credor Relacionado': h.dividaCredor || '',
        'ID Dívida': h.dividaId || ''
    }));

    const wb = XLSX.utils.book_new();

    const dividasSheet = XLSX.utils.json_to_sheet([...dividasAtivas, ...dividasPagasData]);
    XLSX.utils.book_append_sheet(wb, dividasSheet, "Dívidas");

    const historicoSheet = XLSX.utils.json_to_sheet(historicoData);
    XLSX.utils.book_append_sheet(wb, historicoSheet, "Histórico");

    const wscols = [
        {wch: 12},
        {wch: 25},
        {wch: 30},
        {wch: 20},
        {wch: 20},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 40}
    ];

    [dividasSheet, historicoSheet].forEach(sheet => {
        sheet['!cols'] = wscols;
    });

    XLSX.writeFile(wb, `gestor_financeiro_${formatarData(new Date())}.xlsx`);
}

function importarXLSX() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                const dividasSheet = workbook.Sheets["Dívidas"];
                if (dividasSheet) {
                    const jsonData = XLSX.utils.sheet_to_json(dividasSheet);
                    
                    dividas = [];
                    dividasPagas = [];
                    
                    jsonData.forEach(row => {
                        if (row.Status && row.Credor) {
                            const divida = {
                                id: Date.now() + Math.random(),
                                credor: capitalize(row.Credor),
                                motivo: capitalize(row.Motivo || ''),
                                formaPagamento: row['Forma de Pagamento'] || 'cartao',
                                tipoPagamento: row['Tipo de Pagamento'] || 'avista',
                                valorTotal: parseFloat(row['Valor Total']) || 0,
                                valorRestante: parseFloat(row['Valor Restante']) || 0,
                                vencimento: row.Vencimento || new Date().toISOString().split('T')[0],
                                numParcelas: parseInt(row['Número de Parcelas']) || 1,
                                parcelasRestantes: parseInt(row['Parcelas Restantes']) || 1,
                                valorParcela: parseFloat(row['Valor Parcela']) || row['Valor Total'],
                                proximaParcelaValor: parseFloat(row['Próxima Parcela']) || parseFloat(row['Valor Parcela']) || row['Valor Total'],
                                historioPagamentos: row['Histórico Pagamentos'] ? JSON.parse(row['Histórico Pagamentos']) : []
                            };
                            
                            if (row['Data Pagamento']) {
                                divida.dataPagamento = typeof row['Data Pagamento'] === 'string' ? 
                                    new Date(row['Data Pagamento'].split('/').reverse().join('-')) : 
                                    new Date(row['Data Pagamento']);
                            }
                            
                            if (row.Status.toLowerCase() === 'paga') {
                                dividasPagas.push(divida);
                            } else {
                                dividas.push(divida);
                            }
                        }
                    });
                }
                
                const historicoSheet = workbook.Sheets["Histórico"];
                if (historicoSheet) {
                    const historicoData = XLSX.utils.sheet_to_json(historicoSheet);
                    historicoCarteira = historicoData.map(h => ({
                        valor: parseFloat(h.Valor) || 0,
                        data: typeof h.Data === 'string' ? new Date(h.Data.split('/').reverse().join('-')) : new Date(h.Data),
                        tipo: h.Tipo || 'entrada',
                        motivo: h.Motivo || '',
                        descricao: h.Descrição || '',
                        dividaCredor: h['Credor Relacionado'] || '',
                        dividaId: h['ID Dívida'] || ''
                    }));
                    
                    saldoCarteira = historicoCarteira.reduce((acc, h) => {
                        if (h.tipo === 'entrada' || h.tipo === 'estorno') {
                            return acc + h.valor;
                        } else if (h.tipo === 'saida') {
                            return acc - h.valor;
                        }
                        return acc;
                    }, 0);
                }
                
                document.getElementById('saldo').textContent = saldoCarteira.toFixed(2);
                atualizarHistoricoCarteira();
                atualizarListaDividas();
                atualizarListaDividasPagas();
                atualizarFiltroCredores();
                
                alert('Importação concluída com sucesso!');
            } catch (error) {
                console.error('Erro na importação:', error);
                alert('Erro ao importar o arquivo. Verifique se o formato está correto.');
            }
        };
        
        reader.readAsArrayBuffer(file);
    };
    
    input.click();
}

function arquivarMesAnterior() {
    const dataAtual = new Date();
    const mesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1);
    const chaveArquivo = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;
    
    arquivoMensal[chaveArquivo] = {
        historicoCarteira: historicoCarteira.filter(h => {
            const dataTransacao = new Date(h.data);
            return dataTransacao.getMonth() === mesAnterior.getMonth() &&
                   dataTransacao.getFullYear() === mesAnterior.getFullYear();
        }),
        dividasPagas: dividasPagas.filter(d => {
            const dataPagamento = new Date(d.dataPagamento);
            return dataPagamento.getMonth() === mesAnterior.getMonth() &&
                   dataPagamento.getFullYear() === mesAnterior.getFullYear();
        })
    };
    
    historicoCarteira = historicoCarteira.filter(h => {
        const dataTransacao = new Date(h.data);
        return dataTransacao.getMonth() !== mesAnterior.getMonth() ||
               dataTransacao.getFullYear() !== mesAnterior.getFullYear();
    });
    
    dividasPagas = dividasPagas.filter(d => {
        const dataPagamento = new Date(d.dataPagamento);
        return dataPagamento.getMonth() !== mesAnterior.getMonth() ||
               dataPagamento.getFullYear() !== mesAnterior.getFullYear();
    });
    
    atualizarSelectArquivosMensais();
}

function retificarPagamento(dividaId, isPaga = false) {
    let divida;
    if (isPaga) {
        divida = dividasPagas.find(d => String(d.id) === String(dividaId));
    } else {
        divida = dividas.find(d => String(d.id) === String(dividaId));
    }
    
    if (!divida) {
        console.error('Dívida não encontrada');
        return;
    }

    const modal = document.getElementById('retificacao-modal');
    modal.style.display = 'block';
    
    let dividaParaRetificar = {
        id: dividaId,
        isPaga: isPaga,
        ultimoPagamento: divida.historioPagamentos[divida.historioPagamentos.length - 1]
    };
    
    window.dividaParaRetificar = dividaParaRetificar;
}

function confirmarRetificacao() {
    const motivo = document.getElementById('motivo-retificacao').value;
    const descricao = document.getElementById('descricao-retificacao').value;
    
    if (!window.dividaParaRetificar || !window.dividaParaRetificar.ultimoPagamento) {
        alert('Erro ao retificar pagamento');
        return;
    }
    
    const { id, isPaga, ultimoPagamento } = window.dividaParaRetificar;
    const valorRetificacao = ultimoPagamento.valor;
    
    let divida;
    if (isPaga) {
        divida = dividasPagas.find(d => String(d.id) === String(id));
    } else {
        divida = dividas.find(d => String(d.id) === String(id));
    }
    
    if (!divida) {
        alert('Dívida não encontrada');
        return;
    }
    
    // Remover último pagamento
    divida.historioPagamentos.pop();
    
    // Atualizar valor restante
    if (!isPaga) {
        divida.valorRestante += valorRetificacao;
    }
    
    // Adicionar valor de volta à carteira
    saldoCarteira += valorRetificacao;
    
    // Registrar estorno no histórico
    historicoCarteira.push({
        valor: valorRetificacao,
        data: new Date(),
        tipo: 'estorno',
        motivo: motivo,
        descricao: descricao,
        dividaCredor: divida.credor,
        dividaId: divida.id
    });
    
    document.getElementById('saldo').textContent = saldoCarteira.toFixed(2);
    atualizarHistoricoCarteira();
    atualizarListaDividas();
    atualizarListaDividasPagas();
    atualizarEstatisticas();
    fecharModal();
    salvarDados();
}

function fecharModal() {
    const modal = document.getElementById('retificacao-modal');
    modal.style.display = 'none';
    document.getElementById('motivo-retificacao').value = '';
    document.getElementById('descricao-retificacao').selectedIndex = 0;
    window.dividaParaRetificar = null;
}

function removerDivida(id) {
    if (confirm('Tem certeza que deseja remover esta dívida?')) {
        dividas = dividas.filter(d => d.id !== id);
        atualizarListaDividas();
        atualizarEstatisticas();
        salvarDados();
    }
}

function toggleStatVisibility(statId) {
    const statElement = document.getElementById(statId);
    const icon = document.getElementById(`icon-${statId}`);
    
    if (statElement.style.visibility === 'hidden') {
        statElement.style.visibility = 'visible';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        statElement.style.visibility = 'hidden';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

function atualizarEstatisticas() {
    const totalDividas = dividas.reduce((acc, div) => acc + div.valorRestante, 0);
    const totalDividasPagas = dividasPagas.reduce((acc, div) => acc + div.valorTotal, 0);
    const totalDividasMes = calcularTotalDividasMes();
    const dividasPorCredor = calcularDividasPorCredor();
    
    document.getElementById('total-dividas').textContent = totalDividas.toFixed(2);
    document.getElementById('total-dividas-pagas').textContent = totalDividasPagas.toFixed(2);
    document.getElementById('total-dividas-mes').textContent = totalDividasMes.toFixed(2);
    
    const dividasMesCredorElement = document.getElementById('dividas-mes-credor');
    dividasMesCredorElement.innerHTML = '';
    
    Object.entries(dividasPorCredor).forEach(([credor, valor]) => {
        const div = document.createElement('div');
        div.style.padding = '8px';
        div.style.borderBottom = '1px solid #eee';
        div.innerHTML = `<strong>${credor}:</strong> R$ ${valor.toFixed(2)}`;
        dividasMesCredorElement.appendChild(div);
    });
}

function calcularTotalDividasMes() {
    return dividas.reduce((acc, div) => {
        if (div.tipoPagamento === 'parcelado') {
            return acc + div.proximaParcelaValor;
        } else {
            return acc + div.valorRestante;
        }
    }, 0);
}

function calcularDividasPorCredor() {
    const dividasPorCredor = {};
    dividas.forEach(div => {
        const valorMes = div.tipoPagamento === 'parcelado' ? 
            div.proximaParcelaValor : div.valorRestante;
        
        if (dividasPorCredor[div.credor]) {
            dividasPorCredor[div.credor] += valorMes;
        } else {
            dividasPorCredor[div.credor] = valorMes;
        }
    });
    return dividasPorCredor;
}

function exportarModeloVazio() {
    const modeloVazio = {
        Status: '',
        Credor: '',
        Motivo: '',
        'Forma de Pagamento': '',
        'Tipo de Pagamento': '',
        'Valor Total': '',
        'Valor Restante': '',
        Vencimento: '',
        'Número de Parcelas': '',
        'Parcelas Restantes': '',
        'Próxima Parcela': '',
        'Valor Parcela': ''
    };

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([modeloVazio]);
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    
    ws['!cols'] = [
        {wch: 12},
        {wch: 25},
        {wch: 30},
        {wch: 20},
        {wch: 20},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15},
        {wch: 15}
    ];

    XLSX.writeFile(wb, 'modelo_importacao.xlsx');
}

document.addEventListener('DOMContentLoaded', () => {
    carregarDados();
});