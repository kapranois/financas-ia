from flask import Flask, render_template, request, jsonify, send_file
import os
import re
import base64
import io
import pdfplumber

# Import para PostgreSQL com fallback para SQLite
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRES_AVAILABLE = True
    print("✅ PostgreSQL disponível")
except ImportError:
    POSTGRES_AVAILABLE = False
    import sqlite3
    print("ℹ️ Usando SQLite (PostgreSQL não disponível)")

app = Flask(__name__)

# =============================================
# CONFIGURAÇÃO PARA POSTGRESQL NO RENDER
# =============================================
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db_connection():
    """Conecta com PostgreSQL ou SQLite como fallback"""
    if DATABASE_URL and POSTGRES_AVAILABLE:
        # PostgreSQL no Render
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        conn.cursor_factory = RealDictCursor
        return conn
    else:
        # SQLite local (fallback)
        import sqlite3
        db_file = os.path.join(os.path.dirname(__file__), 'financas.db')
        conn = sqlite3.connect(db_file)
        conn.row_factory = sqlite3.Row
        return conn

def execute_query(query, params=()):
    """Executa query de forma compatível com ambos os bancos"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Ajusta a query para PostgreSQL se necessário
        if DATABASE_URL and POSTGRES_AVAILABLE:
            query = query.replace('?', '%s')
            query = query.replace('INSERT OR REPLACE', 'INSERT')
            query = query.replace('BLOB', 'BYTEA')
        
        cursor.execute(query, params)
        
        if query.strip().upper().startswith('SELECT'):
            result = cursor.fetchall()
        else:
            conn.commit()
            result = cursor.rowcount
            
        return result
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def init_db():
    """Inicializa todas as tabelas do banco"""
    try:
        # Tabela de entradas
        execute_query('''CREATE TABLE IF NOT EXISTS entradas(
            id SERIAL PRIMARY KEY,
            descricao TEXT,
            valor REAL,
            data TEXT DEFAULT CURRENT_TIMESTAMP
        )''')

        # Tabela de gastos
        execute_query('''CREATE TABLE IF NOT EXISTS gastos(
            id SERIAL PRIMARY KEY,
            descricao TEXT,
            categoria TEXT,
            valor REAL,
            data TEXT DEFAULT CURRENT_TIMESTAMP
        )''')

        # Tabela de dívidas
        execute_query('''CREATE TABLE IF NOT EXISTS dividas(
            id SERIAL PRIMARY KEY,
            descricao TEXT,
            valor REAL,
            vencimento TEXT,
            data TEXT DEFAULT CURRENT_TIMESTAMP
        )''')

        # Tabela de fixas
        execute_query('''CREATE TABLE IF NOT EXISTS fixas(
            id SERIAL PRIMARY KEY,
            nome TEXT UNIQUE,
            valor REAL
        )''')

        # TABELA PARA COMPROVANTES
        execute_query('''CREATE TABLE IF NOT EXISTS comprovantes(
            id SERIAL PRIMARY KEY,
            tipo TEXT,
            descricao TEXT,
            mes_ano TEXT,
            arquivo_nome TEXT,
            arquivo_dados BYTEA,
            data_upload TEXT DEFAULT CURRENT_TIMESTAMP
        )''')

        # TABELA PARA CONTRACHEQUES
        execute_query('''CREATE TABLE IF NOT EXISTS contracheques(
            id SERIAL PRIMARY KEY,
            mes TEXT,
            arquivo_nome TEXT,
            arquivo_dados BYTEA,
            data_upload TEXT DEFAULT CURRENT_TIMESTAMP
        )''')

        print("✅ Banco inicializado com sucesso!")
        if DATABASE_URL:
            print("📊 Usando PostgreSQL no Render")
        else:
            print("💾 Usando SQLite local")
            
    except Exception as e:
        print(f"❌ Erro ao criar banco: {e}")

# Inicializar banco ao iniciar
init_db()

# =============================================
# FUNÇÕES OTIMIZADAS (COMPATÍVEIS COM AMBOS)
# =============================================
def adicionar_entrada(desc, valor):
    try:
        execute_query('INSERT INTO entradas (descricao, valor) VALUES (?, ?)', (desc, valor))
        print(f"✅ Entrada adicionada: {desc} - R${valor}")
        return True
    except Exception as e:
        print(f"❌ Erro ao adicionar entrada: {e}")
        return False

def adicionar_gasto(desc, cat, valor):
    try:
        execute_query('INSERT INTO gastos (descricao, categoria, valor) VALUES (?, ?, ?)', (desc, cat, valor))
        print(f"✅ Gasto adicionado: {desc} - {cat} - R${valor}")
        return True
    except Exception as e:
        print(f"❌ Erro ao adicionar gasto: {e}")
        return False

def excluir_entrada_completa(desc):
    try:
        deleted = execute_query('DELETE FROM entradas WHERE descricao LIKE ?', (f'%{desc}%',))
        if deleted > 0:
            print(f"✅ {deleted} entrada(s) deletada(s): {desc}")
            return True
        else:
            print(f"❌ Entrada não encontrada: {desc}")
            return False
    except Exception as e:
        print(f"❌ Erro ao deletar entrada: {e}")
        return False

def excluir_gasto_completo(desc):
    try:
        deleted = execute_query('DELETE FROM gastos WHERE descricao LIKE ?', (f'%{desc}%',))
        if deleted > 0:
            print(f"✅ {deleted} gasto(s) deletado(s): {desc}")
            return True
        else:
            print(f"❌ Gasto não encontrado: {desc}")
            return False
    except Exception as e:
        print(f"❌ Erro ao deletar gasto: {e}")
        return False

def excluir_divida_completa(desc):
    try:
        deleted = execute_query('DELETE FROM dividas WHERE descricao LIKE ?', (f'%{desc}%',))
        if deleted > 0:
            print(f"✅ {deleted} dívida(s) deletada(s): {desc}")
            return True
        else:
            print(f"❌ Dívida não encontrada: {desc}")
            return False
    except Exception as e:
        print(f"❌ Erro ao deletar dívida: {e}")
        return False

# =============================================
# FUNÇÕES DOS COMPROVANTES (OTIMIZADAS)
# =============================================
def salvar_comprovante(tipo, descricao, mes_ano, arquivo_nome, arquivo_dados):
    try:
        execute_query('''INSERT INTO comprovantes
                    (tipo, descricao, mes_ano, arquivo_nome, arquivo_dados)
                    VALUES (?, ?, ?, ?, ?)''',
                 (tipo, descricao, mes_ano, arquivo_nome, arquivo_dados))
        print(f"✅ Comprovante salvo: {descricao} - {mes_ano}")
        return True
    except Exception as e:
        print(f"❌ Erro ao salvar comprovante: {e}")
        return False

def listar_comprovantes(mes_ano=None):
    try:
        if mes_ano and mes_ano != 'todos':
            comprovantes = execute_query('''SELECT id, tipo, descricao, mes_ano, arquivo_nome, data_upload
                        FROM comprovantes WHERE mes_ano = ? ORDER BY data_upload DESC''', (mes_ano,))
        else:
            comprovantes = execute_query('''SELECT id, tipo, descricao, mes_ano, arquivo_nome, data_upload
                        FROM comprovantes ORDER BY data_upload DESC''')
        
        return [dict(row) for row in comprovantes]
    except Exception as e:
        print(f"❌ Erro ao listar compprovantes: {e}")
        return []

# =============================================
# FUNÇÕES DA IA SIMPLES (OTIMIZADAS)
# =============================================
def processar_delecao_simples(msg):
    try:
        palavras_delecao = ['delete', 'deletar', 'remover', 'apagar', 'excluir']
        descricao = msg.lower()

        for palavra in palavras_delecao:
            descricao = descricao.replace(palavra, '').strip()

        print(f"🔍 Procurando para deletar: '{descricao}'")

        sucesso_entrada = excluir_entrada_completa(descricao)
        sucesso_gasto = excluir_gasto_completo(descricao)
        sucesso_divida = excluir_divida_completa(descricao)

        if sucesso_entrada or sucesso_gasto or sucesso_divida:
            return f'✅ Item contendo "{descricao}" foi removido!'
        else:
            return f'❌ Não encontrei nenhum item com "{descricao}"'
    except Exception as e:
        return f'❌ Erro ao deletar: {str(e)}'

def gerar_analise_simples():
    try:
        entradas = execute_query('SELECT COALESCE(SUM(valor), 0) FROM entradas')[0][0] or 0
        gastos = execute_query('SELECT COALESCE(SUM(valor), 0) FROM gastos')[0][0] or 0
        fixas = execute_query('SELECT COALESCE(SUM(valor), 0) FROM fixas')[0][0] or 0
        dividas = execute_query('SELECT COALESCE(SUM(valor), 0) FROM dividas')[0][0] or 0

        total_gastos = gastos + fixas
        saldo = entradas - total_gastos

        if saldo > 0:
            return f"💰 **Situação Positiva!**\n\n📥 Entradas: R$ {entradas:.2f}\n📤 Gastos: R$ {total_gastos:.2f}\n✅ Saldo: R$ {saldo:.2f}"
        elif saldo == 0:
            return f"⚖️ **Situação Equilibrada**\n\n📥 Entradas: R$ {entradas:.2f}\n📤 Gastos: R$ {total_gastos:.2f}\n⚖️ Saldo: R$ {saldo:.2f}"
        else:
            return f"⚠️ **Atenção! Saldo Negativo**\n\n📥 Entradas: R$ {entradas:.2f}\n📤 Gastos: R$ {total_gastos:.2f}\n❌ Saldo: R$ {saldo:.2f}"
    except Exception as e:
        return f"❌ Erro na análise: {str(e)}"

# =============================================
# ROTAS PRINCIPAIS (MANTIDAS)
# =============================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add_entrada', methods=['POST'])
def add_entrada():
    try:
        data = request.get_json()
        descricao = data['descricao']
        valor = float(data['valor'])

        if adicionar_entrada(descricao, valor):
            return jsonify({'ok': True, 'message': 'Entrada adicionada'})
        else:
            return jsonify({'error': 'Erro ao adicionar entrada'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add_gasto', methods=['POST'])
def add_gasto():
    try:
        data = request.get_json()
        descricao = data['descricao']
        categoria = data.get('categoria', 'outros')
        valor = float(data['valor'])

        if adicionar_gasto(descricao, categoria, valor):
            return jsonify({'ok': True, 'message': 'Gasto adicionado'})
        else:
            return jsonify({'error': 'Erro ao adicionar gasto'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add_divida', methods=['POST'])
def add_divida():
    try:
        data = request.get_json()
        descricao = data['descricao']
        valor = float(data['valor'])
        vencimento = data.get('vencimento', '')

        conn = get_db_connection()
        conn.execute('INSERT INTO dividas (descricao, valor, vencimento) VALUES (?, ?, ?)',
                   (descricao, valor, vencimento))
        conn.commit()
        conn.close()

        return jsonify({'ok': True, 'message': 'Dívida adicionada'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/fixas', methods=['GET', 'POST'])
def fixas():
    try:
        if request.method == 'POST':
            data = request.get_json()
            nome = data['nome']
            valor = float(data['valor'])

            conn = get_db_connection()
            conn.execute('INSERT OR REPLACE INTO fixas (nome, valor) VALUES (?, ?)',
                       (nome, valor))
            conn.commit()
            conn.close()

            return jsonify({'ok': True})
        else:
            conn = get_db_connection()
            fixas_data = conn.execute('SELECT nome, valor FROM fixas').fetchall()
            conn.close()
            
            fixas_dict = {row[0]: row[1] for row in fixas_data}
            return jsonify(fixas_dict)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/consultar')
def consultar():
    try:
        conn = get_db_connection()

        entradas = conn.execute('SELECT COALESCE(SUM(valor), 0) FROM entradas').fetchone()[0] or 0
        gastos = conn.execute('SELECT COALESCE(SUM(valor), 0) FROM gastos').fetchone()[0] or 0
        dividas = conn.execute('SELECT COALESCE(SUM(valor), 0) FROM dividas').fetchone()[0] or 0
        fixas = conn.execute('SELECT COALESCE(SUM(valor), 0) FROM fixas').fetchone()[0] or 0

        total_gastos = gastos + fixas
        saldo = entradas - total_gastos

        dicas = []
        if saldo < 0:
            dicas.append('⚠️ Atenção! Saldo negativo.')
        elif saldo < 100:
            dicas.append('💰 Saldo baixo.')
        else:
            dicas.append('✅ Saldo positivo!')

        conn.close()

        return jsonify({
            'entradas': float(entradas),
            'gastos': float(total_gastos),
            'fixas': float(fixas),
            'dividas': float(dividas),
            'saldo': float(saldo),
            'dicas': dicas
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/list_all')
def list_all():
    try:
        conn = get_db_connection()

        entradas = [dict(row) for row in conn.execute('SELECT * FROM entradas ORDER BY id DESC').fetchall()]
        gastos = [dict(row) for row in conn.execute('SELECT * FROM gastos ORDER BY id DESC').fetchall()]
        dividas = [dict(row) for row in conn.execute('SELECT * FROM dividas ORDER BY id DESC').fetchall()]

        conn.close()

        return jsonify({
            'entradas': entradas,
            'gastos': gastos,
            'dividas': dividas
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        msg = data.get('msg','').strip().lower()

        if not msg:
            return jsonify({'error': 'Mensagem vazia'}), 400

        if any(palavra in msg for palavra in ['delete', 'deletar', 'remover', 'apagar', 'excluir']):
            resposta = processar_delecao_simples(msg)
            return jsonify({'resposta': resposta})

        elif any(palavra in msg for palavra in ['como andam', 'analisar', 'dicas', 'sugestões', 'estou bem', 'relatório', 'resumo']):
            resposta = gerar_analise_simples()
            return jsonify({'resposta': resposta})

        elif any(palavra in msg for palavra in ['gastei', 'gasto', 'comprei', 'paguei']):
            return jsonify({'resposta': '💡 Para adicionar gastos, use o formulário de "Gastos" acima.'})

        elif any(palavra in msg for palavra in ['entrada', 'salário', 'receita', 'ganhei']):
            return jsonify({'resposta': '💡 Para adicionar entradas, use o formulário de "Entradas" acima.'})

        else:
            return jsonify({'resposta': '🤖 Comando não reconhecido. Tente: "delete [item]" ou "como andam minhas contas?"'})

    except Exception as e:
        print(f"❌ Erro em chat: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/grafico_dados')
def grafico_dados():
    try:
        conn = get_db_connection()

        gastos_por_categoria = dict(conn.execute('''
            SELECT categoria, COALESCE(SUM(valor), 0)
            FROM gastos
            GROUP BY categoria
        ''').fetchall())

        total_fixas = conn.execute('SELECT COALESCE(SUM(valor), 0) FROM fixas').fetchone()[0] or 0

        if total_fixas > 0:
            gastos_por_categoria['Despesas Fixas'] = total_fixas

        if not gastos_por_categoria:
            gastos_por_categoria = {'Nenhum gasto': 0}

        conn.close()

        return jsonify({
            'labels': list(gastos_por_categoria.keys()),
            'valores': [float(valor) for valor in gastos_por_categoria.values()]
        })

    except Exception as e:
        print(f"❌ Erro em grafico_dados: {e}")
        return jsonify({
            'labels': ['Erro'],
            'valores': [1]
        }), 500

# =============================================
# CONFIGURAÇÃO PARA RENDER
# =============================================
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
