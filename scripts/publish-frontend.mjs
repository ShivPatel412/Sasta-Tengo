import { cpSync, existsSync, rmSync } from 'node:fs';

const source = new URL('../frontend/build/', import.meta.url);
const target = new URL('../backend/public/', import.meta.url);

if (!existsSync(source)) throw new Error('Run the frontend build first.');

rmSync(new URL('static/', target), { recursive: true, force: true });
rmSync(new URL('hot', target), { force: true });
cpSync(source, target, { recursive: true });
