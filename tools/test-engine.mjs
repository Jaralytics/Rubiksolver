// test-engine.mjs — Pruebas del motor lógico con identidades conocidas del cubo.
// Uso: node tools/test-engine.mjs

import { CubeModel, parseAlg, invertMoves, movesToString } from '../js/cube-model.js';

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

console.log(failed ? `\n${failed} prueba(s) fallaron` : '\nMotor OK');
process.exit(failed ? 1 : 0);
