import * as FileSystem from 'expo-file-system/legacy';

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const LIB_JS_URL = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js';
const LIB_CSS_URL = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
const PAKO_URL = 'https://unpkg.com/pako@2.1.0/dist/pako.min.js';

const RAIZ = `${FileSystem.documentDirectory}mapcache/`;
const DIR_LIB = `${RAIZ}lib/`;
const DIR_PACOTES = `${RAIZ}pacotes/`;
const DIR_TMP = `${RAIZ}tmp/`;

const ZOOM_MIN = 9;
const ZOOM_MAX = 14;
const PADDING_KM = 1.6;
const LIMITE_BYTES = 8 * 1024 * 1024;
const CONCORRENCIA = 5;
const MAX_FONTSTACKS = 6;
const RANGES_GLYPH = ['0-255', '256-511'];
const INCLUIR_ROTULOS = true;

/* Pede bytes sem compressão de transporte. */
const HEADERS_TILE = { 'Accept-Encoding': 'identity' };

const LOG = '[MAPA-OFFLINE][CACHE]';
const log = (...a) => console.log(LOG, ...a);
const logErro = (...a) => console.error(LOG, ...a);

/* ---------------- infra ---------------- */

const garantirDir = async (dir) => {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    log('Diretório criado:', dir);
  }
};

const sanitizarScript = (txt) => txt.replace(/<\/script/gi, '<\\/script');

const baixarTexto = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
};

const baixarBase64 = async (url, nomeArquivo, headers) => {
  const destino = `${DIR_TMP}${nomeArquivo}`;
  const res = await FileSystem.downloadAsync(url, destino, headers ? { headers } : undefined);
  if (res.status !== 200) {
    FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
    throw new Error(`HTTP ${res.status}`);
  }
  const b64 = await FileSystem.readAsStringAsync(destino, {
    encoding: FileSystem.EncodingType.Base64
  });
  FileSystem.deleteAsync(destino, { idempotent: true }).catch(() => {});
  return {
    b64,
    bytes: Math.floor((b64.length * 3) / 4),
    contentType: res.headers?.['Content-Type'] || res.headers?.['content-type'] || null,
    contentEncoding: res.headers?.['Content-Encoding'] || res.headers?.['content-encoding'] || null
  };
};

const executarEmLotes = async (itens, limite, worker) => {
  let cursor = 0;
  const correr = async () => {
    while (cursor < itens.length) {
      const i = cursor++;
      try { await worker(itens[i], i); } catch (e) { /* falha isolada */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, correr));
};

/* ---------------- inspeção MVT ---------------- */

const b64ParaBytes = (b64) => {
  const bin = global.atob ? global.atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const hexPrimeiros = (bytes, n = 16) =>
  Array.from(bytes.slice(0, n)).map((b) => b.toString(16).padStart(2, '0')).join(' ');

/** Lê o protobuf do MVT o suficiente para listar camadas e contar features. */
const inspecionarMVT = (bytes) => {
  let p = 0;
  const camadas = [];
  const varint = () => {
    let r = 0, s = 0, c;
    do { c = bytes[p++]; r |= (c & 0x7f) << s; s += 7; } while (c & 0x80 && p < bytes.length);
    return r >>> 0;
  };
  try {
    while (p < bytes.length && camadas.length < 40) {
      const tag = varint();
      const field = tag >>> 3, wt = tag & 7;
      if (wt === 0) { varint(); continue; }
      if (wt === 5) { p += 4; continue; }
      if (wt === 1) { p += 8; continue; }
      if (wt !== 2) break;
      const len = varint();
      if (field === 3) {
        const end = p + len;
        let nome = null, feats = 0, extent = null;
        while (p < end) {
          const t2 = varint();
          const f2 = t2 >>> 3, w2 = t2 & 7;
          if (w2 === 2) {
            const l2 = varint();
            if (f2 === 1) {
              let s = '';
              for (let i = 0; i < l2; i++) s += String.fromCharCode(bytes[p + i]);
              nome = s;
            } else if (f2 === 2) feats++;
            p += l2;
          } else if (w2 === 0) {
            const v = varint();
            if (f2 === 5) extent = v;
          } else if (w2 === 5) p += 4;
          else if (w2 === 1) p += 8;
          else { p = end; }
        }
        p = end;
        camadas.push({ nome, features: feats, extent });
      } else {
        p += len;
      }
    }
  } catch (e) {
    return { erro: e.message, camadas };
  }
  return { camadas };
};

/* ---------------- biblioteca ---------------- */

export async function garantirBiblioteca() {
  await garantirDir(DIR_LIB);

  const jsPath = `${DIR_LIB}maplibre-gl.js`;
  const cssPath = `${DIR_LIB}maplibre-gl.css`;
  const pakoPath = `${DIR_LIB}pako.min.js`;

  const [iJs, iCss, iPako] = await Promise.all([
    FileSystem.getInfoAsync(jsPath),
    FileSystem.getInfoAsync(cssPath),
    FileSystem.getInfoAsync(pakoPath)
  ]);

  let js, css, pako;

  if (!iJs.exists || !iCss.exists) {
    log('Baixando MapLibre.');
    const [jsBruto, cssBruto] = await Promise.all([baixarTexto(LIB_JS_URL), baixarTexto(LIB_CSS_URL)]);
    js = sanitizarScript(jsBruto);
    css = cssBruto;
    await FileSystem.writeAsStringAsync(jsPath, js);
    await FileSystem.writeAsStringAsync(cssPath, css);
  } else {
    const [a, b] = await Promise.all([
      FileSystem.readAsStringAsync(jsPath),
      FileSystem.readAsStringAsync(cssPath)
    ]);
    js = sanitizarScript(a);
    css = b;
  }

  if (!iPako.exists) {
    log('Baixando pako.');
    pako = sanitizarScript(await baixarTexto(PAKO_URL));
    await FileSystem.writeAsStringAsync(pakoPath, pako);
  } else {
    pako = sanitizarScript(await FileSystem.readAsStringAsync(pakoPath));
  }

  log('Biblioteca carregada:', {
    js: js.length, css: css.length, pako: pako?.length || 0
  });

  return { js, css, pako };
}

export async function bibliotecaDisponivel() {
  const a = await FileSystem.getInfoAsync(`${DIR_LIB}maplibre-gl.js`);
  return a.exists;
}

/* ---------------- tiles ---------------- */

const tileX = (lon, z) => Math.floor(((lon + 180) / 360) * Math.pow(2, z));

const tileY = (lat, z) => {
  const rad = (lat * Math.PI) / 180;
  const n = Math.pow(2, z);
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
};

const bboxDaRota = (coords, destLat, destLon) => {
  let minLat = destLat, maxLat = destLat, minLon = destLon, maxLon = destLon;
  (coords || []).forEach(([lon, lat]) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
  });
  const latMedio = (minLat + maxLat) / 2;
  const dLat = PADDING_KM / 111;
  const dLon = PADDING_KM / (111 * Math.max(0.2, Math.cos((latMedio * Math.PI) / 180)));
  return {
    minLat: Math.max(-85, minLat - dLat),
    maxLat: Math.min(85, maxLat + dLat),
    minLon: minLon - dLon,
    maxLon: maxLon + dLon,
    centroLat: latMedio,
    centroLon: (minLon + maxLon) / 2
  };
};

const listarTiles = (bbox, zMax) => {
  const saida = [];
  for (let z = ZOOM_MIN; z <= zMax; z++) {
    const x0 = tileX(bbox.minLon, z), x1 = tileX(bbox.maxLon, z);
    const y0 = tileY(bbox.maxLat, z), y1 = tileY(bbox.minLat, z);
    const limite = Math.pow(2, z) - 1;
    const doZoom = [];
    for (let x = Math.max(0, x0); x <= Math.min(limite, x1); x++) {
      for (let y = Math.max(0, y0); y <= Math.min(limite, y1); y++) {
        doZoom.push({ z, x, y, chave: `${z}/${x}/${y}` });
      }
    }
    const cx = tileX(bbox.centroLon, z), cy = tileY(bbox.centroLat, z);
    doZoom.sort((a, b) =>
      (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy))
    );
    saida.push(...doZoom);
  }
  return saida;
};

/* ---------------- style ---------------- */

const resolverFonteVetorial = async (style) => {
  for (const [nome, src] of Object.entries(style.sources || {})) {
    if (src.type !== 'vector') continue;
    let template = Array.isArray(src.tiles) ? src.tiles[0] : null;
    let maxzoom = src.maxzoom;
    if (!template && src.url) {
      const tj = JSON.parse(await baixarTexto(src.url));
      template = Array.isArray(tj.tiles) ? tj.tiles[0] : null;
      if (typeof tj.maxzoom === 'number') maxzoom = tj.maxzoom;
    }
    if (template) {
      log('Fonte vetorial:', { nome, template, maxzoom });
      return { nome, template, maxzoom: Math.min(maxzoom ?? ZOOM_MAX, ZOOM_MAX) };
    }
  }
  throw new Error('Nenhuma fonte vetorial encontrada no style.');
};

const coletarFontes = (layers) => {
  const set = new Set();
  layers.forEach((l) => {
    if (l.type !== 'symbol') return;
    const f = l.layout?.['text-font'];
    if (Array.isArray(f)) set.add(f.join(','));
    else if (typeof f === 'string') set.add(f);
  });
  if (!set.size) set.add('Noto Sans Regular');
  return [...set].slice(0, MAX_FONTSTACKS);
};

const limparIcones = (layer) => {
  const c = { ...layer };
  if (c.layout) {
    const lay = { ...c.layout };
    Object.keys(lay).forEach((k) => { if (k.indexOf('icon-') === 0) delete lay[k]; });
    c.layout = lay;
  }
  if (c.paint) {
    const p = { ...c.paint };
    Object.keys(p).forEach((k) => { if (k.indexOf('icon-') === 0) delete p[k]; });
    c.paint = p;
  }
  return c;
};

export function sanitizarStyleOffline(style, { temGlyphs = false, corFundo = '#e9e5dd' } = {}) {
  if (!style || !Array.isArray(style.layers)) return null;

  const fontesValidas = new Set();
  const sources = {};

  Object.entries(style.sources || {}).forEach(([nome, src]) => {
    if (src && src.type === 'vector') {
      fontesValidas.add(nome);
      sources[nome] = {
        type: 'vector',
        tiles: ['offline://{z}/{x}/{y}'],
        minzoom: typeof src.minzoom === 'number' ? src.minzoom : ZOOM_MIN,
        maxzoom: typeof src.maxzoom === 'number' ? src.maxzoom : ZOOM_MAX
      };
    }
  });

  if (!fontesValidas.size) return null;

  const usarRotulos = Boolean(INCLUIR_ROTULOS && temGlyphs);
  const layers = [];
  let symbolsDescartados = 0;

  style.layers.forEach((l) => {
    if (!l || !l.type) return;
    if (l.type === 'background') { layers.push({ ...l }); return; }
    if (!fontesValidas.has(l.source)) return;
    if (l.type === 'symbol') {
      if (!usarRotulos) { symbolsDescartados++; return; }
      const limpo = limparIcones(l);
      if (!limpo.layout || !limpo.layout['text-field']) { symbolsDescartados++; return; }
      layers.push(limpo);
      return;
    }
    layers.push({ ...l });
  });

  if (!layers.some((l) => l.type === 'background')) {
    layers.unshift({ id: 'fundo-offline', type: 'background', paint: { 'background-color': corFundo } });
  }

  const out = { version: 8, sources, layers };
  if (usarRotulos) out.glyphs = 'offline-glyphs://{fontstack}/{range}';

  const sourceLayers = [...new Set(layers.map((l) => l['source-layer']).filter(Boolean))];
  log('Style sanitizado:', {
    camadas: layers.length,
    symbolsDescartados,
    sourceLayersEsperados: sourceLayers
  });

  return out;
}

/* ---------------- pacotes ---------------- */

export const chavePacote = (nome, lat, lon) =>
  `${String(nome || 'local').replace(/[^\w]/g, '_').slice(0, 60)}_${Number(lat).toFixed(5)}_${Number(lon).toFixed(5)}`;

const caminhoPacote = (chave) => `${DIR_PACOTES}${chave}.json`;

export async function carregarPacote(chave) {
  try {
    const caminho = caminhoPacote(chave);
    const info = await FileSystem.getInfoAsync(caminho);
    if (!info.exists) { log('Pacote não encontrado:', chave); return null; }

    const pkg = JSON.parse(await FileSystem.readAsStringAsync(caminho));

    if (!pkg?.tiles || !Object.keys(pkg.tiles).length || pkg?.stats?.completo !== true) {
      logErro('Pacote inválido ou incompleto:', { chave, stats: pkg?.stats || null });
      return null;
    }

    const temGlyphs = Boolean(pkg.glyphs && Object.keys(pkg.glyphs).length > 0);
    const styleLimpo = sanitizarStyleOffline(pkg.style, { temGlyphs });
    if (!styleLimpo) { logErro('Style não sanitizável:', chave); return null; }

    pkg.style = styleLimpo;
    if (!styleLimpo.glyphs) pkg.glyphs = {};
    pkg.sprite = null;

    /* Amostra: prova de que os bytes são MVT com conteúdo. */
    const chaves = Object.keys(pkg.tiles).sort();
    const amostra = chaves.filter((k) => k.startsWith(`${ZOOM_MAX}/`)).slice(0, 2);
    amostra.forEach((k) => {
      const bytes = b64ParaBytes(pkg.tiles[k]);
      const insp = inspecionarMVT(bytes);
      log('AMOSTRA DE TILE:', {
        chave: k,
        bytes: bytes.length,
        hex: hexPrimeiros(bytes),
        camadas: insp.camadas,
        erroParse: insp.erro || null
      });
    });

    log('Pacote validado:', { chave, versao: pkg.versao, tiles: chaves.length });
    return pkg;
  } catch (error) {
    logErro('Erro ao carregar pacote:', chave, error.message);
    return null;
  }
}

export async function removerPacote(chave) {
  try {
    await FileSystem.deleteAsync(caminhoPacote(chave), { idempotent: true });
    log('Pacote removido:', chave);
    return true;
  } catch (error) {
    logErro('Erro ao remover pacote:', error.message);
    return false;
  }
}

export async function criarPacoteOffline({
  rotaCoords, destLat, destLon, chave, corFundo = '#e9e5dd', onProgress
}) {
  const inicio = Date.now();

  await garantirDir(DIR_PACOTES);
  await garantirDir(DIR_TMP);
  await garantirBiblioteca();

  const progresso = (fase, pct, detalhe) => {
    if (onProgress) onProgress({ fase, pct: Math.max(0, Math.min(100, Math.round(pct))), detalhe });
  };

  log('=== INICIANDO DOWNLOAD ===', { chave, pontosRota: rotaCoords?.length || 0 });

  progresso('style', 2, 'Lendo estilo do mapa');
  const styleOriginal = JSON.parse(await baixarTexto(STYLE_URL));
  const fonte = await resolverFonteVetorial(styleOriginal);
  const zMax = fonte.maxzoom;
  const bbox = bboxDaRota(rotaCoords, destLat, destLon);
  const alvos = listarTiles(bbox, zMax);

  log('Área calculada:', { bbox, zMax, totalTiles: alvos.length });

  const tiles = {};
  const falhasTiles = [];
  let bytes = 0, baixados = 0, ignorados = 0, estourou = false;
  let primeiroDiag = null;

  progresso('tiles', 5, `${alvos.length} tiles na fila`);

  await executarEmLotes(alvos, CONCORRENCIA, async (t) => {
    if (estourou) { ignorados++; return; }
    const url = fonte.template.replace('{z}', t.z).replace('{x}', t.x).replace('{y}', t.y);
    try {
      const r = await baixarBase64(url, `t_${t.z}_${t.x}_${t.y}.pbf`, HEADERS_TILE);
      if (bytes + r.bytes > LIMITE_BYTES) { estourou = true; ignorados++; return; }

      if (!primeiroDiag && t.z === zMax) {
        const b = b64ParaBytes(r.b64);
        const insp = inspecionarMVT(b);
        primeiroDiag = {
          chave: t.chave,
          contentType: r.contentType,
          contentEncoding: r.contentEncoding,
          bytes: b.length,
          hex: hexPrimeiros(b),
          camadas: insp.camadas,
          erroParse: insp.erro || null
        };
        log('DIAG DO PRIMEIRO TILE BAIXADO:', primeiroDiag);
      }

      tiles[t.chave] = r.b64;
      bytes += r.bytes;
      baixados++;
      if (baixados % 6 === 0) {
        progresso('tiles', 5 + (baixados / alvos.length) * 80, `${baixados}/${alvos.length} tiles`);
      }
    } catch (error) {
      falhasTiles.push({ chave: t.chave, erro: error.message });
    }
  });

  log('Tiles:', { solicitados: alvos.length, baixados, falhas: falhasTiles.length, ignorados, bytes });

  if (!baixados) throw new Error('Nenhum tile pôde ser baixado.');

  const glyphs = {};
  let glyphsCompletos = false;

  if (INCLUIR_ROTULOS && styleOriginal.glyphs) {
    progresso('glyphs', 88, 'Baixando fontes dos rótulos');
    const tarefas = [];
    coletarFontes(styleOriginal.layers || []).forEach((fs) => {
      RANGES_GLYPH.forEach((range) => tarefas.push({ fs, range, chave: `${fs}/${range}` }));
    });
    let ok = 0;
    await executarEmLotes(tarefas, 3, async (g, i) => {
      const url = styleOriginal.glyphs
        .replace('{fontstack}', encodeURIComponent(g.fs))
        .replace('{range}', g.range);
      try {
        const r = await baixarBase64(url, `g_${i}.pbf`, HEADERS_TILE);
        if (bytes + r.bytes > LIMITE_BYTES) return;
        glyphs[g.chave] = r.b64; bytes += r.bytes; ok++;
      } catch (e) { /* opcional */ }
    });
    glyphsCompletos = ok === tarefas.length && tarefas.length > 0;
  }

  const tilesCompletos = baixados === alvos.length && ignorados === 0 && falhasTiles.length === 0;

  const style = sanitizarStyleOffline({
    version: 8,
    sources: {
      [fonte.nome]: {
        type: 'vector', tiles: ['offline://{z}/{x}/{y}'],
        minzoom: ZOOM_MIN, maxzoom: zMax
      }
    },
    layers: styleOriginal.layers || [],
    glyphs: styleOriginal.glyphs
  }, { temGlyphs: glyphsCompletos, corFundo });

  if (!style) throw new Error('Não foi possível montar um style offline válido.');

  const pacote = {
    versao: 8,
    criadoEm: new Date().toISOString(),
    maxZoom: zMax,
    zoomMin: ZOOM_MIN,
    bbox,
    style,
    tiles,
    glyphs: style.glyphs ? glyphs : {},
    sprite: null,
    diagPrimeiroTile: primeiroDiag,
    stats: {
      tiles: baixados,
      totalTiles: alvos.length,
      falhasTiles: falhasTiles.length,
      ignorados,
      glyphs: style.glyphs ? Object.keys(glyphs).length : 0,
      rotulos: Boolean(style.glyphs),
      bytes,
      completo: tilesCompletos,
      parcial: !tilesCompletos,
      motivoIncompleto: tilesCompletos ? null
        : estourou ? 'limite de armazenamento'
        : falhasTiles.length ? 'falha de download de tiles' : 'tiles ignorados'
    }
  };

  progresso('salvando', 96, 'Gravando no aparelho');
  await FileSystem.writeAsStringAsync(caminhoPacote(chave), JSON.stringify(pacote));
  FileSystem.deleteAsync(DIR_TMP, { idempotent: true }).catch(() => {});

  log('=== PACOTE FINALIZADO ===', { chave, stats: pacote.stats, tempoMs: Date.now() - inicio });
  progresso('concluido', 100, `${baixados}/${alvos.length} tiles · ${(bytes / 1048576).toFixed(1)} MB`);
  return pacote;
}

/* ---------------- injeção ---------------- */

export function montarLotes(pacote, tamanhoLote = 170000) {
  const lotes = [];

  const empacotar = (objeto, nomeFuncao) => {
    let atual = {}, peso = 0;
    Object.entries(objeto || {}).forEach(([chave, valor]) => {
      const tamanho = chave.length + valor.length + 8;
      if (peso + tamanho > tamanhoLote && Object.keys(atual).length) {
        lotes.push(`window.${nomeFuncao}(${JSON.stringify(atual)});true;`);
        atual = {}; peso = 0;
      }
      atual[chave] = valor; peso += tamanho;
    });
    if (Object.keys(atual).length) {
      lotes.push(`window.${nomeFuncao}(${JSON.stringify(atual)});true;`);
    }
  };

  empacotar(pacote.tiles, '__addTiles');
  empacotar(pacote.glyphs, '__addGlyphs');

  log('Lotes preparados:', { lotes: lotes.length, tiles: Object.keys(pacote.tiles || {}).length });
  return lotes;
}