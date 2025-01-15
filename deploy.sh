#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 错误处理
set -e

echo -e "${BLUE}开始部署 GitHub 文件加速下载服务...${NC}"

# 1. 安装依赖
echo -e "${BLUE}安装项目依赖...${NC}"
npm install

# 2. 构建项目
echo -e "${BLUE}构建项目...${NC}"
npm run build

# 3. 检查是否存在旧的进程
echo -e "${BLUE}检查旧进程...${NC}"
pm2 delete githubjs 2>/dev/null || true

# 4. 检查端口占用
echo -e "${BLUE}检查端口占用...${NC}"
if lsof -i:3999; then
    echo "端口 3999 已被占用，尝试关闭占用进程..."
    fuser -k 3999/tcp
    sleep 2
fi

# 5. 使用 PM2 启动项目
echo -e "${BLUE}启动项目...${NC}"
PORT=3999 NODE_ENV=production pm2 start npm --name "githubjs" -- start

# 6. 保存 PM2 进程列表
echo -e "${BLUE}保存 PM2 进程列表...${NC}"
pm2 save

# 7. 配置 Nginx
echo -e "${BLUE}配置 Nginx...${NC}"
sudo ./nginx/setup.sh

echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}服务已启动，可以通过 http://localhost:3999 访问${NC}"
