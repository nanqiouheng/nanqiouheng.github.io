// api/search.js - Vercel/Netlify函数（免费部署）
const cheerio = require('cheerio');
const fetch = require('node-fetch');  // npm i cheerio node-fetch

const SITES = {
    manga: {normal: 'https://www.manhuagui.com', adult: 'https://hentaifox.com'},
    anime: {normal: 'https://aniwatchtv.to', adult: 'https://hanime.tv'},
    movies: {normal: 'https://1337x.to', adult: 'https://thepiratebay.org'}
};

module.exports = async (req, res) => {
    const { type, keyword, adult } = req.query;
    const base = SITES[type][adult ? 'adult' : 'normal'];
    const searchUrl = `${base}/search?q=${encodeURIComponent(keyword)}`;  // 简化URL

    try {
        const response = await fetch(searchUrl);
        const html = await response.text();
        const $ = cheerio.load(html);
        const results = [];

        // 模拟解析（实际根据站点class调整）
        $(`div.result-item`).each((i, el) => {  // 通用selector
            const title = $(el).find('a').text().trim() || `结果 ${i+1}`;
            const preview = $(el).find('img').attr('src') || '';
            const magnet = adult && type === 'movies' ? `magnet:?xt=urn:btih:${Math.random().toString(36).substr(2)}` : '';  // 模拟magnet
            const download = type === 'anime' ? `${base}/stream/${i}` : '';  // 模拟视频URL
            results.push({ title, preview, magnet, download, type });
        });

        // 防ban延时
        await new Promise(resolve => setTimeout(resolve, 2000));

        res.json({ results: results.slice(0, 5) });  // 限5个防滥用
    } catch (error) {
        res.status(500).json({ error: '爬取失败：' + error.message });
    }
};
