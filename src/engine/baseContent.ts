import skills from '../../data/skills.json';
import characters from '../../data/characters.json';
import enemies from '../../data/enemies.json';
import gacha from '../../data/gacha.json';
import { parseContent, type Content } from './schema';

export const RAW_BASE_CONTENT = { skills, characters, enemies, gacha };

function load(): Content {
  const r = parseContent(RAW_BASE_CONTENT);
  if (!r.ok) throw new Error('data/*.json 검증 실패:\n' + r.errors.join('\n'));
  return r.content;
}

export const BASE_CONTENT: Content = load();
