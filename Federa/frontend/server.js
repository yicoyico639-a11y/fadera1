const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3001; // 更改端口号以避免冲突
const hostname = 'localhost';

const server = http.createServer((req, res) => {
    let filePath;
    
    // 如果请求根路径，则返回index.html
    if (req.url === '/' || req.url === '') {
        filePath = path.join(__dirname, 'index.html');
    } else {
        // 对于其他请求，构建相对于frontend目录的路径
        filePath = path.join(__dirname, req.url);
    }
    
    // 确保路径在frontend目录内，防止路径遍历攻击
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.resolve(__dirname))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    // 根据文件扩展名设置Content-Type
    const extname = path.extname(normalizedPath);
    let contentType = 'text/html';
    
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpg';
            break;
        case '.gif':
            contentType = 'image/gif';
            break;
        case '.svg':
            contentType = 'image/svg+xml';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
    }
    
    fs.readFile(normalizedPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 文件未找到，返回404
                console.error(`File not found: ${normalizedPath}`);
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                // 其他错误
                console.error(`Server Error: ${error.code}`);
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            // 成功读取文件
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(port, hostname, () => {
    console.log(`Federa前端服务器运行在 http://${hostname}:${port}/`);
    console.log('请确保已启动本地以太坊节点（如Hardhat节点）以便与合约交互');
});