/**
 * YouTube URL まわりのヘルパー。
 *
 * 対応形式:
 * - https://youtu.be/xxxxxxxxxxx
 * - https://www.youtube.com/watch?v=xxxxxxxxxxx
 * - https://www.youtube.com/shorts/xxxxxxxxxxx
 *
 * 上記から動画IDを取り出せない場合はすべて null を返す。
 */

/** YouTube の動画IDは 11 文字の [A-Za-z0-9_-] */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
]);

const SHORT_HOSTS = new Set(['youtu.be', 'www.youtu.be']);

function isVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

/**
 * YouTube の URL から動画IDを抽出する。
 * 抽出できなければ null。
 */
export function extractYouTubeVideoId(
  input: string | null | undefined,
): string | null {
  if (!input) return null;

  const raw = input.trim();
  if (!raw) return null;

  // プロトコル省略（youtu.be/xxxx など）でも扱えるように補う
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  // 先頭・末尾の / を落として segment 化
  const segments = url.pathname.split('/').filter(Boolean);

  // https://youtu.be/xxxx
  if (SHORT_HOSTS.has(host)) {
    const id = segments[0];
    return id && isVideoId(id) ? id : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) return null;

  // https://www.youtube.com/watch?v=xxxx
  if (segments[0] === 'watch') {
    const id = url.searchParams.get('v');
    return id && isVideoId(id) ? id : null;
  }

  // https://www.youtube.com/shorts/xxxx （embed 形式もついでに受ける）
  if (segments[0] === 'shorts' || segments[0] === 'embed') {
    const id = segments[1];
    return id && isVideoId(id) ? id : null;
  }

  return null;
}

/**
 * URL でも動画ID単体でも受け取れるように正規化する内部ヘルパー。
 */
function toVideoId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (isVideoId(trimmed)) return trimmed;
  return extractYouTubeVideoId(trimmed);
}

/** 入力が対応形式の YouTube URL かどうか（Zod のバリデーション用） */
export function isValidYouTubeUrl(input: string | null | undefined): boolean {
  return extractYouTubeVideoId(input) !== null;
}

/**
 * 埋め込み用 URL（iframe の src）を返す。
 * 動画IDが取れなければ null。
 */
export function getYouTubeEmbedUrl(
  urlOrId: string | null | undefined,
): string | null {
  const id = toVideoId(urlOrId);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/**
 * YouTube 自動サムネイルの URL を返す。
 * 動画IDが取れなければ null（呼び出し側でプレースホルダーにフォールバックする）。
 */
export function getYouTubeThumbnailUrl(
  urlOrId: string | null | undefined,
): string | null {
  const id = toVideoId(urlOrId);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
