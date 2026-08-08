// Converte datas OFX variadas em YYYY-MM-DD
function parseDataOfx(rawDate) {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  const limpo = rawDate.replace(/\D/g, '').substring(0, 8);
  if (limpo.length < 8) return new Date().toISOString().split('T')[0];
  return `${limpo.substring(0, 4)}-${limpo.substring(4, 6)}-${limpo.substring(6, 8)}`;
}

// Converte valores numéricos aceitando tanto '.' quanto ','
function parseValorOfx(rawVal) {
  if (!rawVal) return 0;
  const textoLimpo = String(rawVal).trim().replace(',', '.');
  return parseFloat(textoLimpo) || 0;
}

// Extrai blocos <STMTTRN>...</STMTTRN>
function extrairBlocosSTMTTRN(ofxText) {
  const blocos = [];
  const regex = /<STMTTRN>([\s\S]*?)(?=(<STMTTRN>|<\/BANKTRANLIST>|$))/gi;
  let match;
  while ((match = regex.exec(ofxText)) !== null) {
    blocos.push(match[1]);
  }
  return blocos;
}

// Helper para pegar valor de tag no bloco
function getTagValue(bloco, tagName) {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i');
  const match = bloco.match(regex);
  return match ? match[1].trim() : '';
}

// 1. PARSER SICOOB
export function parseOFXSicoob(ofxText) {
  const blocos = extrairBlocosSTMTTRN(ofxText);
  return blocos.map(b => {
    const valor = parseValorOfx(getTagValue(b, 'TRNAMT'));
    const memo = getTagValue(b, 'MEMO');
    const name = getTagValue(b, 'NAME');
    
    return {
      banco: 'Sicoob',
      fitid: getTagValue(b, 'FITID'),
      data_transacao: parseDataOfx(getTagValue(b, 'DTPOSTED')),
      valor: valor,
      descricao: name ? `${memo} - ${name}` : memo,
      memo: memo,
      tipo_operacao: valor < 0 ? 'Saída' : 'Entrada'
    };
  });
}

// 2. PARSER SANTANDER
export function parseOFXSantander(ofxText) {
  const blocos = extrairBlocosSTMTTRN(ofxText);
  return blocos.map(b => {
    const valor = parseValorOfx(getTagValue(b, 'TRNAMT'));
    const memo = getTagValue(b, 'MEMO');
    
    return {
      banco: 'Santander',
      fitid: getTagValue(b, 'FITID'),
      data_transacao: parseDataOfx(getTagValue(b, 'DTPOSTED')),
      valor: valor,
      descricao: memo,
      memo: memo,
      tipo_operacao: valor < 0 ? 'Saída' : 'Entrada'
    };
  });
}

// 3. PARSER BRADESCO
export function parseOFXBradesco(ofxText) {
  const blocos = extrairBlocosSTMTTRN(ofxText);
  return blocos.map(b => {
    const valor = parseValorOfx(getTagValue(b, 'TRNAMT'));
    const memo = getTagValue(b, 'MEMO');
    
    return {
      banco: 'Bradesco',
      fitid: getTagValue(b, 'FITID'),
      data_transacao: parseDataOfx(getTagValue(b, 'DTPOSTED')),
      valor: valor,
      descricao: memo,
      memo: memo,
      tipo_operacao: valor < 0 ? 'Saída' : 'Entrada'
    };
  });
}

// 4. PARSER TRIBANCO
export function parseOFXTribanco(ofxText) {
  const blocos = extrairBlocosSTMTTRN(ofxText);
  return blocos.map(b => {
    const valor = parseValorOfx(getTagValue(b, 'TRNAMT'));
    const memo = getTagValue(b, 'MEMO');
    
    return {
      banco: 'Tribanco',
      fitid: getTagValue(b, 'FITID'),
      data_transacao: parseDataOfx(getTagValue(b, 'DTPOSTED')),
      valor: valor,
      descricao: memo,
      memo: memo,
      tipo_operacao: valor < 0 ? 'Saída' : 'Entrada'
    };
  });
}