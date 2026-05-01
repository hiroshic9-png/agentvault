/**
 * AgentVault Tools — Web Fetch
 * 
 * URLからテキストコンテンツを取得。HTMLをクリーンなテキストに変換。
 */

import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (compatible; AgentVault/1.0)';
const MAX_CONTENT_LENGTH = 50000; // 50KB制限（トークン節約）

/**
 * URLからテキストコンテンツを取得
 * @param {string} url - 取得するURL
 * @param {number} maxLength - 最大文字数
 * @returns {Promise<{url: string, title: string, content: string, contentLength: number}>}
 */
export async function webFetch(url, maxLength = MAX_CONTENT_LENGTH) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,text/plain',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });

  if (!resp.ok) {
    throw new Error(`Fetch failed: HTTP ${resp.status} ${resp.statusText}`);
  }

  const contentType = resp.headers.get('content-type') || '';
  const rawText = await resp.text();

  let title = '';
  let content = '';

  if (contentType.includes('text/html') || contentType.includes('xhtml')) {
    // HTML → テキスト変換
    const $ = cheerio.load(rawText);
    
    // タイトル取得
    title = $('title').first().text().trim();
    
    // 不要な要素を削除
    $('script, style, nav, footer, header, aside, iframe, noscript, svg, [role="navigation"], [role="banner"], .sidebar, .nav, .menu, .ad, .advertisement').remove();
    
    // メインコンテンツを優先的に取得
    const mainSelectors = ['main', 'article', '[role="main"]', '.content', '.post', '.entry'];
    let mainContent = '';
    
    for (const sel of mainSelectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 100) {
        mainContent = el.text();
        break;
      }
    }
    
    content = mainContent || $('body').text();
    
    // テキストクリーンアップ
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  } else {
    // プレーンテキスト
    content = rawText.trim();
  }

  // 文字数制限
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + `\n\n[Truncated at ${maxLength} characters]`;
  }

  return {
    url: resp.url, // リダイレクト後の最終URL
    title,
    content,
    contentLength: content.length,
  };
}
