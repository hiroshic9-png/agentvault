/**
 * AgentVault Tools — Web Search (DuckDuckGo)
 * 
 * APIキー不要のWeb検索。DuckDuckGo HTML版をスクレイピング。
 * エージェントにとって最も頻繁に必要なツールを無料で提供。
 */

import * as cheerio from 'cheerio';

const DDG_URL = 'https://html.duckduckgo.com/html/';
const USER_AGENT = 'Mozilla/5.0 (compatible; AgentVault/1.0)';

/**
 * DuckDuckGoでWeb検索を実行
 * @param {string} query - 検索クエリ
 * @param {number} maxResults - 最大結果数 (default: 8)
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
export async function webSearch(query, maxResults = 8) {
  const params = new URLSearchParams({ q: query });
  
  const resp = await fetch(`${DDG_URL}?${params}`, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    throw new Error(`Search failed: HTTP ${resp.status}`);
  }

  const html = await resp.text();
  const $ = cheerio.load(html);
  const results = [];

  $('.result').each((i, el) => {
    if (results.length >= maxResults) return false;
    
    const $el = $(el);
    const titleEl = $el.find('.result__a');
    const snippetEl = $el.find('.result__snippet');
    const urlEl = $el.find('.result__url');

    const title = titleEl.text().trim();
    let url = titleEl.attr('href') || '';
    const snippet = snippetEl.text().trim();

    // DDGのリダイレクトURLからクリーンなURLを抽出
    if (url.includes('uddg=')) {
      try {
        const parsed = new URL(url, 'https://duckduckgo.com');
        url = decodeURIComponent(parsed.searchParams.get('uddg') || url);
      } catch { /* keep original */ }
    }

    if (title && url && !url.startsWith('/')) {
      results.push({ title, url, snippet });
    }
  });

  return results;
}
