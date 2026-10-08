// /feed/ — the address WordPress used, kept so existing subscribers and
// NewsBreak keep working. GitHub Pages serves feed/index.xml for /feed/.
import { feedResponse } from '../../lib/feed';
export const GET = feedResponse;
