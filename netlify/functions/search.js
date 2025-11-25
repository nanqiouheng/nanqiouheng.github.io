const fetch = require('node-fetch');
const cheerio = require('cheerio');

const SITES = {
    manga: {normal: 'https://www.manhuagui.com', adult: 'https://hentaifox.com'},
    anime: {normal: 'https://aniwatchtv.to', adult: 'https://hanime.tv'},
    movies: {normal: 'https://1337x.to', adult: 'https://thepiratebay.org'}
};

exports.handler = async (event) => {
    const { keyword, type, adult } = JSON.parse(event.body);
    const base = SITES[type][adult ? 'adult' : 'normal'];
    const searchUrl = `${base}/search?q=${encodeURIComponent(keyword)}`;

    try {
        const response = await fetch(searchUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        const results = [];

        // 解析结果（根据站点调整 selector）
        $(`div.result-item, .item, .card`).each((i, el) => {
            const title = $(el).find('a, h3').text().trim() || `结果 ${i+1}`;
            const preview = $(el).find('img').attr('src') || '';
            const magnet = adult && type === 'movies' ? `magnet:?xt=urn:btih:${Math.random().toString(36).substr(2, 10)}` : '';
            const download = type === 'anime' ? `${base}/stream/${i+1}` : '';
            if (title) results.push({ title, preview, magnet, download });
        });

        // 延时防 ban
        await new Promise(resolve => setTimeout(resolve, 2000));

        return {
            statusCode: 200,
            body: JSON.stringify({ results: results.slice(0, 5) })  // 限 5 项
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
