// test-engine.mjs — Pruebas del motor lógico con identidades conocidas del cubo.
// Uso: node tools/test-engine.mjs

import { CubeModel, parseAlg, invertMoves, movesToString, toFaceTurns } from '../js/cube-model.js';

let failed = 0;
const check = (name, ok) => {
  if (!ok) failed++;
  console.log(`${ok ? '  ok ' : 'FALLA'}  ${name}`);
};

const exact = (m) => m.pieces.every((p) => m.isPieceSolved(p));
const after = (alg, times = 1) => {
  const m = new CubeModel(3);
  for (let i = 0; i < times; i++) m.applyAlg(alg);
  return m;
};
const order = (alg) => {
  const m = new CubeModel(3);
  for (let n = 1; n <= 1260; n++) {
    m.applyAlg(alg);
    if (exact(m)) return n;
  }
  return -1;
};
const same = (a, b) => {
  const x = after(a);
  const y = after(b);
  return x.pieces.every((p, i) => p.pos.join() === y.pieces[i].pos.join() && p.rot.join() === y.pieces[i].rot.join());
};

console.log('Órdenes de secuencias conocidas');
for (const f of 'UDLRFBMES') check(`${f} tiene orden 4`, order(f) === 4);
check("R U R' U' tiene orden 6", order("R U R' U'") === 6);
check('R U tiene orden 105', order('R U') === 105);
check("R U2 D' B D' tiene orden 1260", order("R U2 D' B D'") === 1260);
check("Sune (R U R' U R U2 R') tiene orden 6", order("R U R' U R U2 R'") === 6);
check("T-perm dos veces = identidad", exact(after("R U R' U' R' F R2 U' R' U' R U R' F'", 2)));
check('H-perm dos veces = identidad', exact(after('M2 U M2 U2 M2 U M2', 2)));
check("Ua tres veces = identidad", exact(after("M2 U M U2 M' U M2", 3)));

console.log('Equivalencias de notación');
check("r = R M'", same('r', "R M'"));
check("l = L M", same('l', 'L M'));
check("u = U E'", same('u', "U E'"));
check("d = D E", same('d', 'D E'));
check("f = F S", same('f', 'F S'));
check("b = B S'", same('b', "B S'"));
check("x = R M' L'", same('x', "R M' L'"));
check("y = U E' D'", same('y', "U E' D'"));
check("z = F S B'", same('z', "F S B'"));
check('Rw = r', same('Rw', 'r'));
check("x y x' = z", same("x y x'", 'z'));
check("x R x' = R ; y R y' = B ; z R z' = U", same("x R x'", 'R') && same("y R y'", 'B') && same("z R z'", 'U'));
check("R2' = R2 ; R3 = R' ; U2 U2 = identidad", same("R2'", 'R2') && same('R3', "R'") && exact(after('U2 U2')));
check("(R U R' U')3 repite el grupo", same("(R U R' U')3", "R U R' U' R U R' U' R U R' U'"));

console.log('Estados');
const superflip = after("U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2");
check('Superflip: 12 aristas volteadas en su sitio, esquinas resueltas',
  superflip.pieces.every((p) => {
    const n = p.home.filter((v) => v !== 0).length;
    const inPlace = p.pos.join() === p.home.join();
    return n === 2 ? inPlace && !superflip.isPieceSolved(p) : superflip.isPieceSolved(p);
  }));
const checker = after('M2 E2 S2');
check('M2 E2 S2: tablero de ajedrez (no resuelto, centros en su sitio)', !checker.isSolved() && checker.frame().join() === '1,0,0,0,1,0,0,0,1');
check('isSolved ignora la rotación global', after("x y2 z'").isSolved() && !exact(after("x y2 z'")));
check('normalize() deshace la rotación global', exact(after("x y2 z'").normalize()));
const scr = "D2 R' U2 F2 L B2 L' D2 R' B' U L' F' D R2 B r u' M S' x y";
const m = after(scr);
m.applyMoves(invertMoves(parseAlg(scr)));
check('alg + inverso = identidad (con anchos, cortes y rotaciones)', exact(m));
check('movesToString normaliza', movesToString(parseAlg("R2' U3 (r' M)2 Rw")) === "R2 U' r' M r' M r");
check('faceGrid del cubo resuelto', new CubeModel(3).faceGrid('F').flat().every((s) => s.face === 'F'));
const afterF = after('F').faceGrid('U');
check('F lleva la fila inferior de U a contener pegatinas de L', afterF[2].every((s) => s.face === 'L') && afterF[0].every((s) => s.face === 'U'));
const m4 = new CubeModel(4);
check('4x4: 56 piezas y Rw gira dos capas', m4.pieces.length === 56 && m4.piecesInMove(parseAlg('Rw', 4)[0]).length === 28);
check('2x2: 8 piezas, R U de orden 15', (() => {
  const c = new CubeModel(2);
  for (let n = 1; n <= 15; n++) {
    c.applyAlg('R U');
    if (c.pieces.every((p) => c.isPieceSolved(p))) return n === 15;
  }
  return false;
})());

console.log('Tamaños pares: notación, marco y pegatinas');
const at4 = (alg) => new CubeModel(4).applyAlg(alg);
check('4x4: 2R gira solo la segunda capa (12 piezas) y 2-3Rw las dos interiores (24)',
  m4.piecesInMove(parseAlg('2R', 4)[0]).length === 12 && m4.piecesInMove(parseAlg('2-3Rw', 4)[0]).length === 24);
check('4x4: Rw = R 2R ; r = Rw ; 3Rw = R 2R 3R', (() => {
  const key = (m) => m.pieces.map((p) => p.pos.join() + p.rot.join()).join('|');
  return key(at4('Rw')) === key(at4('R 2R')) && key(at4('r')) === key(at4('Rw')) && key(at4('3Rw')) === key(at4("R 2R 3R"));
})());
check("4x4: x = Rw Lw' (el cubo entero)", (() => {
  const key = (m) => m.pieces.map((p) => p.pos.join() + p.rot.join()).join('|');
  return key(at4("Rw Lw'")) === key(at4('x'));
})());
check('4x4 y 2x2: M, E y S no existen', ['M', 'E', "S'"].every((t) => [4, 2].every((n) => { try { parseAlg(t, n); return false; } catch { return true; } })));
check('movesToString conserva Rw y los rangos en 4x4', movesToString(parseAlg("Rw 2R2 2-3Rw' 3Rw", 4)) === "Rw 2R2 2-3Rw' 3Rw");
check('3x3: 2R es la capa central', parseAlg('2R', 3)[0].lo === 0 && parseAlg('2R', 3)[0].hi === 0);
check('4x4: un conmutador de centros deja solo tres centros fuera de sitio',
  (() => { const m = at4("L 2F L' 2D L 2F' L' 2D'"); return m.slots().filter((s) => s.color !== s.face).length === 3 && !m.stickersSolved() && m.stickersSolved([2, 3]); })());
check('4x4: el marco sale de la esquina y normalize() deshace la rotación del cubo entero', (() => {
  const m = at4("x y2 z'");
  return m.isSolved() && m.clone().normalize().stickersSolved();
})());
check('2x2: marco por la esquina y normalize()', (() => {
  const m = new CubeModel(2).applyAlg("x y2 z'");
  return m.isSolved() && !m.stickersSolved() && m.normalize().stickersSolved();
})());
check("2x2: R U R' U' tiene orden 6 en pegatinas", (() => {
  const m = new CubeModel(2);
  for (let i = 0; i < 6; i++) m.applyAlg("R U R' U'");
  return m.stickersSolved();
})());
const throws = (fn) => { try { fn(); return false; } catch { return true; } };
check('Un giro ancho que abarca todo el cubo se rechaza (Rw en 2x2, 3Rw en 3x3, 4Rw en 4x4)',
  throws(() => parseAlg('Rw', 2)) && throws(() => parseAlg('3Rw', 3)) && throws(() => parseAlg('4Rw', 4)) && throws(() => parseAlg('r', 2)));
check('Siguen siendo válidos Rw en 3x3 y 4x4, 3Rw y 2-3Rw en 4x4', !throws(() => parseAlg("Rw 3Rw' 2-3Rw2", 4)) && !throws(() => parseAlg("Rw r'", 3)));
check('Cubos pares: aunque L mueva la esquina de referencia, normalize() es coherente (L = R en 2x2 y 3Rw en 4x4, salvo rotación)', [2, 4].every((n) => {
  const key = (m) => m.pieces.map((p) => p.pos.join() + p.rot.join()).join('|');
  const l = new CubeModel(n).applyAlg('L').normalize();
  return key(l) === key(new CubeModel(n).applyAlg(n === 2 ? 'R' : '3Rw').normalize()) && l.frame().join() === '1,0,0,0,1,0,0,0,1' && new CubeModel(n).applyAlg("D' L B").normalize().frame().join() === '1,0,0,0,1,0,0,0,1';
}));
check('Cubos pares: una rotación del cubo entero sí tiene marco aunque la esquina se mueva', new CubeModel(4).applyAlg('x y').frame() !== null);

console.log('Megaminx: tablas y geometría');
const MM = {
  ...(await import('../js/megaminx-geometry.js')),
  ...(await import('../js/megaminx-model.js')),
};
const { FACES: MF, FACE_INDEX: MFI, SLOTS: MS, LAYER: ML, MUL: MMUL, INV: MINV, FACE_ACT: MFA, SLOT_ACT: MSA, MegaminxModel } = MM;
const isPerm = (row) => new Set(row).size === row.length && row.every((v) => v >= 0 && v < row.length);
const mmAfter = (alg, times = 1) => {
  const m = new MegaminxModel();
  for (let i = 0; i < times; i++) m.applyAlg(alg);
  return m;
};
const mmExact = (m) => m.pieces.every((p) => m.isPieceSolved(p));
const mmKey = (m) => m.pieces.map((p) => `${p.pos}:${p.rot}`).join('|');
const mmSame = (a, b) => mmKey(mmAfter(a)) === mmKey(mmAfter(b));
const mmOrder = (alg, max = 200) => {
  const m = new MegaminxModel();
  for (let n = 1; n <= max; n++) {
    m.applyAlg(alg);
    if (mmExact(m)) return n;
  }
  return -1;
};
const adj = (a, b) => MM.adjacent(MFI[a], MFI[b]);

check('Megaminx: 60 elementos en el grupo, identidad en el 0', MMUL.length === 60 && MMUL[0].every((v, i) => v === i));
check('Megaminx: MUL es cerrada y asociativa (muestra)', (() => {
  if (!MMUL.every(isPerm)) return false;
  for (let a = 0; a < 60; a += 7) for (let b = 0; b < 60; b += 5) for (let c = 0; c < 60; c += 3) {
    if (MMUL[MMUL[a][b]][c] !== MMUL[a][MMUL[b][c]]) return false;
  }
  return true;
})());
check('Megaminx: INV es la inversa', MINV.every((v, g) => MMUL[g][v] === 0 && MMUL[v][g] === 0));
check('Megaminx: FACE_ACT y SLOT_ACT son permutaciones', MFA.every(isPerm) && MSA.every(isPerm));
check('Megaminx: 62 huecos = 12 centros + 30 aristas + 20 esquinas',
  MS.length === 62 && [1, 2, 3].map((k) => MS.filter((s) => s.faces.length === k).length).join() === '12,30,20');
check('Megaminx: cada capa tiene 11 huecos (1 centro, 5 aristas, 5 esquinas)',
  ML.length === 12 && ML.every((l) => l.length === 11 && [1, 2, 3].every((k) => l.filter((s) => MS[s].faces.length === k).length === (k === 1 ? 1 : 5))));
const nbrs = (f) => MF.filter((g) => adj(f, g)).sort().join();
check('Megaminx: adyacencias de F y D', nbrs('F') === ['U', 'R', 'L', 'DR', 'DL'].sort().join() && nbrs('D') === ['DR', 'DL', 'DBR', 'DBL', 'B'].sort().join());
check('Megaminx: opuestas a distancia 6 y 5 vecinos por cara', MF.every((f, i) => MF.filter((g) => adj(f, g)).length === 5 && !adj(f, MF[(i + 6) % 12])));
check('Megaminx: poliedro no vacío en los 62 huecos; 12 + 60 + 60 pegatinas exteriores', (() => {
  const count = [0, 0, 0, 0];
  for (let s = 0; s < 62; s++) {
    const body = MM.piecePolyhedron(s);
    if (!body.length) return false;
    count[MS[s].faces.length] += body.filter((p) => p.face).length;
  }
  return count[1] === 12 && count[2] === 60 && count[3] === 60;
})());
check('Megaminx: el polígono exterior de un centro tiene 5 vértices y stickerPolygon también',
  MM.piecePolyhedron(0).find((p) => p.face === 'U').points.length === 5 && MM.stickerPolygon(0, 'U').length === 5 && MM.stickerPolygon(0, 'F') === null);

console.log('Megaminx: movimientos');
check('Megaminx: cada giro de cara tiene orden 5', MF.every((f) => mmOrder(f) === 5));
check("Megaminx: X X' y X2 X2' se cancelan", MF.every((f) => mmExact(mmAfter(`${f} ${f}'`)) && mmExact(mmAfter(`${f}2 ${f}2'`))));
check("Megaminx: U2 = U U ; U2' = U' U' ; X3 no existe", mmSame('U2', 'U U') && mmSame("U2'", "U' U'") && mmSame('U2', "U' U' U'") && throws(() => MM.parseAlg('U3')));
check("Megaminx: invertMoves de parseAlg", MM.movesToString(MM.invertMoves(MM.parseAlg("U2' R BR' DBL2 y"))) === "y' DBL2' BR R' U2");
check('Megaminx: alg + inverso = identidad', (() => {
  const alg = "R U2' BR DBL' y2 F2 D' L (DR2 DL')2 B";
  const m = mmAfter(alg);
  m.applyMoves(MM.invertMoves(MM.parseAlg(alg)));
  return mmExact(m) && !mmExact(mmAfter(alg));
})());
check("Megaminx: (R U R' U') tiene orden 6", mmOrder("R U R' U'") === 6 && mmExact(mmAfter("(R U R' U')6")) && mmSame("(R U R' U')2", "R U R' U' R U R' U'"));
const nonAdj = MF.flatMap((a, i) => MF.slice(i + 1).filter((b, j) => !adj(a, b) && MF[i + 1 + j] !== MF[(i + 6) % 12]).map((b) => [a, b]));
check('Megaminx: R y L no son adyacentes ni opuestas', !adj('R', 'L') && MFI.L !== (MFI.R + 6) % 12);
check("Megaminx: caras no adyacentes y no opuestas conmutan", nonAdj.length > 0 && nonAdj.every(([a, b]) => mmExact(mmAfter(`${a} ${b} ${a}' ${b}'`))));
check("Megaminx: R L R' L' es la identidad", mmExact(mmAfter("R L R' L'")));
check("Megaminx: caras adyacentes no conmutan", !mmExact(mmAfter("R U R' U'")) && !mmExact(mmAfter("F R F' R'")));

console.log('Megaminx: invariantes de estados aleatorios');
const parity = (perm) => {
  const seen = new Array(perm.length).fill(false);
  let swaps = 0;
  perm.forEach((_, i) => {
    let len = 0;
    for (let j = i; !seen[j]; j = perm[j]) { seen[j] = true; len++; }
    if (len) swaps += len - 1;
  });
  return swaps % 2;
};
// Orientación: en qué posición, dentro de la lista de caras del hueco, está la pegatina de referencia.
const refSpot = (p) => MS[p.pos].faceIdx.indexOf(MFA[p.rot][MFI[p.home[0]]]);
// En las esquinas la lista de caras (orden de FACES) puede recorrerse en sentido horario o
// antihorario según el hueco; el giro se cuenta siempre en sentido antihorario visto desde fuera.
const mCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const twistOf = (p) => {
  const [a, b, c] = MS[p.pos].faceIdx.map((f) => MM.NORMALS[f]);
  const i = refSpot(p);
  return mDot(mCross(a, b), c) > 0 ? i : (3 - i) % 3;
};
let seed = 12345;
const rnd = (n) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % n;
};
const suffix = ['', "'", '2', "2'"];
check('Megaminx: 200 mezclas aleatorias conservan las invariantes y se deshacen', (() => {
  for (let t = 0; t < 200; t++) {
    const alg = Array.from({ length: 10 + rnd(40) }, () => MF[rnd(12)] + suffix[rnd(4)]).join(' ');
    const m = mmAfter(alg);
    const edges = m.pieces.filter((p) => p.kind === 2);
    const corners = m.pieces.filter((p) => p.kind === 3);
    if (parity(corners.map((p) => p.pos - 42)) || parity(edges.map((p) => p.pos - 12))) return false;
    if (edges.reduce((s, p) => s + refSpot(p), 0) % 2) return false;
    if (corners.reduce((s, p) => s + twistOf(p), 0) % 3) return false;
    if (!m.pieces.every((p) => p.pos === MSA[p.rot][p.slot])) return false;
    if (!m.pieces.filter((p) => p.kind === 1).every((p) => p.pos === p.slot)) return false;
    if (!m.clone().applyMoves(MM.invertMoves(MM.parseAlg(alg))).isSolved()) return false;
  }
  return true;
})());

console.log('Megaminx: rotación global, notación y sentido');
check('Megaminx: y gira el puzzle entero; normalize() lo deja resuelto', (() => {
  const m = mmAfter('y');
  return m.isSolved() && m.frame() !== 0 && !mmExact(m) && mmExact(m.normalize()) && m.frame() === 0;
})());
check("Megaminx: y tiene orden 5 y y R y' no es R", mmOrder('y') === 5 && !mmSame("y R y'", 'R'));
check('Megaminx: "B R" son dos movimientos y "BR" uno', MM.parseAlg('B R').length === 2 && MM.parseAlg('BR').length === 1 && MM.parseAlg('BR')[0].face === 'BR' && MM.parseAlg('DBL2\'')[0].text === "DBL2'");
check('Megaminx: un token inválido lanza error', throws(() => MM.parseAlg('U X')) && throws(() => MM.parseMove('Q')) && throws(() => MM.parseMove('U3')));
check('Megaminx: axisVector es la normal de la cara y unit son 72 grados',
  new MegaminxModel().axisVector(MM.parseAlg('F')[0]).join() === MM.NORMALS[1].join() && Math.abs(new MegaminxModel().unit - 1.2566370614359172) < 1e-12);
check('Megaminx: sentido horario: tras U, la arista U-F está en el hueco U-L', (() => {
  const slot = (a, b) => MM.slotIndex([MFI[a], MFI[b]]);
  const m = mmAfter('U');
  const p = m.pieces[slot('U', 'F')];
  return p.pos === slot('U', 'L') && m.stickerAt(slot('U', 'L'), 'U').face === 'U' && m.stickerAt(slot('U', 'L'), 'L').face === 'F';
})());

console.log('Solo giros de caras');
// La versión de caras, deshecha, seguida del original debe dejar solo una rotación del cubo.
const sameUpToRotation = (size, alg) => {
  const moves = parseAlg(alg, size);
  const faces = toFaceTurns(moves, size);
  const h = (size - 1) / 2;
  const onlyFaces = faces.every((m) => m.lo === -h || m.hi === h);
  return onlyFaces && new CubeModel(size).applyMoves(invertMoves(faces)).applyMoves(moves).isSolved();
};
const faceText = (alg) => movesToString(toFaceTurns(parseAlg(alg)));
check("Ua con M: M2 U M U2 M' U M2 = L2 R2 D L' R F2 L R' D L2 R2", faceText("M2 U M U2 M' U M2") === "L2 R2 D L' R F2 L R' D L2 R2");
check("y' R' U' R = F' U' F; r U = L F", faceText("y' R' U' R") === "F' U' F" && faceText('r U') === 'L F');
check('Rotaciones, capas centrales y anchas equivalen a giros de caras (2x2 a 5x5)', [
  [2, "x R y U' z F2 R"],
  [3, "M2 U M U2 M' U M2 r U R' U' r' F R F' x R' U R' D2 R U' R' D2 R2 x' E S' d f' b l u"],
  [4, "2R2 U2 2R2 Uw2 2R2 2U2 3Rw x Rw' y 2-3Rw z' Lw"],
  [5, "M E S 2R 3R 3Rw 2-3Rw 2-4Rw' x y z Rw' 4Rw"],
].every(([size, alg]) => sameUpToRotation(size, alg)));

console.log(failed ? `\n${failed} prueba(s) fallaron` : '\nMotor OK');
process.exit(failed ? 1 : 0);
