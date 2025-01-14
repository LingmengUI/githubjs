#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 错误处理
set -e

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}部署失败！${NC}"
        echo -e "${RED}请检查错误信息${NC}"
    fi
}

trap cleanup EXIT

echo -e "${BLUE}开始部署 GitHub 文件加速下载服务...${NC}"

# 1. 检查 Node.js 环境
echo -e "${BLUE}检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo "Node.js 未安装，开始安装..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. 检查 PM2
echo -e "${BLUE}检查 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "PM2 未安装，开始安装..."
    sudo npm install -g pm2
fi

# 3. 安装依赖
echo -e "${BLUE}安装项目依赖...${NC}"
npm install

# 4. 构建项目
echo -e "${BLUE}构建项目...${NC}"
# 清理旧的构建文件
rm -rf .next
# 重新构建
npm run build

# 检查构建是否成功
if [ ! -d ".next" ]; then
    echo -e "${RED}构建失败：.next 目录不存在${NC}"
    exit 1
fi

# 5. 检查是否存在旧的进程
echo -e "${BLUE}检查旧进程...${NC}"
pm2 delete githubjs 2>/dev/null

# 6. 检查端口占用
echo -e "${BLUE}检查端口占用...${NC}"
if lsof -i:3999; then
    echo "端口 3999 已被占用，尝试关闭占用进程..."
    fuser -k 3999/tcp
    sleep 2
fi

# 7. 使用 PM2 启动项目
echo -e "${BLUE}启动项目...${NC}"
PORT=3999 NODE_ENV=production pm2 start npm --name "githubjs" -- start

# 8. 保存 PM2 进程列表
echo -e "${BLUE}保存 PM2 进程列表...${NC}"
pm2 save

# 9. 设置开机自启
echo -e "${BLUE}设置开机自启...${NC}"
pm2 startup

echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}服务已启动，可以通过 http://localhost:3999 访问${NC}"
echo -e "${BLUE}常用命令：${NC}"
echo "查看日志: pm2 logs githubjs"
echo "重启服务: pm2 restart githubjs"
echo "停止服务: pm2 stop githubjs"
echo "查看状态: pm2 status"
