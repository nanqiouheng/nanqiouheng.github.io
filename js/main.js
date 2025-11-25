const PROXIES = [
    "https://api.allorigins.win/raw?url=",
    "https://cors-anywhere.herokuapp.com/",
    "https://cors-anywhere.codetabs.com/",
    "https://cloudflare-cors-anywhere.com/"
];
let proxyIndex = 0;
let currentImages = [];

async function search() {
    const kw = document.getElementById("kw").value.trim() || "最新";
    document.getElementById("loading").style.display = "block";
    document.getElementById("error").style.display = "none";
    document.getElementById("grid").innerHTML = "";

    const urls = [
        `https://jmcomic.la/search/photos?search_query=${encodeURIComponent(kw)}`,
        `https://18comic.vip/search/photos?search_query=${encodeURIComponent(kw)}`
    ];

    let success = false;
    for (let url of urls) {
        for (let i = 0; i < PROXIES.length; i++) {
            const proxy = PROXIES[(proxyIndex + i) % PROXIES.length];
            try {
                const response = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(8000) });
                if (!response.ok) throw new Error("Not OK");
                const html = await response.text();
                const items = parse(html);
                if (items.length > 0) {
                    render(items);
                    success = true;
                    proxyIndex = (proxyIndex + i) % PROXIES.length;
                    break;
                }
            } catch (e) { console.warn(`Proxy ${proxy} failed`); }
        }
        if (success) break;
    }

    document.getElementById("loading").style.display = success ? "none" : "none";
    if (!success) document.getElementById("error").style.display = "block";
}

function parse(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = [];
    doc.querySelectorAll("a[href*='album'], a.video-title").forEach(a => {
        const img = a.querySelector("img");
        const title = a.querySelector("h3, .video-title")?.innerText.trim() || "作品";
        let src = img?.getAttribute("data-original") || img?.src || "";
        if (src.startsWith("//")) src = "https:" + src;
        const href = a.href.includes("http") ? a.href : "https://jmcomic.la" + a.href;
        if (src.includes("media")) items.push({ src, title, href });
    });
    return items.slice(0, 48);
}

function render(items) {
    const grid = document.getElementById("grid");
    const frag = document.createDocumentFragment();
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `<img src="${item.src}" loading="lazy"><div class="card-title">${item.title}</div>`;
        div.onclick = () => openReader(item.href);
        frag.appendChild(div);
    });
    grid.appendChild(frag);
}

async function openReader(url) {
    document.getElementById("reader").style.display = "flex";
    const content = document.getElementById("reader-content");
    content.innerHTML = "<div class='loading'>加载图片中…</div>";
    currentImages = [];

    let success = false;
    for (let proxy of PROXIES) {
        try {
            const response = await fetch(proxy + encodeURIComponent(url), { signal: AbortSignal.timeout(10000) });
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, "text/html");
            document.getElementById("reader-title").innerText = doc.querySelector("h1")?.innerText.trim() || "阅读中";

            let imgs = [];
            doc.querySelectorAll("script").forEach(s => {
                if (s.innerHTML.includes("chapterImages")) {
                    const m = s.innerHTML.match(/\[(.*?)\]/s);
                    if (m) imgs = JSON.parse(m[0]);
                }
            });

            if (imgs.length === 0) {
                imgs = [...doc.querySelectorAll("img.lazy, #comic-page img")].map(i => i.src || i.dataset.src || "").filter(Boolean);
            }

            currentImages = imgs.map(u => u.startsWith("http") ? u : "https://jmcomic.la" + u);

            content.innerHTML = "";
            currentImages.forEach((src, i) => {
                const img = document.createElement("img");
                img.src = src;
                img.loading = "lazy";
                img.onclick = () => img.requestFullscreen?.();
                img.onload = () => document.getElementById("progress").style.width = `${(i + 1) / currentImages.length * 100}%`;
                content.appendChild(img);
            });

            success = true;
            break;
        } catch (e) { console.warn("Reader proxy failed"); }
    }

    if (!success) {
        content.innerHTML = `<p style='text-align:center;padding:100px;color:#999'>加载失败，<a href='${url}' target='_blank'>直接访问原站</a></p>`;
    }
}

function closeReader() {
    document.getElementById("reader").style.display = "none";
    document.getElementById("progress").style.width = "0";
}

function downloadAll() {
    if (currentImages.length === 0) return alert("请先打开阅读器");
    const zip = new JSZip();
    const folder = zip.folder("合集");
    currentImages.forEach((url, i) => {
        fetch(url).then(r => r.blob()).then(b => folder.file(`${i + 1}.jpg`, b));
    });
    zip.generateAsync({ type: "blob" }).then(c => saveAs(c, "天堂合集_" + Date.now() + ".zip"));
}

// 事件绑定
document.getElementById("kw").addEventListener("keypress", e => { if (e.key === "Enter") search(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeReader(); });
