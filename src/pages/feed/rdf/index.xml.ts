// /feed/rdf/ — a WordPress feed address. After the move off WordPress it was a
// 404, so a reader or partner still holding it got nothing; it serves the
// same full-text feed as /feed/.
import { feedResponse } from '../../../lib/feed';
export const GET = feedResponse;
