import { build } from './build.mjs';
import { verifyCatalog } from './verify.mjs';

export default { id: 'megaminx', size: 12, build, verify: verifyCatalog };
